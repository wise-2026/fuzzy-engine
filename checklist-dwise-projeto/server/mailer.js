// Envio do e-mail via SMTP (nodemailer). As credenciais vêm de variáveis de
// ambiente configuradas no Render (Environment do serviço) — nunca ficam no
// código. Se as variáveis não estiverem configuradas, o envio falha com uma
// mensagem clara e o app cai no fluxo manual (baixar relatório + mailto).

const nodemailer = require("nodemailer");

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP não configurado. Defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS nas variáveis de ambiente do serviço."
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
}

async function sendChecklistEmail({ to, subject, html, attachments }) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    attachments,
  });
}

module.exports = { sendChecklistEmail };
