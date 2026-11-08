// backend/src/helpers/parsePdfWorker.mjs
// Executado como processo filho para isolar o parsing de PDF.
// Recebe o PDF via stdin (base64) e devolve o texto via stdout.
// Usa pdfjs-dist moderno (ESM).

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk);
}

try {
  const buf = Buffer.from(Buffer.concat(chunks).toString('utf8'), 'base64');
  const uint8 = new Uint8Array(buf);

  const doc = await getDocument({ data: uint8, useSystemFonts: true }).promise;
  const textParts = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    textParts.push(pageText);
  }

  const text = textParts.join('\n').trim();
  process.stdout.write(JSON.stringify({ ok: true, text }));
} catch (err) {
  process.stdout.write(JSON.stringify({ ok: false, error: err.message }));
}
