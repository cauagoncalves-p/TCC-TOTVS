// backend/scripts/generateTestPdfs.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function createPdf(filename, contentFn) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filePath = path.resolve(__dirname, '../../', filename);
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);
    contentFn(doc);
    doc.end();

    writeStream.on('finish', () => {
      console.log(`Gerado: ${filename}`);
      resolve(filePath);
    });
    writeStream.on('error', reject);
  });
}

async function main() {
  // 1. Currículo Profissional
  await createPdf('curriculo_teste.pdf', (doc) => {
    doc.fontSize(20).font('Helvetica-Bold').text('LUCAS SILVA SANTOS', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('São Paulo - SP | (11) 98765-4321 | lucas.silva@exemplo.com | linkedin.com/in/lucassilva', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(14).font('Helvetica-Bold').text('RESUMO PROFISSIONAL');
    doc.fontSize(10).font('Helvetica').text('Desenvolvedor de Software com mais de 4 anos de experiência em aplicações web, arquitetura de microsserviços e bancos de dados relacionais.');
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('EXPERIÊNCIA PROFISSIONAL');
    doc.fontSize(11).font('Helvetica-Bold').text('Tech Soluções - Desenvolvedor Full Stack');
    doc.fontSize(9).font('Helvetica-Oblique').text('Maio/2023 - Atual');
    doc.fontSize(10).font('Helvetica').text('• Desenvolvimento de APIs REST escaláveis em Node.js e TypeScript.');
    doc.text('• Criação de interfaces responsivas utilizando React e Tailwind CSS.');
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica-Bold').text('Inovação Web - Desenvolvedor Júnior');
    doc.fontSize(9).font('Helvetica-Oblique').text('Janeiro/2021 - Abril/2023');
    doc.fontSize(10).font('Helvetica').text('• Manutenção de sistemas legados e desenvolvimento de novas funcionalidades.');
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('FORMAÇÃO ACADÊMICA');
    doc.fontSize(11).font('Helvetica-Bold').text('Universidade Paulista (UNIP)');
    doc.fontSize(10).font('Helvetica').text('Bacharelado em Ciência da Computação (Graduação) - Conclusão em 2022');
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('HABILIDADES & COMPETÊNCIAS');
    doc.fontSize(10).font('Helvetica').text('JavaScript, TypeScript, Node.js, React, SQL Server, Docker, Git.');
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('IDIOMAS');
    doc.fontSize(10).font('Helvetica').text('Inglês: Avançado | Espanhol: Básico');
  });

  // 2. Documento desconhecido / outro (ex: Declaração de Matrícula)
  await createPdf('documento_outro_teste.pdf', (doc) => {
    doc.fontSize(16).font('Helvetica-Bold').text('DECLARAÇÃO DE MATRÍCULA ESCOLAR', { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(11).font('Helvetica').text('Declaramos para os devidos fins que o aluno Gabriel Henrique Ramos, RG 45.678.901-2, está regularmente matriculado no 2º ano do Ensino Médio no período matutino, com frequência regular no ano letivo de 2026.');
    doc.moveDown(1);
    doc.text('Instituição: Colégio Estadual Central de São Paulo');
    doc.text('Código INEP: 35012345');
    doc.text('Ano Letivo: 2026');
    doc.text('Data de Emissão: 15/02/2026');
  });

  console.log('PDFs de teste gerados com sucesso!');
}

main().catch(console.error);
