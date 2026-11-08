const fs = require('fs');
const path = require('path');

async function test() {
  // Clear any cached pdfjs state
  Object.keys(require.cache)
    .filter(k => k.includes('pdf-parse') || k.includes('pdfjs-dist'))
    .forEach(k => delete require.cache[k]);

  const pdfParse = require('pdf-parse');

  const files = [
    path.resolve(__dirname, '../test_docs/ficha_admissao_completa.pdf'),
    path.resolve(__dirname, '../test_docs/ficha_admissao_incompleta.pdf'),
    path.resolve(__dirname, '../../ficha_admissao_completa.pdf'),
    path.resolve(__dirname, '../../ficha_admissao_incompleta.pdf'),
  ];

  for (const f of files) {
    console.log(`\n=== ${path.basename(f)} (${f}) ===`);
    if (!fs.existsSync(f)) { console.log('NOT FOUND'); continue; }
    const buf = fs.readFileSync(f);
    console.log('Size:', buf.length, 'bytes');
    console.log('Signature:', buf.toString('latin1', 0, 5));

    // dump raw content for debug
    const raw = buf.toString('latin1');
    const streamMatch = raw.match(/stream\n([\s\S]*?)endstream/);
    if (streamMatch) {
      console.log('Stream content preview:', streamMatch[1].substring(0, 200));
    }

    try {
      // Clear cache before each parse
      Object.keys(require.cache)
        .filter(k => k.includes('pdf-parse') || k.includes('pdfjs-dist'))
        .forEach(k => delete require.cache[k]);
      const freshPdfParse = require('pdf-parse');

      const data = await freshPdfParse(buf);
      console.log('TEXT:', data.text.substring(0, 200));
    } catch (err) {
      console.log('PARSE ERROR:', err.message);
    }
  }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
