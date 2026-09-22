// Gera o PDF anexado ao e-mail do checklist: um resumo com todas as fotos
// enviadas pelo supervisor, organizadas por área. Usa pdfkit (não precisa de
// navegador/Chromium, o que facilita rodar num serviço pequeno no Render).

const PDFDocument = require("pdfkit");

const PAGE_MARGIN = 40;

function dataUrlToBuffer(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  try {
    return Buffer.from(match[2], "base64");
  } catch (err) {
    return null;
  }
}

function isEmbeddableImage(mimeType) {
  return mimeType === "image/jpeg" || mimeType === "image/jpg" || mimeType === "image/png";
}

function addHeading(doc, text) {
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor("#12172b").font("Helvetica-Bold").text(text);
  doc.moveDown(0.3);
}

function addPhoto(doc, label, fileName, mimeType, dataUrl) {
  const buffer = isEmbeddableImage(mimeType) ? dataUrlToBuffer(dataUrl) : null;

  if (doc.y > doc.page.height - 220) doc.addPage();

  doc.fontSize(10).fillColor("#444").font("Helvetica-Bold").text(label);

  if (buffer) {
    try {
      doc.image(buffer, { fit: [240, 180] });
    } catch (err) {
      doc.fontSize(9).fillColor("#b00").font("Helvetica").text(`(não foi possível exibir a imagem: ${fileName || "arquivo"})`);
    }
  } else {
    doc.fontSize(9).fillColor("#666").font("Helvetica").text(`📄 Anexo: ${fileName || "arquivo"} (não é imagem — confira no dispositivo original).`);
  }
  doc.moveDown(0.6);
}

function buildPdfBuffer(payload) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4" });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(18).fillColor("#12172b").font("Helvetica-Bold").text("Checklist Digital D WISE");
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#555").font("Helvetica");
      doc.text(`Supervisor: ${payload.supervisor.nome}`);
      doc.text(`Turno: ${payload.supervisor.turno}`);
      doc.text(`Data: ${payload.data}  Hora: ${payload.hora || ""}`);
      doc.text(`Número do Checklist: ${payload.checklistId}`);
      doc.moveDown(0.5);

      for (const area of payload.areas || []) {
        addHeading(doc, area.title || area.id);

        if (area.kind === "machines") {
          for (const machine of area.machines || []) {
            doc.fontSize(11).fillColor("#12172b").font("Helvetica-Bold").text(machine.machine);
            if (machine.production && machine.production.value != null) {
              doc.fontSize(10).fillColor("#333").font("Helvetica")
                .text(`${machine.production.label || "Produção"}: ${machine.production.value} ${machine.production.unit || ""}`.trim());
            }
            doc.moveDown(0.3);
            for (const photo of machine.photos || []) {
              addPhoto(doc, photo.label, photo.fileName, photo.mimeType, photo.dataUrl);
            }
          }
        } else if (area.kind === "items") {
          for (const photo of area.photos || []) {
            addPhoto(doc, photo.label, photo.fileName, photo.mimeType, photo.dataUrl);
          }
        } else if (area.kind === "text") {
          doc.fontSize(10).fillColor("#333").font("Helvetica");
          for (const item of area.checklist || []) {
            const icon = item.done ? "[X]" : item.answered ? "[NÃO]" : "[ ]";
            doc.text(`${icon} ${item.label}`);
          }
          if (area.texto) {
            doc.moveDown(0.3);
            doc.font("Helvetica-Bold").text("Observações:");
            doc.font("Helvetica").text(area.texto);
          }
          for (const anexo of area.anexos || []) {
            addPhoto(doc, "Anexo", anexo.fileName, anexo.mimeType, anexo.dataUrl);
          }
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildPdfBuffer };
