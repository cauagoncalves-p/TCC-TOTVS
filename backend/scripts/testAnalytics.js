// backend/scripts/testAnalytics.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
const authService = require('../src/services/authService');
const analyticsService = require('../src/services/analyticsService');
const alertService = require('../src/services/alertService');

async function runTests() {
  console.log('====================================================');
  console.log('   TESTES DA PARTE 3: CENTRAL DE INTELIGÊNCIA (FASE A)  ');
  console.log('====================================================');

  // 1. Logins
  console.log('\n[1] Autenticando gestor e colaborador...');
  const gestorToken = await authService.login('carlos.gestor@exemplo.com', '123456');
  const colabToken = await authService.login('ana.souza@exemplo.com', '123456');

  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'TotvsRhInteligenteSuperSecretKey2026!';
  const gestorUser = jwt.verify(gestorToken, secret);
  const colabUser = jwt.verify(colabToken, secret);

  console.log(`Gestor autenticado: ID ${gestorUser.id} (role: ${gestorUser.role})`);
  console.log(`Colaborador autenticado: ID ${colabUser.id} (role: ${colabUser.role})`);

  if (gestorUser.role !== 'gestor') throw new Error('Falha: Perfil de Carlos não é gestor');
  if (colabUser.role !== 'colaborador') throw new Error('Falha: Perfil de Ana não é colaborador');

  // 2. Departamentos
  console.log('\n[2] Listando departamentos...');
  const depts = await analyticsService.getDepartments();
  console.log(`Departamentos ativos encontrados (${depts.length}):`, depts.map(d => d.Name).join(', '));
  if (depts.length !== 6) throw new Error(`Esperado 6 departamentos, encontrado: ${depts.length}`);

  // 3. Resumo / Cards
  console.log('\n[3] Obtendo resumo (Cards de indicadores e variações)...');
  const summary = await analyticsService.getSummary({});
  console.log('Período analisado:', summary.period);
  console.log('Cards:', summary.cards);
  if (typeof summary.cards.absenceRate.value !== 'number') throw new Error('Cards ausentes');

  // 4. Série Temporal
  console.log('\n[4] Obtendo série temporal (Timeseries)...');
  const timeseries = await analyticsService.getTimeseries({});
  console.log(`Registros na série temporal: ${timeseries.length}`);
  if (timeseries.length === 0) throw new Error('Série temporal vazia');

  // 5. Comparativo por departamento
  console.log('\n[5] Obtendo comparativo por departamento no último mês...');
  const byDept = await analyticsService.getByDepartment();
  console.log(`Departamentos comparados no último mês (${byDept.length}):`);
  byDept.forEach(d => {
    console.log(` - ${d.DepartmentName}: Abs=${d.AbsenceRate}%, HE=${d.OvertimePerEmployee}h, Turnover=${d.TurnoverRate}%`);
  });

  // 6. Geração de alertas
  console.log('\n[6] Executando motor de regras de alertas (POST /api/alerts/generate)...');
  const genResult = await alertService.generateAlerts();
  console.log(`Alertas novos gerados: ${genResult.newAlertsGenerated} em ${genResult.departmentsEvaluated} departamentos avaliados.`);
  genResult.alerts.forEach(a => {
    console.log(`   [${a.riskLevel.toUpperCase()}] Regra ${a.ruleCode} -> Dept ID ${a.departmentId}: ${a.justification.substring(0, 80)}...`);
  });

  // 7. Deduplicação de alertas
  console.log('\n[7] Testando deduplicação ao reexecutar motor de alertas...');
  const reGenResult = await alertService.generateAlerts();
  console.log(`Novos alertas na 2ª execução: ${reGenResult.newAlertsGenerated} (esperado: 0 - deduplicação ativa)`);
  if (reGenResult.newAlertsGenerated !== 0) throw new Error('Falha: Alertas foram duplicados!');

  // 8. Listagem de alertas
  console.log('\n[8] Listando alertas gerados...');
  const alertsList = await alertService.listAlerts({});
  console.log(`Total de alertas persistidos: ${alertsList.length}`);
  if (alertsList.length === 0) throw new Error('Nenhum alerta encontrado no banco');

  // 9. Hotspots (ranking de concentração de risco)
  console.log('\n[9] Consultando Hotspots de risco...');
  const hotspots = await analyticsService.getHotspots();
  console.log('Ranking de departamentos por risco:');
  hotspots.forEach((h, idx) => {
    console.log(` ${idx + 1}º ${h.DepartmentName} - Score: ${h.RiskScore} (Ativos: ${h.ActiveAlertsCount}, Alto: ${h.HighRiskCount}, Moderado: ${h.ModerateRiskCount})`);
  });

  // 10. Atualização de status de alerta
  const firstAlert = alertsList[0];
  console.log(`\n[10] Atualizando status do alerta #${firstAlert.Id} para 'lido'...`);
  const updated = await alertService.updateAlertStatus(firstAlert.Id, 'lido', gestorUser.id);
  console.log(`Status atualizado com sucesso: ${updated.Status} (Atualizado por usuário ${updated.UpdatedBy})`);
  if (updated.Status !== 'lido') throw new Error('Falha ao atualizar status do alerta');

  console.log('\n====================================================');
  console.log('   TODOS OS TESTES DA FASE A PASSARAM COM SUCESSO!  ');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Erro nos testes de analytics:', err);
  process.exit(1);
});
