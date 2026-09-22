// Utilitários de data no formato brasileiro (DD/MM/AAAA), usados pelo
// histórico de execuções e pelo painel de TV. Todas as comparações são por
// dia civil (sem hora), então cada data é normalizada para meia-noite.

function pad2(n) {
  return String(n).padStart(2, "0");
}

// "21/09/2026" -> Date (meia-noite, horário local) | null se inválida
function parseBRDate(str) {
  if (typeof str !== "string") return null;
  const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null; // datas inválidas tipo 31/02
  }
  return d;
}

// Date -> "21/09/2026"
function formatBRDate(date) {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// Retorna a data (meia-noite) sem componente de hora
function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Segunda a domingo da semana que contém `date`
function getWeekRange(date) {
  const d = stripTime(date);
  const dow = d.getDay(); // 0 = domingo, 1 = segunda, ... 6 = sábado
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

// `date` está entre `start` e `end`, inclusive (comparando só o dia)
function isWithinInclusive(date, start, end) {
  const d = stripTime(date).getTime();
  return d >= stripTime(start).getTime() && d <= stripTime(end).getTime();
}

module.exports = { parseBRDate, formatBRDate, getWeekRange, isWithinInclusive, stripTime };
