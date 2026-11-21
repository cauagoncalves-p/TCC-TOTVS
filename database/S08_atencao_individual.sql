/* =====================================================================
   S08_atencao_individual.sql  |  Frequência mensal e carreira dos colaboradores do seed (12 meses)
   Pré-requisitos: S01 e S03 aplicados e o script 012 (acompanhamento individual).
   O QUE FAZ:
     1) Cria EmployeeMonthlyAttendance (12 meses) seguindo os cenários dos departamentos (S02),
        com variação por pessoa. Meses em afastamento ficam SEM registro (não entram em nenhuma conta).
     2) Cria EmployeeCareerEvents: admissão e reajustes anuais; ~1 em cada 9 colaboradores e as pessoas
        "em atenção" NÃO têm reajuste (estagnação).
     3) Marca 8 pessoas "em atenção" (3 Atendimento, 2 Comercial, 2 Logística, 1 Tecnologia): faltas e
        horas extras SOBEM nos últimos 4 meses.
     4) Grava o GABARITO em SeedExpectedAttention (alta / não aplicável / dados insuficientes).
     5) ATENÇÃO: reconcilia DepartmentMonthlyMetrics (ausências e horas extras dos últimos 12 meses passam
        a ser a SOMA dos registros individuais) e APAGA alertas e previsões dos 7 departamentos
        (gere de novo na plataforma). Faça backup se precisar do estado anterior.
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO
SET NOCOUNT ON;
SET NOEXEC OFF;
GO

IF OBJECT_ID('dbo.SeedConfig') IS NULL OR OBJECT_ID('dbo.SeedExpectedDefects') IS NULL
   OR OBJECT_ID('dbo.EmployeeMonthlyAttendance') IS NULL OR OBJECT_ID('dbo.EmployeeCareerEvents') IS NULL
   OR OBJECT_ID('dbo.Leaves') IS NULL
BEGIN
    RAISERROR(N'Pré-requisitos ausentes: rode S01 e S03 e aplique o script 012.', 16, 1);
    SET NOEXEC ON;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EmployeeMonthlyAttendance a JOIN dbo.Employees e ON e.Id = a.EmployeeId
           WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]')
BEGIN
    RAISERROR(N'O S08 já foi aplicado. Rode S00_reset.sql e depois S01 a S08 de novo.', 16, 1);
    SET NOEXEC ON;
END
GO

IF OBJECT_ID('dbo.SeedExpectedAttention') IS NULL
CREATE TABLE dbo.SeedExpectedAttention (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId    INT NOT NULL,
    Registration  NVARCHAR(20) NULL,
    ExpectedLevel NVARCHAR(15) NOT NULL,      -- alta | nao_aplicavel | insuficiente
    Note          NVARCHAR(300) NULL
);
GO

SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

DECLARE @Today DATE = (SELECT CAST(Value AS DATE) FROM dbo.SeedConfig WHERE KeyName = N'Today');
DECLARE @CurMonth DATE = DATEFROMPARTS(YEAR(@Today), MONTH(@Today), 1);

/* ---------- 12 meses fechados e seus dias úteis ---------- */
;WITH K AS (
    SELECT TOP (12) CAST(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS INT) AS k FROM sys.all_objects
), M AS (
    SELECT k, DATEADD(MONTH, -k, @CurMonth) AS ms, EOMONTH(DATEADD(MONTH, -k, @CurMonth)) AS me FROM K
), Days AS (
    SELECT TOP (400) DATEADD(DAY, CAST(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS INT) - 1, DATEADD(MONTH, -12, @CurMonth)) AS d
    FROM sys.all_objects a CROSS JOIN sys.all_objects b
)
SELECT M.k, M.ms, M.me, COUNT(*) AS wd
INTO #M
FROM M JOIN Days ON Days.d >= M.ms AND Days.d <= M.me
WHERE DATEDIFF(DAY, '19000101', Days.d) % 7 < 5
GROUP BY M.k, M.ms, M.me;

/* ---------- Pessoas "em atenção" (sinais crescentes nos últimos 4 meses) ---------- */
;WITH C AS (
    SELECT e.Id, e.Department AS Dept,
           ROW_NUMBER() OVER (PARTITION BY e.Department ORDER BY e.Registration DESC) AS rk
    FROM dbo.Employees e
    WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.Status = N'ativo' AND e.ContractType = N'clt'
      AND e.Department IN (N'Atendimento', N'Comercial', N'Logística', N'Tecnologia')
      AND e.HireDate <= DATEADD(YEAR, -2, @Today)
      AND CAST(SUBSTRING(e.Registration, 2, 4) AS INT) > 12
      AND NOT EXISTS (SELECT 1 FROM dbo.SeedExpectedDefects x WHERE x.EmployeeId = e.Id)
      AND NOT EXISTS (SELECT 1 FROM dbo.Leaves l WHERE l.EmployeeId = e.Id)
)
SELECT Id, Dept INTO #Hot FROM C
WHERE (Dept = N'Atendimento' AND rk <= 3) OR (Dept = N'Comercial' AND rk <= 2)
   OR (Dept = N'Logística' AND rk <= 2)   OR (Dept = N'Tecnologia' AND rk <= 1);

