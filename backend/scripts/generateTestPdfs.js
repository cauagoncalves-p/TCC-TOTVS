// backend/scripts/generateTestPdfs.js
// Gera PDFs de teste usando pdfkit (produz PDFs robustos, compatíveis com pdf-parse)
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function createPdf(lines) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(lines[0], { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica');
    for (let i = 1; i < lines.length; i++) {
      doc.text(lines[i]);
    }

    doc.end();
  });
}

async function run() {
  const completaLines = [
    'FICHA DE ADMISSAO (DOCUMENTO FICTICIO)',
    '',
    'Nome completo: Carla Mendes Oliveira',
    'CPF: 529.982.247-25',
    'RG: 12.345.678-9',
    'Data de nascimento: 14/05/1996',
    'E-mail: carla.oliveira@exemplo.com',
    'Telefone: (11) 98765-4321',
    'Endereco: Rua das Acacias, 120 - Sao Paulo/SP - CEP 01310-100',
    'Cargo: Analista de Dados',
    'Departamento: Tecnologia',
    'Data de admissao: 17/11/2026',
    'Salario base: R$ 6.500,00'
  ];

  const incompletaLines = [
    'FICHA DE ADMISSAO (DOCUMENTO FICTICIO)',
    '',
    'Nome completo: Diego Ramos',
    'CPF: 111.111.111-11',
    'Data de nascimento: 03/09/1990',
    'Cargo: Desenvolvedor',
    'Data de admissao: 17/11/2026'
  ];

  const bufCompleta = await createPdf(completaLines);
  const bufIncompleta = await createPdf(incompletaLines);

  const testDocsDir = path.resolve(__dirname, '../test_docs');
  const rootDir = path.resolve(__dirname, '../../');

  if (!fs.existsSync(testDocsDir)) fs.mkdirSync(testDocsDir, { recursive: true });

  fs.writeFileSync(path.join(testDocsDir, 'ficha_admissao_completa.pdf'), bufCompleta);
  fs.writeFileSync(path.join(testDocsDir, 'ficha_admissao_incompleta.pdf'), bufIncompleta);
  fs.writeFileSync(path.join(rootDir, 'ficha_admissao_completa.pdf'), bufCompleta);
  fs.writeFileSync(path.join(rootDir, 'ficha_admissao_incompleta.pdf'), bufIncompleta);

  console.log('PDFs gerados com pdfkit!');
  console.log(`  completa:   ${bufCompleta.length} bytes`);
  console.log(`  incompleta: ${bufIncompleta.length} bytes`);

  // Verifica parsing em processo isolado
  const { execFileSync } = require('child_process');
  const workerPath = path.resolve(__dirname, '../src/helpers/parsePdfWorker.js');

  for (const [name, buf] of [['completa', bufCompleta], ['incompleta', bufIncompleta]]) {
    const out = execFileSync(process.execPath, [workerPath], {
      input: buf.toString('base64'),
      maxBuffer: 20 * 1024 * 1024
    });
    const result = JSON.parse(out.toString('utf8'));
    console.log(`\n--- ${name} ---`);
    if (result.ok) {
      console.log(result.text.substring(0, 200));
    } else {
      console.log('ERRO:', result.error);
    }
  }
}

run()
  .then(() => { console.log('\nTudo OK!'); process.exit(0); })
  .catch(err => { console.error('ERRO:', err.message); process.exit(1); });
