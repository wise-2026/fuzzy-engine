// E-mail do gerente que recebe o resumo de cada checklist enviado.
// Prioridade: variável de ambiente MANAGER_EMAIL (recomendado no Render,
// via Environment do serviço) e, se não existir, o arquivo settings.json
// (útil para rodar local sem mexer em variáveis de ambiente).

const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = path.join(__dirname, "settings.json");

function readSettingsFile() {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function getManagerEmail() {
  if (process.env.MANAGER_EMAIL && process.env.MANAGER_EMAIL.trim()) {
    return process.env.MANAGER_EMAIL.trim();
  }
  const settings = readSettingsFile();
  return (settings.managerEmail || "").trim() || null;
}

module.exports = { getManagerEmail };
