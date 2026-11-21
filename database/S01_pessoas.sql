/* =====================================================================
   S01_pessoas.sql  |  Usuários, colaboradores, holerites, férias e afastamentos (FICTÍCIOS)
   Banco: TotvsRhInteligenteDb. Requer SQL Server 2016 SP1+ e scripts 001 a 004 aplicados.
   Cria: 7 departamentos, 154 usuários (4 de equipe + 150 colaboradores), 150 colaboradores
         (matrícula S0001 a S0150), 20 desligados nos últimos 24 meses, 10 aprendizes,
         holerites dos últimos 6 meses, saldos de férias e afastamentos.
   Reprodutível (sem aleatoriedade) e transacional. Datas relativas ao dia em que roda.
   Login de desenvolvimento: usa o MESMO hash de senha do usuário roberta.rh@exemplo.com
   (se não existir, de qualquer usuário com hash bcrypt; senão, rode o setPasswords depois).
   Valores de folha são FICTÍCIOS (não representam cálculo real de folha).
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO
SET NOCOUNT ON;
SET NOEXEC OFF;
GO

IF OBJECT_ID('dbo.Users') IS NULL OR OBJECT_ID('dbo.Employees') IS NULL OR OBJECT_ID('dbo.Payslips') IS NULL
   OR OBJECT_ID('dbo.PayslipItems') IS NULL OR OBJECT_ID('dbo.VacationBalances') IS NULL OR OBJECT_ID('dbo.Leaves') IS NULL
   OR OBJECT_ID('dbo.Departments') IS NULL
   OR COL_LENGTH('dbo.Employees', 'Cpf') IS NULL OR COL_LENGTH('dbo.Employees', 'TerminationDate') IS NULL
   OR COL_LENGTH('dbo.Employees', 'WeeklyHours') IS NULL OR COL_LENGTH('dbo.Employees', 'ContractType') IS NULL
BEGIN
    RAISERROR(N'Pré-requisitos ausentes: aplique os scripts 001 a 004 antes do seed.', 16, 1);
    SET NOEXEC ON;
END
GO

IF EXISTS (SELECT 1 FROM dbo.Employees WHERE Registration LIKE N'S[0-9][0-9][0-9][0-9]')
BEGIN
    RAISERROR(N'O seed já foi aplicado. Rode S00_reset.sql antes de rodar o S01 de novo.', 16, 1);
    SET NOEXEC ON;
END
GO

IF OBJECT_ID('dbo.SeedConfig') IS NULL
    CREATE TABLE dbo.SeedConfig (KeyName NVARCHAR(40) NOT NULL PRIMARY KEY, Value NVARCHAR(200) NOT NULL);
GO
DELETE FROM dbo.SeedConfig WHERE KeyName = N'Today';
INSERT INTO dbo.SeedConfig (KeyName, Value) VALUES (N'Today', CONVERT(NVARCHAR(10), CAST(GETDATE() AS DATE), 23));
GO

/* CPF fictício com dígitos verificadores CORRETOS, gerado a partir de um número */
CREATE OR ALTER FUNCTION dbo.fn_SeedCpf (@n INT)
RETURNS CHAR(11)
AS
BEGIN
    DECLARE @b BIGINT = (CAST(@n AS BIGINT) * 48271 + 123456789) % 1000000000;
    DECLARE @s CHAR(9) = RIGHT('000000000' + CAST(@b AS VARCHAR(9)), 9);
    IF @s IN ('000000000','111111111','222222222','333333333','444444444','555555555','666666666','777777777','888888888','999999999')
        SET @s = '123456789';
    DECLARE @i INT = 1, @sum INT = 0, @d1 INT, @d2 INT;
    WHILE @i <= 9
    BEGIN
        SET @sum = @sum + CAST(SUBSTRING(@s, @i, 1) AS INT) * (11 - @i);
        SET @i = @i + 1;
    END
    SET @d1 = (@sum * 10) % 11;
    IF @d1 = 10 SET @d1 = 0;
    SET @sum = 0;
    SET @i = 1;
    WHILE @i <= 9
    BEGIN
        SET @sum = @sum + CAST(SUBSTRING(@s, @i, 1) AS INT) * (12 - @i);
        SET @i = @i + 1;
    END
    SET @sum = @sum + @d1 * 2;
    SET @d2 = (@sum * 10) % 11;
    IF @d2 = 10 SET @d2 = 0;
    RETURN @s + CAST(@d1 AS CHAR(1)) + CAST(@d2 AS CHAR(1));
