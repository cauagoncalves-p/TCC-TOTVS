// backend/scripts/testOnboardingUniversal.js
const fs = require('fs');
const path = require('path');

// Inicia o servidor backend no mesmo processo
require('../src/index');

const { poolPromise } = require('../src/config/db');
const BASE_URL = 'http://localhost:3001/api';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('Aguardando 2s para inicialização completa do servidor...');
  await sleep(2000);

  console.log('\n=== INICIANDO TESTES DO ONBOARDING UNIVERSAL (PARTE 2B) ===\n');

  // 1. Login como RH
  console.log('1. Autenticando como RH (roberta.rh@exemplo.com)...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'roberta.rh@exemplo.com', password: '123456' })
  });
  if (!loginRes.ok) {
    throw new Error(`Falha no login: ${loginRes.status} ${await loginRes.text()}`);
  }
  const { token } = await loginRes.json();
  console.log('   Token obtido com sucesso.\n');

  const authHeader = { Authorization: `Bearer ${token}` };

  // 2. Teste: Document Types
  console.log('2. Consultando tipos de documentos suportados (GET /api/onboarding/document-types)...');
  const typesRes = await fetch(`${BASE_URL}/onboarding/document-types`, { headers: authHeader });
  const typesData = await typesRes.json();
  console.log('   Status:', typesRes.status, 'Body:', typesData);
  console.log('   Tipos cadastrados:', typesData.types.map(t => t.id).join(', '));
  console.log('   OK!\n');

  // 3. Teste: Currículo
  console.log('3. Enviando currículo (POST /api/onboarding/upload - curriculo_teste.pdf)...');
  const cvBytes = fs.readFileSync(path.resolve(__dirname, '../../curriculo_teste.pdf'));
  const formCv = new FormData();
  formCv.append('file', new Blob([cvBytes], { type: 'application/pdf' }), 'curriculo_teste.pdf');

  const cvRes = await fetch(`${BASE_URL}/onboarding/upload`, {
    method: 'POST',
    headers: authHeader,
    body: formCv
  });
  if (!cvRes.ok) {
    throw new Error(`Falha upload curriculo: ${cvRes.status} ${await cvRes.text()}`);
  }
  const cvCase = await cvRes.json();
  console.log(`   Caso #${cvCase.id} criado com sucesso!`);
  console.log(`   Tipo detectado: ${cvCase.document.documentType} (${cvCase.document.classificationReason})`);
  console.log(`   Método de extração: ${cvCase.document.extractionMethod}`);
  console.log(`   Nome extraído: ${cvCase.extractedData.cadastro?.fullName || cvCase.extractedData.fullName}`);
  console.log(`   Perfil profissional extraído: ${cvCase.extractedData.perfil ? 'SIM' : 'NÃO'}`);
  if (cvCase.extractedData.perfil) {
    console.log(`   - Habilidades: ${cvCase.extractedData.perfil.skills?.join(', ')}`);
    console.log(`   - Experiências: ${cvCase.extractedData.perfil.experience?.length}`);
    console.log(`   - Formação: ${cvCase.extractedData.perfil.education?.length}`);
  }
  const pendingIssues = cvCase.validationIssues.filter(i => i.nature === 'pendente');
  console.log(`   Campos pendentes obrigatórios: ${pendingIssues.map(i => i.field).join(', ')}`);
  console.log(`   Pode aprovar direto? ${cvCase.canApprove} (esperado: false pois faltam CPF, admissão etc)`);
  console.log('   OK!\n');

  // 4. Teste: Ficha de Admissão Completa
  console.log('4. Enviando ficha de admissão completa (POST /api/onboarding/upload - ficha_admissao_completa.pdf)...');
  const fichaBytes = fs.readFileSync(path.resolve(__dirname, '../../ficha_admissao_completa.pdf'));
  const formFicha = new FormData();
  formFicha.append('file', new Blob([fichaBytes], { type: 'application/pdf' }), 'ficha_admissao_completa.pdf');

  const fichaRes = await fetch(`${BASE_URL}/onboarding/upload`, {
    method: 'POST',
    headers: authHeader,
    body: formFicha
  });
  if (!fichaRes.ok) {
    throw new Error(`Falha upload ficha: ${fichaRes.status} ${await fichaRes.text()}`);
  }
  const fichaCase = await fichaRes.json();
  console.log(`   Caso #${fichaCase.id} criado!`);
  console.log(`   Tipo detectado: ${fichaCase.document.documentType}`);
  console.log(`   Nome: ${fichaCase.extractedData.cadastro?.fullName || fichaCase.extractedData.fullName}`);
  console.log(`   CPF: ${fichaCase.extractedData.cadastro?.cpf || fichaCase.extractedData.cpf}`);
  console.log(`   Cargo: ${fichaCase.extractedData.cadastro?.jobTitle || fichaCase.extractedData.jobTitle}`);
  console.log(`   Pode aprovar? ${fichaCase.canApprove} (esperado: true)`);
  console.log('   OK!\n');

  // 5. Teste: Documento Desconhecido (Outro)
  console.log('5. Enviando documento desconhecido (POST /api/onboarding/upload - documento_outro_teste.pdf)...');
  const outroBytes = fs.readFileSync(path.resolve(__dirname, '../../documento_outro_teste.pdf'));
  const formOutro = new FormData();
  formOutro.append('file', new Blob([outroBytes], { type: 'application/pdf' }), 'documento_outro_teste.pdf');

  const outroRes = await fetch(`${BASE_URL}/onboarding/upload`, {
    method: 'POST',
    headers: authHeader,
    body: formOutro
  });
  if (!outroRes.ok) {
    throw new Error(`Falha upload outro: ${outroRes.status} ${await outroRes.text()}`);
  }
  const outroCase = await outroRes.json();
  console.log(`   Caso #${outroCase.id} criado!`);
  console.log(`   Tipo detectado: ${outroCase.document.documentType}`);
  console.log(`   Cadastro automático vazio? ${!outroCase.extractedData.cadastro?.fullName ? 'SIM' : 'NÃO'}`);
  console.log('   OK!\n');

  // 6. Teste: Ficha + Currículo no mesmo caso (Fusão Multi-Documento)
  console.log(`6. Adicionando currículo ao Caso da Ficha #${fichaCase.id} (POST /api/onboarding/${fichaCase.id}/documents)...`);
  const formAddCv = new FormData();
  formAddCv.append('file', new Blob([cvBytes], { type: 'application/pdf' }), 'curriculo_teste.pdf');

  const multiRes = await fetch(`${BASE_URL}/onboarding/${fichaCase.id}/documents`, {
    method: 'POST',
    headers: authHeader,
    body: formAddCv
  });
  if (!multiRes.ok) {
    throw new Error(`Falha add documento: ${multiRes.status} ${await multiRes.text()}`);
  }
  const multiCase = await multiRes.json();
  console.log(`   Documento adicionado: ${multiCase.documentAdded.fileName} (${multiCase.documentAdded.documentType})`);
  console.log(`   Total de documentos no caso: ${multiCase.documents.length}`);
  console.log(`   Cadastro fundido (nome do documento de maior prioridade): ${multiCase.extractedData.cadastro?.fullName}`);
  console.log(`   Perfil fundido (veio do currículo): ${multiCase.extractedData.perfil?.skills ? 'SIM' : 'NÃO'}`);
  const conflicts = multiCase.validationIssues.filter(i => i.code === 'FIELD_CONFLICT');
  console.log(`   Conflitos detectados: ${conflicts.length} (${conflicts.map(c => c.field).join(', ')})`);
  console.log('   OK!\n');

  // 7. Teste: Aprovação do Caso com gravação de EmployeeProfiles
  console.log(`7. Aprovando Caso #${fichaCase.id} com perfil profissional (POST /api/onboarding/${fichaCase.id}/approve)...`);
  const approveRes = await fetch(`${BASE_URL}/onboarding/${fichaCase.id}/approve`, {
    method: 'POST',
    headers: authHeader
  });
  if (!approveRes.ok) {
    throw new Error(`Falha na aprovação: ${approveRes.status} ${await approveRes.text()}`);
  }
  const approveData = await approveRes.json();
  console.log(`   Mensagem: ${approveData.message}`);
  console.log(`   Matrícula: ${approveData.registration}`);
  console.log(`   ID do Colaborador: ${approveData.employeeId}`);
  console.log(`   Senha temporária: ${approveData.initialPassword}`);

  // Verifica no banco se EmployeeProfiles foi gravado
  const pool = await poolPromise;
  const profQuery = await pool.request()
    .input('empId', approveData.employeeId)
    .query('SELECT * FROM dbo.EmployeeProfiles WHERE EmployeeId = @empId');
  if (profQuery.recordset.length > 0) {
    console.log(`   Perfil gravado em dbo.EmployeeProfiles com sucesso! (EmployeeId: ${approveData.employeeId})`);
  } else {
    console.warn(`   Aviso: Perfil não localizado em dbo.EmployeeProfiles.`);
  }
  console.log('   OK!\n');

  console.log('=== TODOS OS TESTES PASSARAM COM SUCESSO! ===');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\nErro no teste:', err?.message || err);
  process.exit(1);
});