/* ---------- Frequência mensal (meses em afastamento ficam sem registro) ---------- */
INSERT INTO dbo.EmployeeMonthlyAttendance (EmployeeId, MonthRef, WorkDays, AbsenceDays, OvertimeHours)
SELECT e.Id, m.ms, m.wd,
       CAST(CASE WHEN t.expAbs + p.u >= m.wd THEN m.wd ELSE FLOOR(t.expAbs + p.u) END AS DECIMAL(4,1)),
       CAST(ROUND(t.expOt, 1) AS DECIMAL(6,1))
FROM dbo.Employees e
CROSS JOIN #M m
LEFT JOIN #Hot h ON h.Id = e.Id
CROSS APPLY (SELECT
      CAST(CASE e.Department
            WHEN N'Atendimento' THEN 3.5 + CASE WHEN m.k <= 5 THEN (6 - m.k) * 0.7 ELSE 0 END
            WHEN N'Logística'   THEN 3.0
            WHEN N'Comercial'   THEN 3.2 + CASE WHEN m.k <= 5 THEN (6 - m.k) * 0.55 ELSE 0 END
            WHEN N'Tecnologia'  THEN 2.2
            WHEN N'Financeiro'  THEN 2.5
            WHEN N'RH'          THEN 2.0
            ELSE 2.8 END AS FLOAT) AS ab,
      CAST(CASE e.Department
            WHEN N'Atendimento' THEN 8 + CASE WHEN m.k <= 5 THEN (6 - m.k) * 2.2 ELSE 0 END
            WHEN N'Logística'   THEN CASE WHEN m.k <= 8 THEN 21 ELSE 12 END
            WHEN N'Comercial'   THEN 9
            WHEN N'Tecnologia'  THEN 6
            WHEN N'Financeiro'  THEN 7
            WHEN N'RH'          THEN 4
            ELSE 10 END AS FLOAT) AS ot,
      CAST(0.4 + (ABS(CHECKSUM(e.Id * 7 + 1) % 1000000) % 121) / 100.0 AS FLOAT) AS f,
      CAST((ABS(CHECKSUM(e.Id * 131 + m.k * 17 + 3) % 1000000) % 1000) / 1000.0 AS FLOAT) AS u,
      CAST(CASE WHEN h.Id IS NOT NULL AND m.k <= 4 THEN (5 - m.k) * 1.0 ELSE 1.0 END AS FLOAT) AS bAbs,
      CAST(CASE WHEN h.Id IS NOT NULL AND m.k <= 4 THEN 1.0 + (5 - m.k) * 0.3 ELSE 1.0 END AS FLOAT) AS bOt,
      CAST(0.97 + (ABS(CHECKSUM(e.Id * 31 + m.k) % 1000000) % 7) / 100.0 AS FLOAT) AS nz) p
CROSS APPLY (SELECT m.wd * p.ab / 100.0 * p.f * p.bAbs AS expAbs,
                    p.ot * p.f * p.bOt * p.nz AS expOt) t
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
  AND e.HireDate <= m.me AND (e.TerminationDate IS NULL OR e.TerminationDate >= m.ms)
  AND NOT EXISTS (SELECT 1 FROM dbo.Leaves l
                  WHERE l.EmployeeId = e.Id AND l.StartDate <= m.me AND (l.EndDate IS NULL OR l.EndDate >= m.ms));

/* ---------- Carreira: admissão e reajustes anuais (sem reajuste para estagnados e "em atenção") ---------- */
CREATE TABLE #Y (y INT PRIMARY KEY);
INSERT INTO #Y (y) VALUES (1), (2), (3), (4), (5), (6), (7), (8);

INSERT INTO dbo.EmployeeCareerEvents (EmployeeId, EventDate, EventType, NewJobTitle, Note)
SELECT e.Id, e.HireDate, N'admissao', e.JobTitle, N'Admissão'
FROM dbo.Employees e
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.HireDate <= @Today;

