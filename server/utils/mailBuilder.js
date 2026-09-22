// Monta o e-mail (assunto + HTML) enviado ao gerente a cada checklist
// concluído. As fotos em si vão no PDF anexado (ver pdfBuilder.js) — aqui é
// só um resumo em texto para leitura rápida no corpo do e-mail.

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function summarizeArea(area) {
  if (area.kind === "machines") {
    const rows = (area.machines || [])
      .map((m) => {
        const prod = m.production && m.production.value != null
          ? ` — ${m.production.value} ${m.production.unit || ""}`.trim()
          : "";
        return `<li>${escapeHtml(m.machine)}: ${m.photos.length} foto(s)${prod}</li>`;
      })
      .join("");
    return `<h3>${escapeHtml(area.title)}</h3><ul>${rows}</ul>`;
  }
  if (area.kind === "items") {
    return `<h3>${escapeHtml(area.title)}</h3><p>${(area.photos || []).length} foto(s) enviada(s).</p>`;
  }
  if (area.kind === "text") {
    const rows = (area.checklist || [])
      .map((item) => {
        const icon = item.done ? "✅" : item.answered ? "❌" : "⬜";
        return `<li>${icon} ${escapeHtml(item.label)}</li>`;
      })
      .join("");
    const texto = area.texto
      ? `<p><strong>Observações:</strong> ${escapeHtml(area.texto).replace(/\n/g, "<br/>")}</p>`
      : "";
    const anexos = (area.anexos || []).length
      ? `<p>${area.anexos.length} anexo(s) adicional(is).</p>`
      : "";
    return `<h3>${escapeHtml(area.title)}</h3><ul>${rows}</ul>${texto}${anexos}`;
  }
  return `<h3>${escapeHtml(area.title)}</h3>`;
}

function buildSummaryEmail(payload) {
  const subject = `Checklist Digital D WISE — Turno ${payload.supervisor.turno} — ${payload.data} — ${payload.supervisor.nome}`;

  const areasHtml = (payload.areas || []).map(summarizeArea).join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#12172b;">
      <h1 style="font-size:20px;">Checklist Digital D WISE</h1>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:4px 0;color:#555;">Supervisor</td><td style="padding:4px 0;font-weight:bold;text-align:right;">${escapeHtml(payload.supervisor.nome)}</td></tr>
        <tr><td style="padding:4px 0;color:#555;">Turno</td><td style="padding:4px 0;font-weight:bold;text-align:right;">${escapeHtml(payload.supervisor.turno)}</td></tr>
        <tr><td style="padding:4px 0;color:#555;">Data</td><td style="padding:4px 0;font-weight:bold;text-align:right;">${escapeHtml(payload.data)} ${escapeHtml(payload.hora || "")}</td></tr>
        <tr><td style="padding:4px 0;color:#555;">Nº do Checklist</td><td style="padding:4px 0;font-weight:bold;text-align:right;">${escapeHtml(payload.checklistId)}</td></tr>
      </table>
      ${areasHtml}
      <p style="color:#888;font-size:12px;margin-top:24px;">As fotos completas estão no PDF em anexo.</p>
    </div>
  `;

  return { html, subject };
}

module.exports = { buildSummaryEmail };