END
GO

SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

DECLARE @Today DATE = (SELECT CAST(Value AS DATE) FROM dbo.SeedConfig WHERE KeyName = N'Today');
DECLARE @CurMonth DATE = DATEFROMPARTS(YEAR(@Today), MONTH(@Today), 1);
DECLARE @PEStart DATE = DATEADD(MONTH, -5, @CurMonth);
DECLARE @HashDev NVARCHAR(255) = (SELECT TOP 1 PasswordHash FROM dbo.Users
                                  WHERE PasswordHash LIKE N'$2%'
                                  ORDER BY CASE WHEN Email = N'roberta.rh@exemplo.com' THEN 0 ELSE 1 END, Id);
IF @HashDev IS NULL SET @HashDev = N'TROCAR_HASH_BCRYPT';

/* ---------- Departamentos ---------- */
INSERT INTO dbo.Departments (Name)
SELECT v.Name
FROM (VALUES (N'Atendimento'), (N'Tecnologia'), (N'Financeiro'), (N'Comercial'),
             (N'Logística'), (N'RH'), (N'Projetos Especiais')) v(Name)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Departments d WHERE d.Name = v.Name);

/* ---------- Usuários de equipe (rh e gestor) ---------- */
INSERT INTO dbo.Users (Email, PasswordHash, Role) VALUES
 (N'rh.seed@seed.exemplo.com',      @HashDev, N'rh'),
 (N'rh2.seed@seed.exemplo.com',     @HashDev, N'rh'),
 (N'gestor.seed@seed.exemplo.com',  @HashDev, N'gestor'),
 (N'gestor2.seed@seed.exemplo.com', @HashDev, N'gestor');

/* ---------- Listas de nomes ---------- */
CREATE TABLE #FN (i INT PRIMARY KEY, v NVARCHAR(30) NOT NULL);
INSERT INTO #FN (i, v) VALUES
 (0,N'Ana'),(1,N'Bruno'),(2,N'Carla'),(3,N'Diego'),(4,N'Eduarda'),(5,N'Felipe'),(6,N'Gabriela'),(7,N'Henrique'),
 (8,N'Isabela'),(9,N'João'),(10,N'Karina'),(11,N'Lucas'),(12,N'Mariana'),(13,N'Nicolas'),(14,N'Olívia'),(15,N'Pedro'),
 (16,N'Larissa'),(17,N'Rafael'),(18,N'Sabrina'),(19,N'Thiago'),(20,N'Vitor'),(21,N'Yasmin'),(22,N'Alice'),(23,N'Bernardo'),
 (24,N'Camila'),(25,N'Daniel'),(26,N'Elisa'),(27,N'Fernando'),(28,N'Giovana'),(29,N'Heitor'),(30,N'Helena'),(31,N'Júlia'),
 (32,N'Kevin'),(33,N'Letícia'),(34,N'Murilo'),(35,N'Natália'),(36,N'Otávio'),(37,N'Paula'),(38,N'Renato'),(39,N'Samuel');
