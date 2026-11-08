const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function debug() {
  const file1 = path.resolve(__dirname, 'test_docs/ficha_admissao_incompleta.pdf');
  const file2 = path.resolve(__dirname, '../test_docs/ficha_admissao_incompleta.pdf');
  const file3 = 'backend/test_docs/ficha_admissao_incompleta.pdf';

  console.log('file1:', file1, fs.existsSync(file1) ? fs.statSync(file1).size : 'no');
  console.log('file2:', file2, fs.existsSync(file2) ? fs.statSync(file2).size : 'no');
  console.log('file3:', file3, fs.existsSync(file3) ? fs.statSync(file3).size : 'no');

  const b1 = fs.readFileSync(file1);
  console.log('Primeiros 30 bytes:', b1.slice(0, 30).toString('utf8'));
  console.log('Últimos 50 bytes:', b1.slice(-50).toString('utf8'));

  try {
    const r = await pdfParse(b1);
    console.log('OK! Texto:', r.text);
  } catch (e) {
    console.error('Falhou:', e);
  }
}

debug();
