// Armazenamento simples do histórico de execuções (um checklist enviado por
// supervisor/turno/dia), guardado como JSON em disco. É deliberadamente leve
// — sem banco de dados — porque o volume é baixo (poucos checklists por dia)
// e o painel de TV só precisa ler esses registros para montar a grade de
// status. Se o serviço no Render usar disco efêmero, o histórico pode ser
// perdido em um redeploy; para persistência garantida, trocar por um disco
// persistente do Render ou por um banco de dados.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "executions.json");

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Falha ao ler histórico do painel:", err);
    return [];
  }
}

function appendExecution(record) {
  ensureFile();
  const all = readAll();
  all.push(record);
  fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2), "utf8");
}

module.exports = { readAll, appendExecution };