CREATE TABLE #LN (i INT PRIMARY KEY, v NVARCHAR(30) NOT NULL);
INSERT INTO #LN (i, v) VALUES
 (0,N'Silva'),(1,N'Santos'),(2,N'Oliveira'),(3,N'Souza'),(4,N'Rodrigues'),(5,N'Ferreira'),(6,N'Alves'),(7,N'Pereira'),
 (8,N'Lima'),(9,N'Gomes'),(10,N'Costa'),(11,N'Ribeiro'),(12,N'Martins'),(13,N'Carvalho'),(14,N'Almeida'),(15,N'Lopes'),
 (16,N'Soares'),(17,N'Fernandes'),(18,N'Vieira'),(19,N'Barbosa'),(20,N'Rocha'),(21,N'Dias'),(22,N'Nascimento'),(23,N'Andrade'),
 (24,N'Moreira'),(25,N'Nunes'),(26,N'Marques'),(27,N'Machado'),(28,N'Mendes'),(29,N'Freitas'),(30,N'Cardoso'),(31,N'Ramos'),
 (32,N'Gonçalves'),(33,N'Santana'),(34,N'Teixeira'),(35,N'Araújo'),(36,N'Pinto'),(37,N'Moraes'),(38,N'Correia'),(39,N'Cavalcanti');

/* ---------- Base dos 150 colaboradores ---------- */
SELECT TOP (150) CAST(ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS INT) AS n
INTO #N FROM sys.all_objects a CROSS JOIN sys.all_objects b;

SELECT n.n, d.Dept,
       CASE WHEN n.n <= 140 AND n.n % 14 = 5 THEN N'aprendiz' ELSE N'clt' END AS Contract,
       r.r1, r.r2, r.r3, r.r4
INTO #E0
FROM #N n
CROSS APPLY (SELECT CASE WHEN n.n > 140 THEN N'Projetos Especiais'
                         ELSE CHOOSE((n.n - 1) % 15 + 1, N'Atendimento', N'Atendimento', N'Tecnologia', N'Tecnologia',
                                     N'Financeiro', N'Comercial', N'Comercial', N'Logística', N'Logística',
                                     N'Atendimento', N'Tecnologia', N'Comercial', N'Financeiro', N'Logística', N'RH') END AS Dept) d
CROSS APPLY (SELECT ABS(CHECKSUM(n.n * 31 + 7) % 1000000000)  AS r1,
                    ABS(CHECKSUM(n.n * 17 + 3) % 1000000000)  AS r2,
                    ABS(CHECKSUM(n.n * 13 + 11) % 1000000000) AS r3,
                    ABS(CHECKSUM(n.n * 29 + 5) % 1000000000)  AS r4) r;

SELECT e0.*,
       CASE WHEN e0.Dept = N'Projetos Especiais' THEN DATEADD(DAY, (e0.n - 141) * 13, @PEStart)
            WHEN e0.n % 4 = 0 THEN DATEADD(DAY, -(30 + e0.r1 % 690), @Today)
            ELSE DATEADD(DAY, -(400 + e0.r1 % 2300), @Today) END AS HireDate
INTO #E FROM #E0 e0;

/* ---------- Usuários dos colaboradores (n <= 12 podem logar; os demais não) ---------- */
INSERT INTO dbo.Users (Email, PasswordHash, Role)
SELECT N'colab.' + RIGHT(N'0000' + CAST(n AS NVARCHAR(4)), 4) + N'@seed.exemplo.com',
       CASE WHEN n <= 12 THEN @HashDev ELSE N'SEM_LOGIN_SEED' END,
       N'colaborador'
FROM #E;

/* ---------- Colaboradores ---------- */
INSERT INTO dbo.Employees
    (UserId, FullName, Registration, JobTitle, Department, HireDate, Status,
     Cpf, Rg, BirthDate, Phone, ZipCode, Street, City, State, BaseSalary, WeeklyHours, ContractType)
