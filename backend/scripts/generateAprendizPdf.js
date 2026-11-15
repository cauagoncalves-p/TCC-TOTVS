// backend/scripts/generateAprendizPdf.js
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outPath = path.resolve(__dirname, '../knowledge/politica_aprendizes_eventos_externos.pdf');

const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream(outPath));

doc.fontSize(18).text('POLÍTICA INTERNA DE APRENDIZES EM EVENTOS EXTERNOS', { align: 'center' });
doc.fontSize(10).text('Versão: 2026.1 | Publicação: 01/02/2026 | Código: POL-RH-014', { align: 'center' });
doc.moveDown(2);

doc.fontSize(14).text('1. Objetivo e Abrangência');
doc.fontSize(11).text(
  'Esta política interna estabelece as normas corporativas para a participação de empregados contratados sob o regime de aprendizagem (jovens aprendizes) em atividades externas da empresa TotvsRhInteligente.'
);
doc.moveDown(1);

doc.fontSize(14).text('2. Da Proibição de Participação em Eventos Externos');
doc.fontSize(11).text(
  'Fica estritamente vedada a participação de aprendizes em feiras, congressos, seminários, convenções ou qualquer evento corporativo externo, bem como a realização de viagens a serviço da empresa, independentemente da duração ou localidade.'
);
doc.moveDown(1);

doc.fontSize(14).text('3. Justificativa Legal e Formação Teórica');
doc.fontSize(11).text(
  'A contratação do aprendiz visa precipuamente à sua formação técnico-profissional metódica, com jornada especial diária controlada, sendo incompatível com sobrejornada, deslocamentos interestaduais ou municipais para eventos externos e feiras promocionais (art. 428 e 432 da CLT).'
);
doc.moveDown(1);

doc.fontSize(14).text('4. Perguntas Frequentes (FAQ)');
doc.fontSize(12).text('Pergunta: Aprendiz pode ir a uma feira ou evento externo corporativo?');
doc.fontSize(11).text(
  'Resposta: Não. Conforme as regras desta política interna (Versão 2026.1, de 01/02/2026), jovens aprendizes não podem viajar nem comparecer a feiras, congressos ou eventos externos patrocinados ou frequentados pela empresa, devendo cumprir estritamente suas atividades regulares na sede ou entidade formadora.'
);

doc.end();
console.log('PDF gerado com sucesso em:', outPath);