INSERT INTO dbo.EmployeeCareerEvents (EmployeeId, EventDate, EventType, NewJobTitle, Note)
SELECT e.Id, DATEADD(MONTH, e.Id % 6, DATEADD(YEAR, y.y, e.HireDate)), N'reajuste', NULL, N'Reajuste anual'
FROM dbo.Employees e CROSS JOIN #Y y
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.HireDate <= @Today
  AND e.Id % 9 <> 0
  AND NOT EXISTS (SELECT 1 FROM #Hot h WHERE h.Id = e.Id)
  AND DATEADD(MONTH, e.Id % 6, DATEADD(YEAR, y.y, e.HireDate)) <= @Today
  AND (e.TerminationDate IS NULL OR DATEADD(MONTH, e.Id % 6, DATEADD(YEAR, y.y, e.HireDate)) <= e.TerminationDate);

/* ---------- Gabarito ---------- */
DELETE FROM dbo.SeedExpectedAttention;
INSERT INTO dbo.SeedExpectedAttention (EmployeeId, Registration, ExpectedLevel, Note)
SELECT e.Id, e.Registration, N'alta', N'Faltas e horas extras subindo nos últimos 4 meses e sem movimentação de carreira'
FROM #Hot h JOIN dbo.Employees e ON e.Id = h.Id
UNION ALL
SELECT e.Id, e.Registration, N'nao_aplicavel', N'Aprendiz: fora do índice'
FROM dbo.Employees e
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.ContractType = N'aprendiz' AND e.Status = N'ativo'
UNION ALL
SELECT e.Id, e.Registration, N'insuficiente', N'Menos de 90 dias de casa'
FROM dbo.Employees e
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.Status = N'ativo' AND e.ContractType = N'clt'
  AND e.HireDate > DATEADD(DAY, -90, @Today) AND e.HireDate <= @Today;

/* ---------- Reconcilia o agregado dos departamentos com a soma dos individuais ---------- */
IF OBJECT_ID('dbo.DepartmentMonthlyMetrics') IS NOT NULL
BEGIN
    UPDATE mt SET AbsenceDays = x.sa, OvertimeHours = x.so
    FROM dbo.DepartmentMonthlyMetrics mt
    JOIN (SELECT d.Id AS DeptId, a.MonthRef, SUM(a.AbsenceDays) AS sa, SUM(a.OvertimeHours) AS so
          FROM dbo.EmployeeMonthlyAttendance a
          JOIN dbo.Employees e ON e.Id = a.EmployeeId
          JOIN dbo.Departments d ON d.Name = e.Department
          WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
          GROUP BY d.Id, a.MonthRef) x
      ON x.DeptId = mt.DepartmentId AND x.MonthRef = mt.MonthRef;

    IF OBJECT_ID('dbo.Alerts') IS NOT NULL
        DELETE al FROM dbo.Alerts al JOIN dbo.Departments d ON d.Id = al.DepartmentId
        WHERE d.Name IN (N'Atendimento', N'Tecnologia', N'Financeiro', N'Comercial', N'Logística', N'RH', N'Projetos Especiais');
    IF OBJECT_ID('dbo.Predictions') IS NOT NULL
        DELETE pr FROM dbo.Predictions pr JOIN dbo.Departments d ON d.Id = pr.DepartmentId
        WHERE d.Name IN (N'Atendimento', N'Tecnologia', N'Financeiro', N'Comercial', N'Logística', N'RH', N'Projetos Especiais');
END

COMMIT TRANSACTION;
PRINT N'S08 concluído. Gere os alertas e as previsões de novo na plataforma (os antigos foram apagados).';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH
GO

SELECT N'Registros de frequência' AS Item, COUNT(*) AS Qtde FROM dbo.EmployeeMonthlyAttendance a
JOIN dbo.Employees e ON e.Id = a.EmployeeId WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
UNION ALL SELECT N'Eventos de carreira', COUNT(*) FROM dbo.EmployeeCareerEvents c
JOIN dbo.Employees e ON e.Id = c.EmployeeId WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
UNION ALL SELECT N'Gabarito: ' + ExpectedLevel, COUNT(*) FROM dbo.SeedExpectedAttention GROUP BY ExpectedLevel;

/* As 8 pessoas "em atenção": faltas e horas extras dos últimos 3 meses fechados */
SELECT e.Registration, e.FullName, e.Department,
       SUM(a.AbsenceDays) AS Faltas3Meses, CAST(AVG(a.OvertimeHours) AS DECIMAL(6,1)) AS MediaHorasExtras3Meses
FROM dbo.SeedExpectedAttention x
JOIN dbo.Employees e ON e.Id = x.EmployeeId
JOIN dbo.EmployeeMonthlyAttendance a ON a.EmployeeId = e.Id
 AND a.MonthRef >= DATEADD(MONTH, -3, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
WHERE x.ExpectedLevel = N'alta'
GROUP BY e.Registration, e.FullName, e.Department ORDER BY e.Department, e.Registration;
SET NOEXEC OFF;
GO
