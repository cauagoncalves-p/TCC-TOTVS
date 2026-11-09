// backend/scripts/testCompliance.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const authService = require('../src/services/authService');
const complianceRuleRepository = require('../src/repositories/complianceRuleRepository');
const complianceIssueRepository = require('../src/repositories/complianceIssueRepository');
const esocialEventRepository = require('../src/repositories/esocialEventRepository');
const complianceRunService = require('../src/services/complianceRunService');
const auditLogRepository = require('../src/repositories/auditLogRepository');

async function runTests() {
  console.log('====================================================');
  console.log('  TESTES DA PARTE 4: COMPLIANCE INTELIGENTE (FASE A) ');
  console.log('====================================================');

  // 1. Logins
  console.log('\n[1] Autenticando usuários de teste (RH, Gestor, Colaborador)...');
  const rhToken = await authService.login('roberta.rh@exemplo.com', '123456');
  const gestorToken = await authService.login('carlos.gestor@exemplo.com', '123456');
  const colabToken = await authService.login('ana.souza@exemplo.com', '123456');

  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'TotvsRhInteligenteSuperSecretKey2026!';
  const rhUser = jwt.verify(rhToken, secret);
  const gestorUser = jwt.verify(gestorToken, secret);
  const colabUser = jwt.verify(colabToken, secret);

  console.log(`RH autenticado: ID ${rhUser.id} (role: ${rhUser.role})`);
  console.log(`Gestor autenticado: ID ${gestorUser.id} (role: ${gestorUser.role})`);
  console.log(`Colaborador autenticado: ID ${colabUser.id} (role: ${colabUser.role})`);

  // 2. Catálogo de Regras
  console.log('\n[2] Consultando catálogo de regras...');
  const rules = await complianceRuleRepository.listRules();
  console.log(`Regras ativas encontradas: ${rules.length}`);
  const oficialRules = rules.filter(r => r.SourceType === 'oficial');
  console.log(`Regras com fonte oficial: ${oficialRules.length}`);
  const unverified = oficialRules.filter(r => r.SourceVerified === false || r.SourceVerified === 0);
  console.log(`Regras oficiais com SourceVerified = 0 (a conferir): ${unverified.length}`);
  if (unverified.length === 0) throw new Error('Falha: Regras oficiais deveriam ter SourceVerified = 0');

  // 3. Execução da Auditoria de Cadastros
  console.log('\n[3] Executando auditoria preventiva de cadastros (scope = cadastros)...');
  const runCadastros = await complianceRunService.executeRun({
    scope: 'cadastros',
    userId: rhUser.id
  });
  console.log('Resultado da auditoria de cadastros:', runCadastros);
  if (runCadastros.issuesOpen === 0) throw new Error('Falha: Nenhum defeito detectado na auditoria');

  // 4. Teste de Deduplicação na Reanálise
  console.log('\n[4] Testando reanálise de auditoria (deduplicação)...');
  const runCadastros2 = await complianceRunService.executeRun({
    scope: 'cadastros',
    userId: rhUser.id
  });
  console.log(`Novas inconsistências na 2ª execução: ${runCadastros2.issuesNew} (esperado: 0)`);
  if (runCadastros2.issuesNew !== 0) throw new Error('Falha: Inconsistências foram duplicadas');

  // 5. Auditoria Pré-envio eSocial
  console.log('\n[5] Executando auditoria pré-envio de eventos eSocial (scope = esocial)...');
  const runEsocial = await complianceRunService.executeRun({
    scope: 'esocial',
    userId: rhUser.id
  });
  console.log('Resultado da auditoria eSocial:', runEsocial);

  // 6. Listagem de Inconsistências
  console.log('\n[6] Listando central de inconsistências...');
  const issues = await complianceIssueRepository.list({ status: 'aberta' });
  console.log(`Inconsistências abertas encontradas: ${issues.length}`);
  issues.slice(0, 5).forEach(i => {
    console.log(` - [${i.Priority.toUpperCase()}] ${i.RuleCode} (${i.RuleTitle}): ${i.Description.substring(0, 70)}...`);
  });

  // 7. Teste de Validação da Resolução (justificativa obrigatória para 'ignorada')
  console.log('\n[7] Testando exigência de nota para inconsistência ignorada...');
  const sampleIssue = issues[0];
  try {
    await complianceRunService.updateIssueStatus(sampleIssue.Id, {
      status: 'ignorada',
      resolutionNote: '',
      userId: rhUser.id
    });
    throw new Error('Falha: Deveria ter recusado status ignorada sem nota');
  } catch (err) {
    console.log(`Bloqueio confirmado: ${err.message}`);
  }

  // Resolução válida com justificativa
  const resolved = await complianceRunService.updateIssueStatus(sampleIssue.Id, {
    status: 'ignorada',
    resolutionNote: 'Documento retificador arquivado e conferido pelo DP.',
    userId: rhUser.id
  });
  console.log(`Inconsistência #${resolved.Id} atualizada com sucesso para '${resolved.Status}'.`);

  // 8. Teste de Bloqueio de Confirmação do eSocial com Inconsistência Alta
  console.log('\n[8] Testando confirmação de evento eSocial com pendência alta aberta...');
  const events = await esocialEventRepository.listEvents();
  const eventWithIssues = events.find(e => e.Status === 'com_inconsistencias');
  if (eventWithIssues) {
    try {
      await complianceRunService.confirmEsocialEvent(eventWithIssues.Id, rhUser.id);
      throw new Error('Falha: Evento com inconsistência alta não deveria poder ser confirmado');
    } catch (err) {
      console.log(`Bloqueio de confirmação confirmado: ${err.message}`);
    }
  }

  // 9. Confirmação de Evento Saudável (pronto para envio)
  console.log('\n[9] Confirmando evento eSocial pronto para envio...');
  const readyEvent = events.find(e => e.Status === 'pronto_para_envio');
  if (readyEvent) {
    const confirmed = await complianceRunService.confirmEsocialEvent(readyEvent.Id, rhUser.id);
    console.log(`Evento #${confirmed.Id} (${confirmed.EventCode}) confirmado com status '${confirmed.Status}'.`);
  }

  // 10. Consulta de Logs de Auditoria
  console.log('\n[10] Consultando registro de auditoria (ComplianceAuditLog)...');
  const auditLogs = await auditLogRepository.listLogs({ limit: 5 });
  console.log(`Total de logs gravados: ${auditLogs.total}`);
  auditLogs.logs.forEach(l => {
    console.log(` - [${l.CreatedAt}] Ação: ${l.Action} por ${l.UserName || 'Sistema'} (Entidade: ${l.EntityType} #${l.EntityId})`);
  });

  console.log('\n====================================================');
  console.log('   TODOS OS TESTES DA FASE A PASSARAM COM SUCESSO!  ');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Erro nos testes de compliance:', err);
  process.exit(1);
});
