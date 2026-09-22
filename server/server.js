require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

const { getManagerEmail } = require("./config/settings");
const { buildSummaryEmail } = require("./utils/mailBuilder");
const { buildPdfBuffer } = require("./utils/pdfBuilder");
const { sendChecklistEmail } = require("./mailer");
const { validatePayload } = require("./validatePayload");
const historyStore = require("./utils/historyStore");
const { computeDashboard } = require("./utils/dashboard");
const { buildProductionReport } = require("./utils/productionReport");
const { parseBRDate, formatBRDate } = require("./utils/dateUtils");

const app = express();
const PORT = process.env.PORT || 4000;

// Corpo pode conter várias fotos em base64 -> precisa de um limite generoso.
app.use(express.json({ limit: "60mb" }));

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin === "*" ? true : corsOrigin.split(",").map((s) => s.trim()) }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, managerEmailConfigured: !!getManagerEmail() });
});

// Extrai só o resultado das atividades da Rotina do Supervisor (kind
// "text") do payload — é só isso que o histórico/painel precisa guardar.
function extractRoutine(payload) {
  const area = (payload.areas || []).find((a) => a.kind === "text");
  if (!area || !Array.isArray(area.checklist)) return [];
  return area.checklist.map((item) => ({
    key: item.key || null,
    label: item.label,
    freq: item.freq,
    done: !!item.done,
    answered: !!item.answered,
  }));
}

// Extrai o texto livre da Rotina do Supervisor ("MINHA ROTINA DO TURNO") —
// usado no painel de TV para mostrar as observações da troca de turno.
// Não inclui anexos (só o texto).
function extractNotes(payload) {
  const area = (payload.areas || []).find((a) => a.kind === "text");
  if (!area || typeof area.texto !== "string") return "";
  return area.texto.trim();
}

// Extrai a quantidade produzida por máquina da área MÁQUINAS (kind
// "machines") — só o número de cada máquina, nunca as fotos.
function extractProduction(payload) {
  const area = (payload.areas || []).find((a) => a.id === "maquinas" && a.kind === "machines");
  if (!area || !Array.isArray(area.machines)) return [];
  return area.machines
    .filter((m) => m.production && m.production.value != null)
    .map((m) => ({ machine: m.machine, value: m.production.value, unit: m.production.unit || "" }));
}

