// backend/scripts/testOnboardingManual.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const app = require('../src/index');
const { poolPromise } = require('../src/config/db');

const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}/api`;

let server;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  await poolPromise;

  server = app.listen(PORT);
  console.log(`Servidor de teste iniciado na porta ${PORT}`);

  console.log('\n=== TESTES PARTE 2C: ONBOARDING MANUAL ===\n');

  // 0. Login de RH (roberta.rh@exemplo.com)
  console.log('--- 0. Autenticação RH ---');
  let token = null;
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'roberta.rh@exemplo.com', password: '123456' })
  });
  if (loginRes.ok) {
    const data = await loginRes.json();
    token = data.token;
  } else {
    const retry = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'roberta.rh@exemplo.com', password: 'password123' })
    });
    const retryData = await retry.json();
    token = retryData.token;
  }
  console.log('Login OK! Token obtido.\n');

  // 1. POST /api/onboarding/validate (sem gravar nada no banco)
  console.log('--- 1. Teste de Validação em Tempo Real (POST /api/onboarding/validate) ---');
  const pool = await poolPromise;
  const countBeforeRes = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.OnboardingCases');
  const countBefore = countBeforeRes.recordset[0].total;

  const valRes = await fetch(`${BASE_URL}/onboarding/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      cadastro: {
        fullName: 'João Silva',
        cpf: '00000000000', // CPF inválido
        email: 'invalido@@email',
        birthDate: '2020-01-01' // menos de 14 anos
      }
    })
  });
  const valData = await valRes.json();
  console.log('Status HTTP:', valRes.status);
  console.log('Resultado da validação (canApprove):', valData.canApprove);
  console.log('Ocorrências encontradas:', valData.validationIssues?.map(i => `${i.field}: ${i.code} (${i.nature})`));

  const countAfterRes = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.OnboardingCases');
  const countAfter = countAfterRes.recordset[0].total;
  if (countBefore !== countAfter) {
    throw new Error(`Validação gravou registro no banco! Antes: ${countBefore}, Depois: ${countAfter}`);
  }
  console.log('CONFIRMADO: Validação não criou nenhum registro no banco de dados!\n');

  // 2. POST /api/onboarding - Caso manual incompleto (bloqueia aprovação)
  console.log('--- 2. Teste de Caso Manual Incompleto (Rascunho) ---');
  const incompleteRes = await fetch(`${BASE_URL}/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      cadastro: {
        fullName: 'Candidato Rascunho',
        phone: '(11) 99999-8888'
      }
    })
  });
  const incompleteData = await incompleteRes.json();
  console.log('Caso criado:', {
    id: incompleteData.id,
    origin: incompleteData.origin,
    sourceFileName: incompleteData.sourceFileName,
    canApprove: incompleteData.canApprove,
    status: incompleteData.status
  });
  console.log('Pendências identificadas:', incompleteData.validationIssues?.map(i => `${i.field}: ${i.code} (${i.nature})`));

  // Tentativa de aprovar caso incompleto (deve retornar 422)
  console.log('Tentando aprovar caso incompleto...');
  const approveIncompleteRes = await fetch(`${BASE_URL}/onboarding/${incompleteData.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status da aprovação (esperado 422):', approveIncompleteRes.status);
  if (approveIncompleteRes.status !== 422) {
    throw new Error(`Esperado status 422 para aprovação bloqueada, obtido ${approveIncompleteRes.status}`);
  }
  console.log('CONFIRMADO: Aprovação bloqueada corretamente para caso incompleto!\n');

  // 3. POST /api/onboarding - Caso manual completo e aprovação
  console.log('--- 3. Teste de Caso Manual Completo e Aprovação ---');
  function generateValidCpf() {
    const rnd = () => Math.floor(Math.random() * 9);
    const n = [rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd(), rnd()];
    let d1 = 0;
    for (let i = 0; i < 9; i++) d1 += n[i] * (10 - i);
    d1 = 11 - (d1 % 11);
    if (d1 >= 10) d1 = 0;
    n.push(d1);
    let d2 = 0;
    for (let i = 0; i < 10; i++) d2 += n[i] * (11 - i);
    d2 = 11 - (d2 % 11);
    if (d2 >= 10) d2 = 0;
    n.push(d2);
    return n.join('');
  }

  const validCpf = generateValidCpf();
  const uniqueEmail = `manual.teste.${Date.now()}@exemplo.com`;

  const completeRes = await fetch(`${BASE_URL}/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      cadastro: {
        fullName: 'Mariana Souza Manual',
        cpf: validCpf,
        rg: '12345678X',
        birthDate: '1992-05-15',
        email: uniqueEmail,
        phone: '11988887777',
        zipCode: '01310100',
        street: 'Av Paulista, 1000',
        city: 'São Paulo',
        state: 'SP',
        jobTitle: 'Engenheira de Software',
        department: 'Tecnologia',
        hireDate: '2026-03-01',
        baseSalary: 12000.00
      },
      perfil: {
        skills: ['Node.js', 'React', 'TypeScript'],
        experiences: []
      }
    })
  });
  const completeData = await completeRes.json();
  console.log('Caso manual completo criado:', {
    id: completeData.id,
    origin: completeData.origin,
    sourceFileName: completeData.sourceFileName,
    canApprove: completeData.canApprove,
    issues: completeData.validationIssues?.length
  });

  if (!completeData.canApprove) {
    console.error('Issues:', completeData.validationIssues);
    throw new Error('Caso manual completo deveria ter canApprove = true!');
  }

  // Aprova o caso manual
  console.log('Aprovando caso manual completo...');
  const approveRes = await fetch(`${BASE_URL}/onboarding/${completeData.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  const approveData = await approveRes.json();
  console.log('Resultado da aprovação:', {
    status: approveRes.status,
    matricula: approveData.registration,
    employeeId: approveData.employeeId,
    userId: approveData.userId
  });
  if (!approveRes.ok || !approveData.registration) {
    throw new Error('Falha na aprovação do caso manual: ' + JSON.stringify(approveData));
  }
  console.log('CONFIRMADO: Colaborador admitido com matrícula oficial sem nenhum PDF!\n');

  // 4. Anexar PDF a caso manual com conflito
  console.log('--- 4. Teste de Anexar PDF a Caso Manual com Conflito ---');
  console.log('Aguardando 3s antes do envio do PDF...');
  await sleep(3000);

  const manualCpf2 = generateValidCpf();
  const manualEmail2 = `conflito.teste.${Date.now()}@exemplo.com`;

  // Cria caso manual com nome digitado pelo analista
  const manualCaseForPdf = await fetch(`${BASE_URL}/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      cadastro: {
        fullName: 'Nome Digitado Pelo Analista',
        cpf: manualCpf2,
        email: manualEmail2,
        jobTitle: 'Desenvolvedor Pleno'
      }
    })
  });
  const manualCaseData = await manualCaseForPdf.json();
  console.log(`Caso manual #${manualCaseData.id} criado para receber PDF.`);

  // Anexa ficha_admissao_completa.pdf ao caso manual via FormData
  const pdfBytes = fs.readFileSync(path.resolve(__dirname, '../../ficha_admissao_completa.pdf'));
  const formData = new FormData();
  formData.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'ficha_admissao_completa.pdf');

  const addDocRes = await fetch(`${BASE_URL}/onboarding/${manualCaseData.id}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  const addDocData = await addDocRes.json();
  console.log('Resultado ao anexar documento ao caso manual:');
  console.log('Status HTTP:', addDocRes.status);
  console.log('Total documentos:', addDocData.documents?.length);
  const candidateName = addDocData.reviewedData?.cadastro?.fullName || addDocData.reviewedData?.fullName;
  console.log('Nome final no cadastro (deve ser o digitado):', candidateName);

  const conflictIssues = (addDocData.validationIssues || []).filter(i => i.code === 'FIELD_CONFLICT');
  console.log('Conflitos detectados (FIELD_CONFLICT):', conflictIssues.map(c => `${c.field}: ${c.message}`));

  const keptAnalystName = candidateName === 'Nome Digitado Pelo Analista';
  if (!keptAnalystName) {
    throw new Error('O valor do analista foi sobrescrito pela IA!');
  }
  if (conflictIssues.length === 0) {
    throw new Error('Deveria ter gerado FIELD_CONFLICT pois o nome no PDF é diferente do digitado!');
  }
  console.log('CONFIRMADO: Valor do analista foi preservado e FIELD_CONFLICT foi gerado!\n');

  // 5. Teste de consulta e listagem (Origin e SourceFileName nulo)
  console.log('--- 5. Teste de Detalhe e Listagem (Origin / SourceFileName nulo) ---');
  const getDetailRes = await fetch(`${BASE_URL}/onboarding/${manualCaseData.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const detailData = await getDetailRes.json();
  console.log('Detalhe do caso manual:', {
    id: detailData.id,
    origin: detailData.origin,
    sourceFileName: detailData.sourceFileName
  });
  if (detailData.origin !== 'manual') {
    throw new Error(`Esperado origin 'manual', obtido '${detailData.origin}'`);
  }

  const listRes = await fetch(`${BASE_URL}/onboarding`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const listData = await listRes.json();
  const foundCase = listData.cases?.find(c => c.Id === manualCaseData.id);
  console.log('Caso na listagem:', foundCase);
  if (!foundCase || foundCase.Origin !== 'manual') {
    throw new Error('Caso não encontrado com Origin correto na listagem!');
  }
  console.log('CONFIRMADO: Listagem e detalhe exibem Origin e aceitam SourceFileName nulo!\n');

  console.log('=== TODOS OS TESTES DA PARTE 2C PASSARAM COM SUCESSO! ===\n');
  if (server) server.close();
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ ERRO NOS TESTES:', err);
  if (server) server.close();
  process.exit(1);
});
