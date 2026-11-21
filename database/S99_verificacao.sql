/* =====================================================================
   S99_verificacao.sql  |  Consultas SOMENTE DE LEITURA para conferir o seed e a plataforma
   Rode no SSMS selecionando e executando cada bloco (F5). Nada aqui altera dados.
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO
SET NOCOUNT ON;
GO

/* 1) Contagens do seed */
SELECT N'Usuários do seed' AS Item, COUNT(*) AS Qtde FROM dbo.Users WHERE Email LIKE N'%@seed.exemplo.com'
UNION ALL SELECT N'Colaboradores', COUNT(*) FROM dbo.Employees WHERE Registration LIKE N'S[0-9][0-9][0-9][0-9]'
UNION ALL SELECT N'Holerites', COUNT(*) FROM dbo.Payslips p JOIN dbo.Employees e ON e.Id = p.EmployeeId WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
UNION ALL SELECT N'Métricas mensais (7 departamentos)', COUNT(*) FROM dbo.DepartmentMonthlyMetrics m JOIN dbo.Departments d ON d.Id = m.DepartmentId
            WHERE d.Name IN (N'Atendimento', N'Tecnologia', N'Financeiro', N'Comercial', N'Logística', N'RH', N'Projetos Especiais')
UNION ALL SELECT N'Eventos eSocial', COUNT(*) FROM dbo.EsocialEvents ev JOIN dbo.Employees e ON e.Id = ev.EmployeeId WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
UNION ALL SELECT N'Gabarito de defeitos (linhas)', COUNT(*) FROM dbo.SeedExpectedDefects;
GO

/* 2) Gabarito de defeitos por regra (esperado: 27 ocorrências de cadastro + 12 de eSocial) */
SELECT RuleCode, COUNT(*) AS Registros,
       COUNT(DISTINCT COALESCE(PairKey, CAST(EmployeeId AS VARCHAR(12)))) AS Ocorrencias
FROM dbo.SeedExpectedDefects GROUP BY RuleCode ORDER BY RuleCode;
GO

/* 3) Quadro de pessoal: métricas x cadastros no último mês fechado
      (a diferença deve ser no máximo o número de defeitos plantados do departamento) */
SELECT d.Name AS Departamento, m.MonthRef, m.Headcount AS NasMetricas,
       (SELECT COUNT(*) FROM dbo.Employees e
         WHERE e.Department = d.Name AND e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
           AND e.HireDate <= EOMONTH(m.MonthRef) AND (e.TerminationDate IS NULL OR e.TerminationDate > EOMONTH(m.MonthRef))) AS NosCadastrosHoje,
       (SELECT COUNT(*) FROM dbo.SeedExpectedDefects x JOIN dbo.Employees e ON e.Id = x.EmployeeId
         WHERE e.Department = d.Name AND x.EventCode IS NULL) AS DefeitosNoDepto
FROM dbo.DepartmentMonthlyMetrics m JOIN dbo.Departments d ON d.Id = m.DepartmentId
WHERE m.MonthRef = DATEADD(MONTH, -1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
  AND d.Name IN (N'Atendimento', N'Tecnologia', N'Financeiro', N'Comercial', N'Logística', N'RH', N'Projetos Especiais')
ORDER BY d.Name;
GO

/* 4) Holerites que não fecham (esperado: 3, os de PAY_TOTALS) */
SELECT e.Registration, p.Competence, p.GrossAmount, p.TotalDeductions,
       SUM(CASE WHEN i.Kind = 'P' THEN i.Amount ELSE 0 END) AS SomaProventos,
       SUM(CASE WHEN i.Kind = 'D' THEN i.Amount ELSE 0 END) AS SomaDescontos
FROM dbo.Payslips p
JOIN dbo.Employees e ON e.Id = p.EmployeeId
JOIN dbo.PayslipItems i ON i.PayslipId = p.Id
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
GROUP BY e.Registration, p.Competence, p.GrossAmount, p.TotalDeductions
HAVING p.GrossAmount <> SUM(CASE WHEN i.Kind = 'P' THEN i.Amount ELSE 0 END)
    OR p.TotalDeductions <> SUM(CASE WHEN i.Kind = 'D' THEN i.Amount ELSE 0 END);
GO

/* 5) DEPOIS de rodar a auditoria de cadastros e a de eSocial na plataforma:
      5a) defeitos plantados que o sistema NÃO encontrou (falsos negativos; esperado: nenhum) */
SELECT x.RuleCode, x.EventCode, x.Registration, x.Note
FROM dbo.SeedExpectedDefects x
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.ComplianceIssues i JOIN dbo.ComplianceRules r ON r.Id = i.RuleId
    WHERE i.EmployeeId = x.EmployeeId AND i.Status = N'aberta'
      AND (r.Code = x.RuleCode OR (x.EventCode IS NOT NULL AND i.EventCode = x.EventCode)))
ORDER BY x.RuleCode, x.Registration;
GO

