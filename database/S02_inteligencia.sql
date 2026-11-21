/* =====================================================================
   S02_inteligencia.sql  |  Métricas mensais (Parte 3) derivadas dos colaboradores do S01
   ATENÇÃO: SUBSTITUI as métricas, alertas e previsões dos 7 departamentos do seed
            (inclusive os gerados antes por seedAnalytics.js). Faça backup se precisar deles.
   Headcount, Hires e Terminations são CALCULADOS das datas de admissão e desligamento.
   AbsenceDays e OvertimeHours seguem os cenários abaixo (ruído de apenas +-3%):
     Atendimento ........ nos últimos 5 meses faltas e horas extras sobem juntas; desligamentos sobem depois
     Logística .......... horas extras altas nos últimos 8 meses (crônico)
     Comercial .......... absenteísmo sobe nos últimos 5 meses; turnover sobe 2 meses depois
     Tecnologia, RH ..... estáveis
     Financeiro ......... horas extras altas de 14 a 8 meses atrás, normalizadas desde então
     Projetos Especiais . só 5 meses de histórico (previsão deve ter confiabilidade baixa)
   Pré-requisito: S01 aplicado.
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO
SET NOCOUNT ON;
SET NOEXEC OFF;
GO

IF OBJECT_ID('dbo.SeedConfig') IS NULL OR OBJECT_ID('dbo.DepartmentMonthlyMetrics') IS NULL OR OBJECT_ID('dbo.Alerts') IS NULL
   OR OBJECT_ID('dbo.Predictions') IS NULL OR OBJECT_ID('dbo.Departments') IS NULL
   OR NOT EXISTS (SELECT 1 FROM dbo.Employees WHERE Registration LIKE N'S[0-9][0-9][0-9][0-9]')
BEGIN
    RAISERROR(N'Rode o S01 antes (e confirme que o script 003 da Parte 3 foi aplicado).', 16, 1);
    SET NOEXEC ON;
END
GO

IF OBJECT_ID('dbo.SeedExpectedAlerts') IS NULL
CREATE TABLE dbo.SeedExpectedAlerts (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    Department  NVARCHAR(100) NOT NULL,
    RuleCode    NVARCHAR(40)  NULL,
    ExpectedRisk NVARCHAR(10) NULL,
    Expectation NVARCHAR(300) NOT NULL
);
GO

SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

DECLARE @Today DATE = (SELECT CAST(Value AS DATE) FROM dbo.SeedConfig WHERE KeyName = N'Today');
DECLARE @CurMonth DATE = DATEFROMPARTS(YEAR(@Today), MONTH(@Today), 1);

DECLARE @Names TABLE (Name NVARCHAR(100) PRIMARY KEY);
INSERT INTO @Names (Name) VALUES (N'Atendimento'), (N'Tecnologia'), (N'Financeiro'), (N'Comercial'),
                                 (N'Logística'), (N'RH'), (N'Projetos Especiais');

DELETE a FROM dbo.Alerts a JOIN dbo.Departments d ON d.Id = a.DepartmentId JOIN @Names n ON n.Name = d.Name;
DELETE p FROM dbo.Predictions p JOIN dbo.Departments d ON d.Id = p.DepartmentId JOIN @Names n ON n.Name = d.Name;
DELETE m FROM dbo.DepartmentMonthlyMetrics m JOIN dbo.Departments d ON d.Id = m.DepartmentId JOIN @Names n ON n.Name = d.Name;

;WITH K AS (
    SELECT TOP (24) CAST(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS INT) AS k FROM sys.all_objects
),
M AS (
    SELECT k, DATEADD(MONTH, -k, @CurMonth) AS ms, EOMONTH(DATEADD(MONTH, -k, @CurMonth)) AS me FROM K
),
Days AS (
    SELECT TOP (800) DATEADD(DAY, CAST(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS INT) - 1, DATEADD(MONTH, -24, @CurMonth)) AS d
    FROM sys.all_objects a CROSS JOIN sys.all_objects b
),
WD AS (
    SELECT M.k, COUNT(*) AS wd
    FROM M JOIN Days ON Days.d >= M.ms AND Days.d <= M.me
    WHERE DATEDIFF(DAY, '19000101', Days.d) % 7 < 5          -- 0=segunda ... 4=sexta
    GROUP BY M.k
),
DM AS (
    SELECT d.Id AS DeptId, d.Name, M.k, M.ms, M.me
    FROM dbo.Departments d JOIN @Names n ON n.Name = d.Name CROSS JOIN M
),
HC AS (
    SELECT DM.DeptId, DM.Name, DM.k, DM.ms,
        (SELECT COUNT(*) FROM dbo.Employees e
          WHERE e.Department = DM.Name AND e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
            AND e.HireDate <= DM.me AND (e.TerminationDate IS NULL OR e.TerminationDate > DM.me)) AS Headcount,
        (SELECT COUNT(*) FROM dbo.Employees e
          WHERE e.Department = DM.Name AND e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
            AND e.HireDate >= DM.ms AND e.HireDate <= DM.me) AS Hires,
        (SELECT COUNT(*) FROM dbo.Employees e
          WHERE e.Department = DM.Name AND e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
            AND e.TerminationDate >= DM.ms AND e.TerminationDate <= DM.me) AS Terminations
    FROM DM
)
INSERT INTO dbo.DepartmentMonthlyMetrics (DepartmentId, MonthRef, Headcount, WorkDays, AbsenceDays, OvertimeHours, Hires, Terminations)
SELECT HC.DeptId, HC.ms, HC.Headcount, WD.wd,
       CAST(ROUND(HC.Headcount * WD.wd * p.ab / 100.0 * p.nz1, 1) AS DECIMAL(8,1)),
       CAST(ROUND(HC.Headcount * p.ot * p.nz2, 1) AS DECIMAL(10,1)),
       HC.Hires, HC.Terminations
FROM HC
JOIN WD ON WD.k = HC.k
CROSS APPLY (SELECT
      CAST(CASE HC.Name
            WHEN N'Atendimento' THEN 3.5 + CASE WHEN HC.k <= 5 THEN (6 - HC.k) * 0.7 ELSE 0 END
            WHEN N'Logística'   THEN 3.0
            WHEN N'Comercial'   THEN 3.2 + CASE WHEN HC.k <= 5 THEN (6 - HC.k) * 0.55 ELSE 0 END
            WHEN N'Tecnologia'  THEN 2.2
            WHEN N'Financeiro'  THEN 2.5
            WHEN N'RH'          THEN 2.0
            ELSE 2.8 END AS FLOAT) AS ab,
      CAST(CASE HC.Name
            WHEN N'Atendimento' THEN 8 + CASE WHEN HC.k <= 5 THEN (6 - HC.k) * 2.2 ELSE 0 END
            WHEN N'Logística'   THEN CASE WHEN HC.k <= 8 THEN 21 ELSE 12 END
            WHEN N'Comercial'   THEN 9
            WHEN N'Tecnologia'  THEN 6
            WHEN N'Financeiro'  THEN CASE WHEN HC.k BETWEEN 8 AND 14 THEN 18 ELSE 7 END
            WHEN N'RH'          THEN 4
            ELSE 10 END AS FLOAT) AS ot,
      CAST(0.97 + (ABS(CHECKSUM(HC.DeptId * 100 + HC.k) % 1000000) % 7) / 100.0 AS FLOAT)         AS nz1,
      CAST(0.97 + (ABS(CHECKSUM(HC.DeptId * 100 + HC.k + 5000) % 1000000) % 7) / 100.0 AS FLOAT)  AS nz2) p
WHERE HC.Headcount > 0;

/* ---------- Gabarito dos alertas esperados ---------- */
DELETE FROM dbo.SeedExpectedAlerts;
INSERT INTO dbo.SeedExpectedAlerts (Department, RuleCode, ExpectedRisk, Expectation) VALUES
 (N'Atendimento', N'ABS_OT_UP',          N'alto',     N'Faltas e horas extras sobem juntas nos últimos 5 meses'),
 (N'Atendimento', N'TRIPLE_RISK',        N'alto',     N'Faltas, horas extras e turnover sobem no mesmo trimestre'),
 (N'Logística',   N'OT_CHRONIC',         N'moderado', N'Horas extras altas nos últimos 8 meses'),
 (N'Comercial',   N'ABS_LEADS_TURNOVER', N'alto',     N'Absenteísmo sobe e o turnover sobe 2 meses depois'),
 (N'Tecnologia',  NULL, NULL, N'Estável: NENHUM alerta de risco alto'),
 (N'RH',          NULL, NULL, N'Estável: NENHUM alerta de risco alto'),
 (N'Financeiro',  NULL, NULL, N'Horas extras altas há 8 a 14 meses, já normalizadas: NENHUM alerta atual (teste de falso positivo)'),
 (N'Projetos Especiais', NULL, NULL, N'Só 5 meses de dados: previsões com confiabilidade BAIXA e aviso na tela');

COMMIT TRANSACTION;
PRINT N'S02 concluído com sucesso.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH
GO

/* Conferência: meses por departamento e indicadores dos últimos 3 meses fechados */
SELECT d.Name AS Departamento, COUNT(*) AS Meses,
       MIN(m.MonthRef) AS Primeiro, MAX(m.MonthRef) AS Ultimo
FROM dbo.DepartmentMonthlyMetrics m JOIN dbo.Departments d ON d.Id = m.DepartmentId
WHERE d.Name IN (N'Atendimento', N'Tecnologia', N'Financeiro', N'Comercial', N'Logística', N'RH', N'Projetos Especiais')
GROUP BY d.Name ORDER BY d.Name;

SELECT d.Name AS Departamento, m.MonthRef, m.Headcount, m.AbsenceRate, m.OvertimePerEmployee, m.TurnoverRate
FROM dbo.DepartmentMonthlyMetrics m JOIN dbo.Departments d ON d.Id = m.DepartmentId
WHERE d.Name IN (N'Atendimento', N'Comercial', N'Logística')
  AND m.MonthRef >= DATEADD(MONTH, -6, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
ORDER BY d.Name, m.MonthRef;
SET NOEXEC OFF;
GO
