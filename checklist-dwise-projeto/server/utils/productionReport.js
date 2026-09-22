// Relatório de produção por período: soma a "QUANTIDADE PRODUZIDA (KG)" de
// cada máquina (área MÁQUINAS do checklist) dentro de um intervalo de datas,
// já separado por turno e com o total geral do período — o mesmo número que
// hoje é somado manualmente na ficha de produção em papel/planilha.
//
// Regra de deduplicação: se um turno reenviar o checklist do mesmo dia (para
// corrigir algo), só o envio mais recente daquele dia conta — senão a
// produção do dia entraria duas vezes na soma do período.

const { parseBRDate, isWithinInclusive } = require("./dateUtils");

function lastSubmissionPerDayAndTurno(records) {
  const byKey = new Map();
  for (const r of records) {
    if (!r.supervisor || !r.supervisor.turno || !r.data) continue;
    const key = `${r.data}|${r.supervisor.turno}`;
    const prev = byKey.get(key);
    if (!prev || new Date(r.submittedAt) > new Date(prev.submittedAt)) {
      byKey.set(key, r);
    }
  }
  return Array.from(byKey.values());
}

function buildProductionReport(records, { inicio, fim }) {
  const inicioDate = parseBRDate(inicio);
  const fimDate = parseBRDate(fim);
  if (!inicioDate || !fimDate) {
    throw new Error("Datas inválidas. Use o formato DD/MM/AAAA.");
  }

  const dedupedRecords = lastSubmissionPerDayAndTurno(records).filter((r) => {
    const d = parseBRDate(r.data);
    return d && isWithinInclusive(d, inicioDate, fimDate);
  });

  const machineMap = new Map(); // machine -> { total, unit, byTurno: {A,B,C} }
  const turnoTotals = { A: 0, B: 0, C: 0 };
  let grandTotal = 0;
  let unit = "";
  const diasComEnvioSet = new Set();

  for (const record of dedupedRecords) {
    const turno = record.supervisor.turno;
    diasComEnvioSet.add(`${record.data}|${turno}`);
    for (const p of record.production || []) {
      const value = Number(p.value) || 0;
      if (!unit && p.unit) unit = p.unit;

      if (!machineMap.has(p.machine)) {
        machineMap.set(p.machine, { machine: p.machine, total: 0, unit: p.unit || unit, byTurno: { A: 0, B: 0, C: 0 } });
      }
      const entry = machineMap.get(p.machine);
      entry.total += value;
      entry.byTurno[turno] = (entry.byTurno[turno] || 0) + value;

      turnoTotals[turno] = (turnoTotals[turno] || 0) + value;
      grandTotal += value;
    }
  }

  const machines = Array.from(machineMap.values()).sort((a, b) => b.total - a.total);

  return {
    inicio,
    fim,
    unit,
    grandTotal,
    turnoTotals,
    machines,
    diasComEnvio: diasComEnvioSet.size,
  };
}

module.exports = { buildProductionReport };