SELECT u.Id,
       f.v + N' ' + l1.v + N' ' + l2.v,
       N'S' + RIGHT(N'0000' + CAST(e.n AS NVARCHAR(4)), 4),
       CASE WHEN e.Contract = N'aprendiz' THEN N'Jovem Aprendiz'
            ELSE CASE e.Dept
                WHEN N'Atendimento' THEN CHOOSE(e.r2 % 4 + 1, N'Atendente', N'Analista de Atendimento', N'Supervisor de Atendimento', N'Assistente de Suporte')
                WHEN N'Tecnologia'  THEN CHOOSE(e.r2 % 4 + 1, N'Desenvolvedor', N'Analista de Dados', N'Analista de Suporte', N'Engenheiro de Software')
                WHEN N'Financeiro'  THEN CHOOSE(e.r2 % 3 + 1, N'Analista Financeiro', N'Assistente Contábil', N'Analista de Contas a Pagar')
                WHEN N'Comercial'   THEN CHOOSE(e.r2 % 3 + 1, N'Executivo de Contas', N'Analista Comercial', N'Representante de Vendas')
                WHEN N'Logística'   THEN CHOOSE(e.r2 % 3 + 1, N'Auxiliar de Logística', N'Analista de Logística', N'Conferente')
                WHEN N'RH'          THEN CHOOSE(e.r2 % 3 + 1, N'Analista de RH', N'Assistente de DP', N'Analista de Recrutamento')
                ELSE CHOOSE(e.r2 % 2 + 1, N'Analista de Projetos', N'Coordenador de Projetos') END END,
       e.Dept, e.HireDate, N'ativo',
       dbo.fn_SeedCpf(e.n),
       CAST(10000000 + e.r1 % 80000000 AS NVARCHAR(12)),
       DATEADD(DAY, -(e.r3 % 365),
               DATEADD(YEAR, -(CASE WHEN e.Contract = N'aprendiz' THEN 16 + e.r2 % 7 ELSE 20 + e.r2 % 30 END), e.HireDate)),
       N'(11) 9' + RIGHT(N'0000' + CAST(e.r2 % 10000 AS NVARCHAR(4)), 4) + N'-' + RIGHT(N'0000' + CAST(e.r3 % 10000 AS NVARCHAR(4)), 4),
       CAST(10000000 + e.r4 % 80000000 AS NVARCHAR(8)),
       N'Rua ' + CHOOSE(e.r1 % 6 + 1, N'das Flores', N'das Acácias', N'do Comércio', N'Sete de Setembro', N'XV de Novembro', N'das Palmeiras')
               + N', ' + CAST(10 + e.r2 % 990 AS NVARCHAR(4)),
       CHOOSE(e.r3 % 5 + 1, N'São Paulo', N'Campinas', N'Belo Horizonte', N'Rio de Janeiro', N'Curitiba'),
       CHOOSE(e.r3 % 5 + 1, N'SP', N'SP', N'MG', N'RJ', N'PR'),
       CAST(s.base + (e.r4 % s.rng) / 50 * 50 AS DECIMAL(12,2)),
       CASE WHEN e.Contract = N'aprendiz' THEN 30.0 WHEN e.n % 5 = 0 THEN 40.0 ELSE 44.0 END,
       e.Contract
FROM #E e
JOIN dbo.Users u ON u.Email = N'colab.' + RIGHT(N'0000' + CAST(e.n AS NVARCHAR(4)), 4) + N'@seed.exemplo.com'
JOIN #FN f  ON f.i  = e.r1 % 40
JOIN #LN l1 ON l1.i = e.r2 % 40
JOIN #LN l2 ON l2.i = e.r3 % 40
CROSS APPLY (SELECT CASE WHEN e.Contract = N'aprendiz' THEN 1500
                         ELSE CASE e.Dept WHEN N'Atendimento' THEN 2800 WHEN N'Tecnologia' THEN 6500 WHEN N'Financeiro' THEN 5000
                                          WHEN N'Comercial' THEN 3500 WHEN N'Logística' THEN 2600 WHEN N'RH' THEN 4000 ELSE 5000 END END AS base,
                    CASE WHEN e.Contract = N'aprendiz' THEN 400
                         ELSE CASE e.Dept WHEN N'Atendimento' THEN 1400 WHEN N'Tecnologia' THEN 7500 WHEN N'Financeiro' THEN 4000
                                          WHEN N'Comercial' THEN 4500 WHEN N'Logística' THEN 1900 WHEN N'RH' THEN 4000 ELSE 4000 END END AS rng) s;

