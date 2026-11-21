// backend/scripts/seed/inspect.js
// Reconhecimento e conferência SOMENTE LEITURA da base de dados seed
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });
const { poolPromise } = require('../../src/config/db');
const { ruleCodeMap } = require('./ruleCodeMap');

async function inspect() {
  console.log('========================================================================');
  console.log('   PASSO 1: RECONHECIMENTO SOMENTE LEITURA DA BASE SEED (PARTE 8B)     ');
  console.log('========================================================================\n');

  const pool = await poolPromise;

  // 1. Confirmação das tabelas de controle do seed
  console.log('--- [1] VERIFICAÇÃO DAS TABELAS DE GABARITO E CONTROLE ---');
  const tableCheck = await pool.request().query(`
    SELECT
      OBJECT_ID(N'dbo.SeedExpectedDefects') AS HasDefects,
      OBJECT_ID(N'dbo.SeedExpectedAlerts') AS HasAlerts,
      OBJECT_ID(N'dbo.SeedConfig') AS HasConfig;
  `);
  const { HasDefects, HasAlerts, HasConfig } = tableCheck.recordset[0];
  if (!HasDefects || !HasAlerts || !HasConfig) {
    console.error('ERRO CRÍTICO: Tabelas SeedExpectedDefects, SeedExpectedAlerts ou SeedConfig não existem.');
    console.error('Por favor, aplique os scripts database/S00_reset.sql a S06_conhecimento.sql no banco.');
    process.exit(1);
  }
  console.log('✔ Tabelas de gabarito e controle (SeedExpectedDefects, SeedExpectedAlerts, SeedConfig) confirmadas no banco.');

  // 2. Data de referência (Today)
  console.log('\n--- [2] DATA DE REFERÊNCIA DO SEED (SeedConfig.Today) ---');
  const todayRes = await pool.request().query(`
    SELECT Value FROM dbo.SeedConfig WHERE KeyName = N'Today';
  `);
  const todayVal = todayRes.recordset[0]?.Value;
  if (!todayVal) {
    console.warn('Atenção: Chave "Today" não encontrada em dbo.SeedConfig.');
  } else {
    const seedDate = new Date(todayVal + 'T00:00:00Z');
    const now = new Date();
    const diffDays = Math.floor((now - seedDate) / (1000 * 60 * 60 * 24));
    console.log(`Data gravada: ${todayVal} (${diffDays} dia(s) atrás).`);
    if (diffDays > 3) {
      console.warn(`[AVISO] A data do seed tem mais de 3 dias (${diffDays} dias).`);
      console.warn('Obrigações e notificações dependem da data relativa a hoje; convém rodar S00 a S06 antes de demonstrações.');
    } else {
      console.log('✔ Data do seed está recente (≤ 3 dias).');
    }
  }

  // 3. Contagens por tabela do seed
  console.log('\n--- [3] CONTAGENS GERAIS DO SEED ---');
  const countQuery = `
    SELECT N'Usuários do seed' AS Item, COUNT(*) AS Qtde FROM dbo.Users WHERE Email LIKE N'%@seed.exemplo.com'
    UNION ALL SELECT N'Colaboradores (Sxxxx)', COUNT(*) FROM dbo.Employees WHERE Registration LIKE N'S[0-9][0-9][0-9][0-9]'
    UNION ALL SELECT N'Holerites do seed', COUNT(*) FROM dbo.Payslips p JOIN dbo.Employees e ON e.Id = p.EmployeeId WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
    UNION ALL SELECT N'Métricas mensais (7 deptos)', COUNT(*) FROM dbo.DepartmentMonthlyMetrics m JOIN dbo.Departments d ON d.Id = m.DepartmentId
                WHERE d.Name IN (N'Atendimento', N'Tecnologia', N'Financeiro', N'Comercial', N'Logística', N'RH', N'Projetos Especiais')
    UNION ALL SELECT N'Eventos eSocial simulados', COUNT(*) FROM dbo.EsocialEvents ev JOIN dbo.Employees e ON e.Id = ev.EmployeeId WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
    UNION ALL SELECT N'Gabarito de defeitos (SeedExpectedDefects)', COUNT(*) FROM dbo.SeedExpectedDefects
    UNION ALL SELECT N'Gabarito de alertas (SeedExpectedAlerts)', COUNT(*) FROM dbo.SeedExpectedAlerts;
  `;
  const countsRes = await pool.request().query(countQuery);
  console.table(countsRes.recordset);

  // 4. Catálogo de Regras x Código do Motor
  console.log('\n--- [4] CATÁLOGO DE REGRAS (ComplianceRules) E MAPA DE NOMES ---');
  const rulesRes = await pool.request().query(`
    SELECT Code, EventCode, Severity, Category, Title, SourceType, SourceVerified
    FROM dbo.ComplianceRules
    ORDER BY Code;
  `);
  console.table(rulesRes.recordset.map(r => ({
    Code: r.Code,
    EventCode: r.EventCode || '-',
    Severity: r.Severity,
    Category: r.Category,
    CódigoMotor: Object.keys(ruleCodeMap).find(k => ruleCodeMap[k] === r.Code) || r.Code,
    Mapeado: ruleCodeMap[Object.keys(ruleCodeMap).find(k => ruleCodeMap[k] === r.Code)] ? 'Sim (ruleCodeMap.js)' : 'Direto'
  })));

  // 5. Gabarito de Defeitos Plantados
  console.log('\n--- [5] GABARITO DE DEFEITOS PLANTADOS (SeedExpectedDefects) ---');
  const defectsQuery = `
    SELECT RuleCode,
           COUNT(*) AS Registros,
           COUNT(DISTINCT COALESCE(PairKey, CAST(EmployeeId AS VARCHAR(12)))) AS Ocorrencias
    FROM dbo.SeedExpectedDefects
    GROUP BY RuleCode
    ORDER BY RuleCode;
  `;
  const defectsRes = await pool.request().query(defectsQuery);
  console.table(defectsRes.recordset);

  // 6. Quadro de Pessoal
  console.log('\n--- [6] QUADRO DE PESSOAL: MÉTRICAS x CADASTROS NO ÚLTIMO MÊS FECHADO ---');
  const headcountQuery = `
    SELECT d.Name AS Departamento,
           CONVERT(VARCHAR(10), m.MonthRef, 120) AS MesRef,
           m.Headcount AS NasMetricas,
           (SELECT COUNT(*) FROM dbo.Employees e
             WHERE e.Department = d.Name AND e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
               AND e.HireDate <= EOMONTH(m.MonthRef) AND (e.TerminationDate IS NULL OR e.TerminationDate > EOMONTH(m.MonthRef))) AS NosCadastros,
           (SELECT COUNT(*) FROM dbo.SeedExpectedDefects x JOIN dbo.Employees e ON e.Id = x.EmployeeId
             WHERE e.Department = d.Name AND x.EventCode IS NULL) AS DefeitosNoDepto
    FROM dbo.DepartmentMonthlyMetrics m
    JOIN dbo.Departments d ON d.Id = m.DepartmentId
    WHERE m.MonthRef = DATEADD(MONTH, -1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
      AND d.Name IN (N'Atendimento', N'Tecnologia', N'Financeiro', N'Comercial', N'Logística', N'RH', N'Projetos Especiais')
    ORDER BY d.Name;
  `;
  const headcountRes = await pool.request().query(headcountQuery);
  console.table(headcountRes.recordset);

  // 7. Obrigações
  console.log('\n--- [7] DISTRIBUIÇÃO DAS OBRIGAÇÕES POR STATUS EXIBIDO ---');
  const oblQuery = `
    SELECT CASE WHEN i.Status = N'concluida' THEN N'Em dia'
                WHEN i.DueDate < CAST(GETDATE() AS DATE) THEN N'Atrasado'
                WHEN i.DueDate <= DATEADD(DAY, 7, CAST(GETDATE() AS DATE)) THEN N'Próximo do vencimento'
                ELSE N'Pendente' END AS StatusExibido,
           COUNT(*) AS Qtde
    FROM dbo.ObligationInstances i
    JOIN dbo.Obligations o ON o.Id = i.ObligationId
    WHERE o.Code IN (N'FOLHA_FECHAMENTO', N'ESOCIAL_PERIODICOS', N'RECOLHIMENTO_MENSAL', N'DECLARACAO_MENSAL')
    GROUP BY CASE WHEN i.Status = N'concluida' THEN N'Em dia'
                  WHEN i.DueDate < CAST(GETDATE() AS DATE) THEN N'Atrasado'
                  WHEN i.DueDate <= DATEADD(DAY, 7, CAST(GETDATE() AS DATE)) THEN N'Próximo do vencimento'
                  ELSE N'Pendente' END;
  `;
  const oblRes = await pool.request().query(oblQuery);
  console.table(oblRes.recordset);

  console.log('\n========================================================================');
  console.log('                   INSPEÇÃO CONCLUÍDA COM SUCESSO                       ');
  console.log('========================================================================');
  process.exit(0);
}

inspect().catch(err => {
  console.error('Erro na inspeção:', err);
  process.exit(1);
});