app.post("/api/checklist/submit", async (req, res) => {
  const payload = req.body;
  const errors = validatePayload(payload);
  if (errors.length) {
    return res.status(400).json({ error: errors.join(" ") });
  }

  // Salva o histórico da rotina PRIMEIRO, antes de tentar enviar o e-mail.
  // Isso é o que faz o checklist aparecer na hora para todo mundo no Painel
  // de Execução TV e no Relatório de Produção — e é o que realmente importa
  // para o supervisor saber que "deu certo". O e-mail automático é um bônus
  // à parte: se ele falhar (SMTP fora do ar, não configurado, etc.), isso
  // NÃO pode fazer o app dizer para o supervisor que o envio falhou, porque
  // o checklist já está salvo e já está visível para os outros.
  let historySaved = true;
  try {
    historyStore.appendExecution({
      checklistId: payload.checklistId,
      supervisor: { nome: payload.supervisor.nome, turno: payload.supervisor.turno },
      data: payload.data,
      hora: payload.hora,
      submittedAt: new Date().toISOString(),
      routine: extractRoutine(payload),
      production: extractProduction(payload),
      notes: extractNotes(payload),
    });
  } catch (err) {
    console.error("Falha ao salvar histórico para o painel:", err);
    historySaved = false;
  }

  if (!historySaved) {
    // Este é o único caso que deve aparecer como falha real para o
    // supervisor: o checklist NÃO ficou salvo, então também não vai
    // aparecer no painel nem no relatório. Vale a pena tentar de novo.
    return res.status(500).json({
      error: "Não foi possível salvar o checklist. Tente enviar novamente.",
      historySaved: false,
    });
  }

  // A partir daqui o checklist já está salvo — já apareceu no painel e no
  // relatório. Tudo abaixo é só sobre o e-mail automático, que é opcional.
  const managerEmail = getManagerEmail();
  if (!managerEmail) {
    return res.json({
      ok: true,
      checklistId: payload.checklistId,
      historySaved: true,
      emailSent: false,
      emailError: "E-mail do gerente não configurado.",
    });
  }

  try {
    const { html, subject } = buildSummaryEmail(payload);
    const pdfBuffer = await buildPdfBuffer(payload);
    const attachments = [
      {
        filename: `checklist-dwise-${payload.checklistId}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ];
    await sendChecklistEmail({ to: managerEmail, subject, html, attachments });
    res.json({ ok: true, checklistId: payload.checklistId, historySaved: true, emailSent: true });
  } catch (err) {
    console.error("Falha ao enviar e-mail do checklist (checklist já está salvo):", err);
    res.json({
      ok: true,
      checklistId: payload.checklistId,
      historySaved: true,
      emailSent: false,
      emailError: err.message || "Falha ao enviar o checklist por e-mail.",
    });
  }
});

// Dados consolidados para o Painel de Execução TV: status de cada atividade
// da Rotina do Supervisor por turno (A/B/C), já respeitando se ela é Diária
// (janela = dia selecionado) ou Semanal (janela = semana do dia selecionado,
// segunda a domingo), mais a última observação de texto livre (MINHA ROTINA
// DO TURNO) de cada turno no dia selecionado — usada na seção "Observações
// da Troca de Turno" — e o detalhe completo do último envio de cada turno
// (para o clique "ver detalhe do checklist"). Aceita ?data=DD/MM/AAAA para
// ver outro dia; sem o parâmetro, usa hoje. Não expõe fotos nem anexos — só
// o resultado Realizado/Não realizado de cada atividade, produção, texto da
// observação e metadados do envio.
app.get("/api/painel/dados", (req, res) => {
  try {
    const records = historyStore.readAll();
    let refDate = new Date();
    if (req.query.data) {
      const parsed = parseBRDate(String(req.query.data));
      if (!parsed) {
        return res.status(400).json({ error: "Parâmetro 'data' inválido. Use o formato DD/MM/AAAA." });
      }
      refDate = parsed;
    }
    res.json(computeDashboard(records, { now: refDate }));
  } catch (err) {
    console.error("Falha ao montar dados do painel:", err);
    res.status(500).json({ error: "Falha ao montar dados do painel." });
  }
});

// Lista as datas (DD/MM/AAAA) que têm pelo menos um checklist enviado,
// mais recente primeiro — usada para preencher o seletor de data do painel.
app.get("/api/painel/dias", (req, res) => {
  try {
    const records = historyStore.readAll();
    const set = new Set(records.map((r) => r.data).filter(Boolean));
    const dates = Array.from(set).sort((a, b) => {
      const da = parseBRDate(a);
      const db = parseBRDate(b);
      if (!da || !db) return 0;
      return db - da;
    });
    if (!dates.includes(formatBRDate(new Date()))) {
      dates.unshift(formatBRDate(new Date()));
    }
    res.json({ dates });
  } catch (err) {
    console.error("Falha ao montar lista de dias do painel:", err);
    res.status(500).json({ error: "Falha ao montar lista de dias do painel." });
  }
});

// Painel de TV — página separada, só leitura, sem interferir na rotina do
// supervisor. Aceita tanto /painel quanto /painel.html.
app.get(["/painel", "/painel.html"], (req, res) => {
  const panelFile = path.join(__dirname, "public", "painel.html");
  if (!fs.existsSync(panelFile)) return res.status(404).send("Painel não encontrado.");
  res.sendFile(panelFile);
});

// Relatório de produção por período: total de material extrusado de cada
// máquina (e por turno) somado dentro de um intervalo de datas — ex.:
// ?inicio=01/09/2026&fim=30/09/2026 para o total do mês. Usa todo o
// histórico salvo (server/data/executions.json), então cobre qualquer
// período desde que o histórico exista (ver observação sobre disco
// persistente no Render, no guia de publicação).
app.get("/api/producao/relatorio", (req, res) => {
  try {
    const inicio = String(req.query.inicio || "");
    const fim = String(req.query.fim || "");
    if (!inicio || !fim) {
      return res.status(400).json({ error: "Informe 'inicio' e 'fim' no formato DD/MM/AAAA." });
    }
    const records = historyStore.readAll();
    const report = buildProductionReport(records, { inicio, fim });
    res.json(report);
  } catch (err) {
    console.error("Falha ao montar relatório de produção:", err);
    res.status(400).json({ error: err.message || "Falha ao montar relatório de produção." });
  }
});

// Relatório de produção — página separada, com seletor de período (De / Até).
app.get(["/relatorio", "/relatorio.html"], (req, res) => {
  const reportFile = path.join(__dirname, "public", "relatorio.html");
  if (!fs.existsSync(reportFile)) return res.status(404).send("Relatório não encontrado.");
  res.sendFile(reportFile);
});

// Serve o app junto com a API neste mesmo serviço/URL — assim o link que
// você compartilha com os supervisores já é o app completo, sem CORS e sem
// precisar configurar endereço de servidor separado.
// Prioridade: server/public (o app de arquivo único) e, se não existir,
// client/dist (o app React, caso você tenha optado por aquela versão).
const publicDir = path.join(__dirname, "public");
const clientDist = path.join(__dirname, "..", "client", "dist");
const staticDir = fs.existsSync(path.join(publicDir, "index.html"))
  ? publicDir
  : fs.existsSync(path.join(clientDist, "index.html"))
    ? clientDist
    : null;

if (staticDir) {
  app.use(express.static(staticDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Checklist Digital D WISE — servidor rodando na porta ${PORT}`);
  const managerEmail = getManagerEmail();
  console.log(
    managerEmail
      ? `E-mail do gerente configurado: ${managerEmail}`
      : "⚠ E-mail do gerente NÃO configurado (edite server/config/settings.json)."
  );
});
