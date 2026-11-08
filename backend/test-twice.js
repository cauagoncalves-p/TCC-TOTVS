const fs = require('fs');
const pdfParse = require('pdf-parse');

async function testTwice() {
  const b1 = fs.readFileSync('backend/knowledge/rh-faq.pdf');
  const b2 = fs.readFileSync('backend/test_docs/ficha_admissao_incompleta.pdf');

  console.log('1. Lendo rh-faq.pdf...');
  const res1 = await pdfParse(b1);
  console.log('OK 1! Caracteres:', res1.text.length);

  console.log('2. Lendo ficha_admissao_incompleta.pdf...');
  try {
    const res2 = await pdfParse(b2);
    console.log('OK 2! Texto:', res2.text.substring(0, 50));
  } catch (err) {
    console.error('Erro no 2º:', err.message);
  }
}

testTwice();
