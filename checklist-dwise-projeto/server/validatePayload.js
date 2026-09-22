// Validação mínima do payload recebido em POST /api/checklist/submit — só
// verifica os campos indispensáveis para gerar o e-mail/PDF e para o
// histórico do painel. As fotos obrigatórias por item já são conferidas no
// próprio app (o botão ENVIAR só habilita quando tudo está preenchido), então
// aqui é só uma segunda barreira contra requisições incompletas ou malformadas.

const TURNOS_VALIDOS = ["A", "B", "C"];

function validatePayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return ["Corpo da requisição inválido."];
  }

  if (!payload.checklistId || typeof payload.checklistId !== "string") {
    errors.push("checklistId é obrigatório.");
  }

  if (!payload.supervisor || typeof payload.supervisor !== "object") {
    errors.push("Dados do supervisor são obrigatórios.");
  } else {
    if (!payload.supervisor.nome || String(payload.supervisor.nome).trim().length < 2) {
      errors.push("Nome do supervisor é obrigatório.");
    }
    if (!TURNOS_VALIDOS.includes(payload.supervisor.turno)) {
      errors.push("Turno inválido (deve ser A, B ou C).");
    }
  }

  if (!payload.data || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(payload.data)) {
    errors.push("Data inválida (formato esperado DD/MM/AAAA).");
  }

  if (!payload.hora || typeof payload.hora !== "string") {
    errors.push("Hora é obrigatória.");
  }

  if (!Array.isArray(payload.areas) || !payload.areas.length) {
    errors.push("Nenhuma área de checklist recebida.");
  }

  return errors;
}

module.exports = { validatePayload };