/* ---------- Desligamentos (20 nos últimos 24 meses), coerentes com os cenários ---------- */
CREATE TABLE #TermSpec (Dept NVARCHAR(50) NOT NULL, K INT NOT NULL, Cnt INT NOT NULL);
INSERT INTO #TermSpec (Dept, K, Cnt) VALUES
 (N'Atendimento', 12, 1), (N'Atendimento', 6, 1), (N'Atendimento', 3, 1), (N'Atendimento', 2, 2), (N'Atendimento', 1, 3),
 (N'Comercial', 10, 1), (N'Comercial', 3, 2), (N'Comercial', 2, 2), (N'Comercial', 1, 1),
 (N'Logística', 15, 1), (N'Logística', 8, 1),
 (N'Tecnologia', 18, 1), (N'Tecnologia', 5, 1),
 (N'Financeiro', 11, 1), (N'RH', 14, 1);

;WITH Exp AS (
    SELECT s.Dept, s.K, ROW_NUMBER() OVER (PARTITION BY s.Dept ORDER BY s.K DESC) AS rk
    FROM #TermSpec s JOIN #N c ON c.n <= s.Cnt
), Cand AS (
    SELECT e.Id, e.Department AS Dept, ROW_NUMBER() OVER (PARTITION BY e.Department ORDER BY e.Registration DESC) AS rk
    FROM dbo.Employees e
    WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.ContractType = N'clt'
      AND e.Department <> N'Projetos Especiais' AND CAST(SUBSTRING(e.Registration, 2, 4) AS INT) > 12
)
UPDATE e
SET Status = N'desligado',
    TerminationDate = t.d,
    HireDate = DATEADD(DAY, -(240 + ABS(CHECKSUM(e.Id * 3 + 2) % 1000000) % 1200), t.d)
FROM dbo.Employees e
JOIN Cand c ON c.Id = e.Id
JOIN Exp x ON x.Dept = c.Dept AND x.rk = c.rk
CROSS APPLY (SELECT DATEADD(DAY, 4 + ABS(CHECKSUM(e.Id * 7 + 1) % 1000000) % 20, DATEADD(MONTH, -x.K, @CurMonth)) AS d) t;

UPDATE dbo.Employees
SET BirthDate = DATEADD(YEAR, -(24 + ABS(CHECKSUM(Id * 5 + 9) % 1000000) % 20), HireDate)
WHERE Status = N'desligado' AND Registration LIKE N'S[0-9][0-9][0-9][0-9]';

/* ---------- Holerites dos últimos 6 meses (valores fictícios) ---------- */
INSERT INTO dbo.Payslips (EmployeeId, Competence, GrossAmount, TotalDeductions)
SELECT e.Id, LEFT(CONVERT(VARCHAR(10), m.ms, 23), 7), e.BaseSalary,
       ROUND(e.BaseSalary * 0.09, 2) + ROUND(e.BaseSalary * 0.06, 2) + CASE WHEN e.Id % 3 = 0 THEN 120.00 ELSE 0 END
