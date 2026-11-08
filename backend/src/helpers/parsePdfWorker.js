// backend/src/helpers/parsePdfWorker.js
// Executado como processo filho para isolar o parsing de PDF.
// Recebe o PDF via stdin (base64) e devolve o texto via stdout.
// Usa pdfjs-dist moderno em vez do pdf-parse (que usa uma versão velha e bugada).

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const buf = Buffer.from(Buffer.concat(chunks).toString('utf8'), 'base64');
  const uint8 = new Uint8Array(buf);

  // Importa pdfjs-dist moderno (ESM-compatible via dynamic import ou require legacy build)
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

  const doc = await pdfjsLib.getDocument({ data: uint8, useSystemFonts: true }).promise;
  const textParts = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    textParts.push(pageText);
  }

  const text = textParts.join('\n').trim();
  process.stdout.write(JSON.stringify({ ok: true, text }));
}

main().catch(err => {
  process.stdout.write(JSON.stringify({ ok: false, error: err.message }));
});
