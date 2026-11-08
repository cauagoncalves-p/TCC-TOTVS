const fs = require('fs');
const pdfParse = require('pdf-parse');

async function test() {
  const buf = fs.readFileSync('backend/test_docs/ficha_admissao_incompleta.pdf');
  console.log('Tamanho:', buf.length);
  try {
    const res = await pdfParse(buf);
    console.log('OK! Texto:', res.text);
  } catch (err) {
    console.error('Erro:', err.message, err.details);
  }
}

test();