/*     5b) achados em colaboradores do seed que NÃO estavam no gabarito (falsos positivos; esperado: nenhum) */
SELECT r.Code AS Regra, e.Registration, i.EventCode, i.Description
FROM dbo.ComplianceIssues i
JOIN dbo.ComplianceRules r ON r.Id = i.RuleId
JOIN dbo.Employees e ON e.Id = i.EmployeeId
WHERE i.Status = N'aberta' AND e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
  AND NOT EXISTS (SELECT 1 FROM dbo.SeedExpectedDefects x
                  WHERE x.EmployeeId = i.EmployeeId
                    AND (x.RuleCode = r.Code OR (x.EventCode IS NOT NULL AND i.EventCode = x.EventCode)))
ORDER BY r.Code, e.Registration;
GO

/* 6) DEPOIS de gerar os alertas na plataforma: alertas esperados x gerados por departamento */
SELECT x.Department, x.RuleCode AS RegraEsperada, x.ExpectedRisk AS RiscoEsperado, x.Expectation AS Expectativa,
       (SELECT COUNT(*) FROM dbo.Alerts a JOIN dbo.Departments d ON d.Id = a.DepartmentId
         WHERE d.Name = x.Department AND (x.RuleCode IS NULL OR a.RuleCode = x.RuleCode)) AS AlertasGerados,
       (SELECT COUNT(*) FROM dbo.Alerts a JOIN dbo.Departments d ON d.Id = a.DepartmentId
         WHERE d.Name = x.Department AND a.RiskLevel = N'alto') AS AlertasAltoNoDepto
FROM dbo.SeedExpectedAlerts x ORDER BY x.Department, x.RuleCode;
GO

/* 7) Obrigações: status como a tela deve exibir (esperado: 4 em dia, 3 próximas, 3 pendentes, 3 atrasadas) */
SELECT CASE WHEN i.Status = N'concluida' THEN N'Em dia'
            WHEN i.DueDate < CAST(GETDATE() AS DATE) THEN N'Atrasado'
            WHEN i.DueDate <= DATEADD(DAY, 7, CAST(GETDATE() AS DATE)) THEN N'Próximo do vencimento'
            ELSE N'Pendente' END AS StatusExibido, COUNT(*) AS Qtde
FROM dbo.ObligationInstances i JOIN dbo.Obligations o ON o.Id = i.ObligationId
WHERE o.Code IN (N'FOLHA_FECHAMENTO', N'ESOCIAL_PERIODICOS', N'RECOLHIMENTO_MENSAL', N'DECLARACAO_MENSAL')
GROUP BY CASE WHEN i.Status = N'concluida' THEN N'Em dia'
              WHEN i.DueDate < CAST(GETDATE() AS DATE) THEN N'Atrasado'
              WHEN i.DueDate <= DATEADD(DAY, 7, CAST(GETDATE() AS DATE)) THEN N'Próximo do vencimento'
              ELSE N'Pendente' END;
GO

/* 8) GABARITO DO CHAT: o que a IA deve responder para cada colaborador que pode fazer login (S0001 a S0012) */
SELECT u.Email AS Login, e.Registration, e.FullName, e.Department, e.ContractType,
       v.DaysRemaining AS SaldoFerias,
       p.Competence AS UltimaCompetencia, p.NetAmount AS LiquidoUltimoHolerite,
       vt.Amount AS DescontoValeTransporte
FROM dbo.Employees e
JOIN dbo.Users u ON u.Id = e.UserId
LEFT JOIN dbo.VacationBalances v ON v.EmployeeId = e.Id
LEFT JOIN dbo.Payslips p ON p.EmployeeId = e.Id
     AND p.Competence = LEFT(CONVERT(VARCHAR(10), DATEADD(MONTH, -1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)), 23), 7)
LEFT JOIN dbo.PayslipItems vt ON vt.PayslipId = p.Id AND vt.Code = N'2020'
WHERE e.Registration BETWEEN N'S0001' AND N'S0012'
ORDER BY e.Registration;
GO

/* 9) Logins disponíveis (todos usam a MESMA senha do usuário roberta.rh@exemplo.com) */
SELECT Email, Role, CASE WHEN PasswordHash LIKE N'$2%' THEN N'login ativo' ELSE N'SEM login (rode o setPasswords)' END AS Situacao
FROM dbo.Users
WHERE Email LIKE N'%@seed.exemplo.com' AND PasswordHash <> N'SEM_LOGIN_SEED'
ORDER BY Role, Email;
GO

/* 10) Políticas na base de conhecimento e casos de onboarding */
SELECT Id, Title, Audience, IndexStatus, ChunkCount, IsCurrent FROM dbo.KnowledgeDocuments
WHERE SourceOrg = N'RH (empresa fictícia, seed)' ORDER BY Id;
SELECT c.Status, c.Origin, COUNT(*) AS Casos FROM dbo.OnboardingCases c
JOIN dbo.Users u ON u.Id = c.CreatedBy WHERE u.Email = N'rh.seed@seed.exemplo.com'
GROUP BY c.Status, c.Origin ORDER BY c.Status, c.Origin;
GO
