// Consolida o histórico de execuções (server/utils/historyStore.js) na
// estrutura que o Painel de Execução TV exibe: status de cada atividade da
// Rotina do Supervisor, por turno, respeitando se ela é Diária ou Semanal.
//
// IMPORTANTE — mantenha esta lista em sincronia manual com o
// `checklistItems` da área "Rotina do Supervisor" em server/public/index.html
// (e nos outros HTMLs) sempre que uma atividade for adicionada, removida ou
// renomeada. Ela existe separada para o painel sempre mostrar a grade
// completa (inclusive atividades sem nenhum envio ainda), e não depender de
// já existir histórico para saber quais atividades existem.
const ROUTINE_CATALOG = [
  { key: "troca_turno", label: "Troca de turno diária", freq: "Diária" },
  { key: "dds", label: "DDS", freq: "Diária" },
  { key: "cot", label: "Realizar COT", freq: "Semanal" },
  { key: "feedback", label: "Feedback 1 colaborador", freq: "Diária" },
  { key: "check_abastecimento", label: "Check das rotinas — abastecimento", freq: "Diária" },
  { key: "check_maquina", label: "Check das rotinas — check-list de máquina", freq: "Diária" },
  { key: "check_silo", label: "Check das rotinas — check-list de limpeza silo", freq: "Diária" },
  { key: "report", label: "REPORT DE PRODUÇÃO", freq: "Diária" },
  { key: "guardiao", label: "Gestão dos Cartões Guardião", freq: "Semanal" },
  { key: "epa", label: "Verificar as ações do EPA", freq: "Semanal" },
];

const TURNOS = ["A", "B", "C"];

const { parseBRDate, formatBRDate, getWeekRange, isWithinInclusive } = require("./dateUtils");

// Para uma atividade+turno, olha os registros do período relevante (o dia
// de referência para Diária, semana do dia de referência — segunda a
// domingo — para Semanal) e decide o status:
//  - "done"     (🟢 realizado)      — marcada como Realizado em algum envio do período
//  - "not_done" (🔴 não realizado)  — só foi marcada como Não realizado no período (sem nenhum "realizado")
//  - "pending"  (🟡 pendente)       — ainda não foi marcada nenhuma vez no período
function statusForItem(records, catalogItem, { refDateStr, weekStart, weekEnd }) {
  const relevant = records.filter((r) => {
    if (catalogItem.freq === "Semanal") {
      const d = parseBRDate(r.data);
      return d && isWithinInclusive(d, weekStart, weekEnd);
    }
    return r.data === refDateStr;
  });

  let sawDone = false;
  let sawAnswered = false;
  for (const r of relevant) {
    const entry = (r.routine || []).find((it) => it.key === catalogItem.key);
    if (!entry) continue;
    if (entry.done) sawDone = true;
    if (entry.answered) sawAnswered = true;
  }

  if (sawDone) return "done";
  if (sawAnswered) return "not_done";
  return "pending";
}

// `now` é o dia de referência do painel: por padrão o momento atual (painel
// mostrando "hoje"), mas pode ser qualquer data para ver como ficou aquele
// dia específico (filtro de data do painel).
function computeDashboard(records, { now = new Date() } = {}) {
  const refDateStr = formatBRDate(now);
  const { start: weekStart, end: weekEnd } = getWeekRange(now);
  const ctx = { refDateStr, weekStart, weekEnd };

  const turnos = {};
  for (const turno of TURNOS) {
    const turnoRecords = records.filter((r) => r.supervisor && r.supervisor.turno === turno);
    const items = ROUTINE_CATALOG.map((cat) => ({
      key: cat.key,
      label: cat.label,
      freq: cat.freq,
      status: statusForItem(turnoRecords, cat, ctx),
    }));
    const doneCount = items.filter((i) => i.status === "done").length;
    const percent = items.length ? Math.round((doneCount / items.length) * 100) : 100;
    // Último envio deste turno no dia de referência (qualquer atividade),
    // para mostrar "última atividade às HH:MM" e alimentar o detalhe do
    // checklist quando o supervisor clica no turno.
    const dayRecords = turnoRecords.filter((r) => r.data === refDateStr);
    const lastRecord = dayRecords
      .slice()
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];

    // Produção total do turno no dia de referência: soma da produção por
    // máquina do envio mais recente daquele dia (um checklist por turno
    // normalmente cobre o turno inteiro — não soma vários envios do mesmo
    // dia para não contar duas vezes a mesma produção em caso de
    // reenvio/correção).
    const productionList = (lastRecord && lastRecord.production) || [];
    const productionTotal = productionList.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
    const productionUnit = productionList.length ? productionList[0].unit || "" : "";

    // Observações da troca de turno: texto livre (MINHA ROTINA DO TURNO) do
    // envio mais recente do dia de referência deste turno — mesma regra do
    // "último envio vale", para não empilhar textos de reenvios/correções.
    const notes = lastRecord && lastRecord.notes ? lastRecord.notes : "";

    turnos[turno] = {
      items,
      percent,
      doneCount,
      total: items.length,
      lastSupervisor: lastRecord ? lastRecord.supervisor.nome : null,
      lastSubmittedAt: lastRecord ? lastRecord.submittedAt : null,
      lastHora: lastRecord ? lastRecord.hora : null,
      lastChecklistId: lastRecord ? lastRecord.checklistId : null,
      production: {
        total: dayRecords.length ? productionTotal : null,
        unit: productionUnit,
        machines: productionList,
      },
      notes: {
        text: notes,
        supervisor: lastRecord ? lastRecord.supervisor.nome : null,
        submittedAt: lastRecord ? lastRecord.submittedAt : null,
      },
      hasSubmission: dayRecords.length > 0,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    date: refDateStr,
    isToday: refDateStr === formatBRDate(new Date()),
    week: { start: formatBRDate(weekStart), end: formatBRDate(weekEnd) },
    turnos,
  };
}

module.exports = { computeDashboard, ROUTINE_CATALOG, TURNOS };