FROM dbo.Employees e
CROSS JOIN (SELECT DATEADD(MONTH, -k.n, @CurMonth) AS ms FROM #N k WHERE k.n BETWEEN 1 AND 6) m
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
  AND e.HireDate <= EOMONTH(m.ms)
  AND (e.TerminationDate IS NULL OR e.TerminationDate >= m.ms);

INSERT INTO dbo.PayslipItems (PayslipId, Code, Description, Kind, Amount)
SELECT p.Id, N'1000', N'Salário base', 'P', p.GrossAmount
FROM dbo.Payslips p JOIN dbo.Employees e ON e.Id = p.EmployeeId
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
UNION ALL
SELECT p.Id, N'2010', N'INSS', 'D', ROUND(p.GrossAmount * 0.09, 2)
FROM dbo.Payslips p JOIN dbo.Employees e ON e.Id = p.EmployeeId
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
UNION ALL
SELECT p.Id, N'2020', N'Vale-transporte', 'D', ROUND(p.GrossAmount * 0.06, 2)
FROM dbo.Payslips p JOIN dbo.Employees e ON e.Id = p.EmployeeId
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
UNION ALL
SELECT p.Id, N'2030', N'Coparticipação plano de saúde', 'D', 120.00
FROM dbo.Payslips p JOIN dbo.Employees e ON e.Id = p.EmployeeId
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.Id % 3 = 0;

/* ---------- Saldos de férias (quem tem mais de 1 ano de casa) ---------- */
INSERT INTO dbo.VacationBalances (EmployeeId, PeriodStart, PeriodEnd, DaysEntitled, DaysTaken)
SELECT e.Id, ps.d, DATEADD(DAY, -1, DATEADD(YEAR, 1, ps.d)), 30,
       CHOOSE(ABS(CHECKSUM(e.Id * 11 + 4) % 1000000) % 4 + 1, 0, 10, 15, 20)
FROM dbo.Employees e
CROSS APPLY (SELECT DATEFROMPARTS(YEAR(@Today) - 1, MONTH(e.HireDate), 1) AS d) ps
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.Status = N'ativo'
  AND e.HireDate <= DATEADD(YEAR, -1, @Today);

/* ---------- Afastamentos (cerca de 1 em cada 5 colaboradores elegíveis) ---------- */
;WITH L AS (
    SELECT e.Id, ROW_NUMBER() OVER (ORDER BY e.Id) AS rn
    FROM dbo.Employees e
    WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.Status = N'ativo' AND e.HireDate <= DATEADD(YEAR, -1, @Today)
)
INSERT INTO dbo.Leaves (EmployeeId, LeaveType, StartDate, EndDate)
SELECT L.Id,
       CHOOSE(L.rn % 4 + 1, N'inss', N'maternidade', N'paternidade', N'outros'),
       st.d,
       CASE WHEN L.rn % 10 = 1 THEN NULL
            ELSE DATEADD(DAY, 10 + ABS(CHECKSUM(L.Id * 23 + 6) % 1000000) % 60, st.d) END
FROM L
CROSS APPLY (SELECT DATEADD(DAY, -(30 + ABS(CHECKSUM(L.Id * 19 + 2) % 1000000) % 300), @Today) AS d) st
WHERE L.rn % 5 = 1;

COMMIT TRANSACTION;
PRINT N'S01 concluído com sucesso.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH
GO

SELECT N'Usuários do seed' AS Item, COUNT(*) AS Qtde FROM dbo.Users WHERE Email LIKE N'%@seed.exemplo.com'
UNION ALL SELECT N'Colaboradores', COUNT(*) FROM dbo.Employees WHERE Registration LIKE N'S[0-9][0-9][0-9][0-9]'
UNION ALL SELECT N'  ativos', COUNT(*) FROM dbo.Employees WHERE Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND Status = N'ativo'
UNION ALL SELECT N'  desligados', COUNT(*) FROM dbo.Employees WHERE Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND Status = N'desligado'
UNION ALL SELECT N'  aprendizes', COUNT(*) FROM dbo.Employees WHERE Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND ContractType = N'aprendiz'
UNION ALL SELECT N'Holerites', COUNT(*) FROM dbo.Payslips p JOIN dbo.Employees e ON e.Id = p.EmployeeId WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
UNION ALL SELECT N'Saldos de férias', COUNT(*) FROM dbo.VacationBalances v JOIN dbo.Employees e ON e.Id = v.EmployeeId WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
UNION ALL SELECT N'Afastamentos', COUNT(*) FROM dbo.Leaves l JOIN dbo.Employees e ON e.Id = l.EmployeeId WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]';
SET NOEXEC OFF;
GO
