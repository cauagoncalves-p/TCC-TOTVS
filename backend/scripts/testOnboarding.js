const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const authService = require('../src/services/authService');
const employeeService = require('../src/services/employeeService');
const onboardingService = require('../src/services/onboardingService');

async function runTests() {
  console.log('====================================================');
  console.log('         TESTES DA PARTE 2: ONBOARDING COM IA       ');
  console.log('====================================================');

  // 1. Logins
  console.log('\n[1] Autenticando usuários...');
  const rhToken = await authService.login('roberta.rh@exemplo.com', '123456');
  const anaToken = await authService.login('ana.souza@exemplo.com', '123456');

  const jwt = require('jsonwebtoken');
  const rhUser = jwt.verify(rhToken, process.env.JWT_SECRET);
  const anaUser = jwt.verify(anaToken, process.env.JWT_SECRET);
  console.log(`RH autenticado: ${rhUser.id} (role: ${rhUser.role})`);
  console.log(`Colaborador autenticado: ${anaUser.id} (role: ${anaUser.role})`);

  // 2. Upload de ficha_admissao_incompleta.pdf
  console.log('\n[2] Upload de ficha_admissao_incompleta.pdf...');
  const pdfIncompletaBuf = fs.readFileSync(path.resolve(__dirname, '../test_docs/ficha_admissao_incompleta.pdf'));
  const resIncompleta = await onboardingService.processUpload({
    fileBuffer: pdfIncompletaBuf,
    fileName: 'ficha_admissao_incompleta.pdf',
    userId: rhUser.id
  });
  console.log('Caso incompleto criado. ID:', resIncompleta.id);
  console.log('Problemas detectados:', resIncompleta.validationIssues.map(i => `${i.field}: ${i.code}`));
  console.log('Pode aprovar?', resIncompleta.canApprove);

  if (resIncompleta.canApprove !== false) {
    throw new Error('Falha: Caso incompleto não deveria poder ser aprovado!');
  }

  // 3. Tentar aprovar caso incompleto (deve falhar)
  console.log('\n[3] Tentando aprovar caso incompleto (deve bloquear)...');
  try {
    await onboardingService.approveCase(resIncompleta.id, rhUser.id);
    throw new Error('Falha: Caso incompleto foi aprovado indevidamente!');
  } catch (err) {
    console.log(`Bloqueio de aprovação confirmado! Status: ${err.status} - Mensagem: ${err.message}`);
  }

  // 4. Upload de ficha_admissao_completa.pdf
  console.log('\n[4] Upload de ficha_admissao_completa.pdf...');
  const pdfCompletaBuf = fs.readFileSync(path.resolve(__dirname, '../test_docs/ficha_admissao_completa.pdf'));
  const resCompleta = await onboardingService.processUpload({
    fileBuffer: pdfCompletaBuf,
    fileName: 'ficha_admissao_completa.pdf',
    userId: rhUser.id
  });
  console.log('Caso completo criado. ID:', resCompleta.id);
  console.log('Dados extraídos:', resCompleta.extractedData);
  console.log('Problemas detectados:', resCompleta.validationIssues);
  console.log('Pode aprovar?', resCompleta.canApprove);

  if (resCompleta.canApprove !== true) {
    throw new Error('Falha: Caso completo deveria estar elegível para aprovação!');
  }

  // 5. Aprovar caso completo
  console.log('\n[5] Aprovando caso completo (transação Users + Employees + Matrícula)...');
  const approvalRes = await onboardingService.approveCase(resCompleta.id, rhUser.id);
  console.log('Resultado da aprovação:', approvalRes);

  // 6. Tentar aprovar novamente (deve dar 409 Conflict)
  console.log('\n[6] Tentando aprovar o mesmo caso novamente (deve retornar 409)...');
  try {
    await onboardingService.approveCase(resCompleta.id, rhUser.id);
    throw new Error('Falha: Re-aprovação não retornou erro 409!');
  } catch (err) {
    console.log(`Bloqueio de re-aprovação confirmado! Status: ${err.status} - Mensagem: ${err.message}`);
  }

  // 7. Login do novo colaborador criado (Carla)
  console.log('\n[7] Verificando acesso do novo colaborador criado (Carla)...');
  const carlaToken = await authService.login('carla.oliveira@exemplo.com', '123456');
  const carlaUser = jwt.verify(carlaToken, process.env.JWT_SECRET);
  console.log(`Carla logada com sucesso! UserId: ${carlaUser.id}, Role: ${carlaUser.role}`);

  const carlaProfile = await employeeService.getProfile(carlaUser.id);
  console.log('Perfil da Carla consultado no banco:', {
    FullName: carlaProfile.FullName,
    Registration: carlaProfile.Registration,
    JobTitle: carlaProfile.JobTitle,
    Department: carlaProfile.Department
  });

  console.log('\n====================================================');
  console.log('       TODOS OS TESTES DE ONBOARDING PASSARAM!      ');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Erro nos testes de onboarding:', err);
  process.exit(1);
});
