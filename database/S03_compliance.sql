/* =====================================================================
   S03_compliance.sql  |  Catálogo de regras, 29 registros com defeito plantado (27 ocorrências)
                          e eventos eSocial simulados, com GABARITO no banco (SeedExpectedDefects)
   Os defeitos são plantados em colaboradores "saudáveis" distintos (matrículas a partir de S0013).
   Eventos eSocial (50): S-2200 x25 (7 com jornada ausente), S-2230 x12 (2 com fim antes do início),
                         S-2299 x13 (3 com problema de data).
   Regras com base legal (JOB_WEEKLY_HOURS, EMP_MIN_AGE e checklists eSocial) entram com
   SourceVerified = 0: CONFIRA a fonte no texto oficial antes de apresentar como regra.
   Só INSERE regras que ainda não existem (não altera catálogo já criado pelo app).
   Pré-requisito: S01 aplicado.
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO
SET NOCOUNT ON;
SET NOEXEC OFF;
GO

IF OBJECT_ID('dbo.SeedConfig') IS NULL OR OBJECT_ID('dbo.ComplianceRules') IS NULL OR OBJECT_ID('dbo.EsocialEvents') IS NULL
   OR NOT EXISTS (SELECT 1 FROM dbo.Employees WHERE Registration LIKE N'S[0-9][0-9][0-9][0-9]')
BEGIN
    RAISERROR(N'Rode o S01 antes (e confirme que o script 004 da Parte 4 foi aplicado).', 16, 1);
    SET NOEXEC ON;
END
GO

IF OBJECT_ID('dbo.SeedExpectedDefects') IS NULL
CREATE TABLE dbo.SeedExpectedDefects (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    RuleCode     NVARCHAR(40)  NOT NULL,
    EventCode    NVARCHAR(10)  NULL,          -- preenchido nos defeitos de checklist eSocial
    EmployeeId   INT           NOT NULL,
    Registration NVARCHAR(20)  NULL,
    PairKey      NVARCHAR(5)   NULL,          -- identifica o par nas duplicidades
    Note         NVARCHAR(200) NULL
);
GO

IF EXISTS (SELECT 1 FROM dbo.SeedExpectedDefects)
BEGIN
    RAISERROR(N'O S03 já foi aplicado. Rode S00_reset.sql e depois S01 a S06 de novo.', 16, 1);
    SET NOEXEC ON;
END
GO

SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

DECLARE @Today DATE = (SELECT CAST(Value AS DATE) FROM dbo.SeedConfig WHERE KeyName = N'Today');
DECLARE @CurMonth DATE = DATEFROMPARTS(YEAR(@Today), MONTH(@Today), 1);
DECLARE @LastComp CHAR(7) = LEFT(CONVERT(VARCHAR(10), DATEADD(MONTH, -1, @CurMonth), 23), 7);
DECLARE @RhUser INT = (SELECT Id FROM dbo.Users WHERE Email = N'rh.seed@seed.exemplo.com');

/* ---------- Catálogo de regras (só as que faltam) ---------- */
INSERT INTO dbo.ComplianceRules (Code, Category, EventCode, Severity, Title, Description, Guidance, SourceType, SourceReference, SourceVerified)
SELECT v.Code, v.Category, v.EventCode, v.Severity, v.Title, v.Descr, v.Guidance, v.SourceType, v.SourceRef, v.Verified
FROM (VALUES
 (N'EMP_REQ_FIELDS',      N'integridade', NULL, N'alta',  N'Campos obrigatórios ausentes',
  N'O cadastro do colaborador está sem um ou mais campos obrigatórios (nome, CPF, nascimento, admissão, cargo, departamento, salário).',
  N'Abra o cadastro e preencha os campos obrigatórios que estão vazios.', N'interna', N'Regra interna do sistema', 1),
 (N'EMP_CPF_INVALID',     N'integridade', NULL, N'alta',  N'CPF inválido',
  N'O CPF informado não tem os dígitos verificadores corretos ou tem formato inválido.',
  N'Confira o CPF no documento do colaborador e corrija o cadastro.', N'interna', N'Regra interna do sistema', 1),
 (N'EMP_DUP_PERSON',      N'integridade', NULL, N'media', N'Possível duplicidade de cadastro',
  N'Há mais de um registro com o mesmo nome e a mesma data de nascimento.',
  N'Confira se é a mesma pessoa e unifique ou corrija os cadastros.', N'interna', N'Regra interna do sistema', 1),
 (N'EMP_DATES_ORDER',     N'integridade', NULL, N'alta',  N'Datas incoerentes no cadastro',
  N'A data de desligamento é anterior à admissão ou a data de admissão está muito distante no futuro.',
  N'Revise as datas de admissão e desligamento no contrato do colaborador.', N'interna', N'Regra interna do sistema', 1),
 (N'EMP_STATUS_TERM',     N'integridade', NULL, N'media', N'Situação e data de desligamento divergentes',
  N'O status do colaborador não combina com a data de desligamento (desligado sem data, ou ativo com data).',
  N'Ajuste o status ou a data de desligamento para ficarem coerentes.', N'interna', N'Regra interna do sistema', 1),
 (N'PAY_TOTALS',          N'integridade', NULL, N'alta',  N'Totais do holerite não fecham',
  N'O total de proventos ou de descontos do holerite é diferente da soma das rubricas.',
  N'Confira as rubricas do holerite e recalcule os totais.', N'interna', N'Regra interna do sistema', 1),
 (N'PAY_NET_NONPOSITIVE', N'integridade', NULL, N'media', N'Líquido do holerite zerado ou negativo',
  N'O valor líquido do holerite é menor ou igual a zero.',
  N'Verifique os descontos lançados e se o holerite está correto.', N'interna', N'Regra interna do sistema', 1),
 (N'VAC_OVER',            N'integridade', NULL, N'media', N'Férias acima do direito',
  N'Os dias de férias tirados ultrapassam os dias a que o colaborador tem direito no período.',
  N'Confira o período aquisitivo e os dias lançados.', N'interna', N'Regra interna do sistema', 1),
 (N'LEAVE_DATES',         N'integridade', NULL, N'alta',  N'Datas do afastamento incoerentes',
  N'O afastamento termina antes de começar.',
  N'Corrija as datas de início e fim do afastamento.', N'interna', N'Regra interna do sistema', 1),
 (N'LEAVE_OVERLAP',       N'integridade', NULL, N'media', N'Afastamentos sobrepostos',
  N'O colaborador tem afastamentos com períodos que se sobrepõem.',
  N'Revise os períodos e mantenha apenas registros que não se sobreponham.', N'interna', N'Regra interna do sistema', 1),
 (N'JOB_WEEKLY_HOURS',    N'clt',         NULL, N'media', N'Jornada semanal acima do limite',
  N'A jornada semanal cadastrada está acima do limite configurado no sistema.',
  N'Confira a jornada no contrato. O limite usado vem da configuração e deve ser conferido na fonte oficial.',
  N'oficial', N'CLT e Constituição Federal (jornada de trabalho): conferir no texto vigente', 0),
 (N'EMP_MIN_AGE',         N'clt',         NULL, N'alta',  N'Idade na admissão abaixo do mínimo',
  N'A idade do colaborador na data de admissão está abaixo do mínimo configurado no sistema.',
  N'Confira a data de nascimento e a data de admissão. O limite deve ser conferido na fonte oficial.',
  N'oficial', N'Constituição Federal e CLT (idade mínima): conferir no texto vigente', 0),
 (N'ESOCIAL_S2200_CHECKLIST', N'esocial', N'S-2200', N'alta', N'Checklist de pré-envio: admissão (S-2200)',
  N'Faltam informações do cadastro necessárias para o evento de admissão.',
  N'Complete os dados do contrato antes de transmitir o evento. Verificação preventiva do sistema, não substitui a validação oficial do eSocial.',
  N'oficial', N'Leiaute oficial do evento S-2200: conferir no documento oficial', 0),
 (N'ESOCIAL_S2230_CHECKLIST', N'esocial', N'S-2230', N'alta', N'Checklist de pré-envio: afastamento (S-2230)',
  N'O afastamento tem data de fim anterior à data de início.',
  N'Corrija as datas do afastamento antes de transmitir. Verificação preventiva do sistema, não substitui a validação oficial do eSocial.',
  N'oficial', N'Leiaute oficial do evento S-2230: conferir no documento oficial', 0),
 (N'ESOCIAL_S2299_CHECKLIST', N'esocial', N'S-2299', N'alta', N'Checklist de pré-envio: desligamento (S-2299)',
  N'A data de desligamento está ausente ou é anterior à admissão.',
  N'Corrija a data de desligamento antes de transmitir. Verificação preventiva do sistema, não substitui a validação oficial do eSocial.',
  N'oficial', N'Leiaute oficial do evento S-2299: conferir no documento oficial', 0)
) v(Code, Category, EventCode, Severity, Title, Descr, Guidance, SourceType, SourceRef, Verified)
WHERE NOT EXISTS (SELECT 1 FROM dbo.ComplianceRules r WHERE r.Code = v.Code);

/* ---------- Pool de colaboradores saudáveis para receber UM defeito cada ---------- */
SELECT e.Id, e.Registration, ROW_NUMBER() OVER (ORDER BY e.Registration) AS rn
INTO #Pool
FROM dbo.Employees e
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.Status = N'ativo' AND e.ContractType = N'clt'
  AND e.Department <> N'Projetos Especiais' AND CAST(SUBSTRING(e.Registration, 2, 4) AS INT) > 12
  AND e.HireDate <= DATEADD(YEAR, -2, @Today)
  AND EXISTS (SELECT 1 FROM dbo.VacationBalances v WHERE v.EmployeeId = e.Id)
  AND EXISTS (SELECT 1 FROM dbo.Payslips p WHERE p.EmployeeId = e.Id AND p.Competence = @LastComp)
  AND NOT EXISTS (SELECT 1 FROM dbo.Leaves l WHERE l.EmployeeId = e.Id);

IF (SELECT COUNT(*) FROM #Pool) < 29
    THROW 50001, N'Poucos colaboradores elegíveis para os defeitos (preciso de 29). Rode o S01 completo.', 1;

/* ---------- Gabarito (registrado ANTES de alterar, com o mapa rn -> defeito) ---------- */
INSERT INTO dbo.SeedExpectedDefects (RuleCode, EmployeeId, Registration, PairKey, Note)
SELECT m.RuleCode, p.Id, p.Registration, m.PairKey, m.Note
FROM #Pool p
JOIN (VALUES
 (1,  N'EMP_REQ_FIELDS',      NULL, N'CPF ausente'),
 (2,  N'EMP_REQ_FIELDS',      NULL, N'Cargo vazio'),
 (3,  N'EMP_REQ_FIELDS',      NULL, N'Salário ausente'),
 (4,  N'EMP_REQ_FIELDS',      NULL, N'Data de nascimento ausente'),
 (5,  N'EMP_CPF_INVALID',     NULL, N'Dígito verificador errado'),
 (6,  N'EMP_CPF_INVALID',     NULL, N'Todos os dígitos iguais'),
 (7,  N'EMP_CPF_INVALID',     NULL, N'Tamanho errado'),
 (8,  N'EMP_DUP_PERSON',      N'A', N'Original do par A'),
 (9,  N'EMP_DUP_PERSON',      N'A', N'Cópia do par A'),
 (10, N'EMP_DUP_PERSON',      N'B', N'Original do par B'),
 (11, N'EMP_DUP_PERSON',      N'B', N'Cópia do par B'),
 (12, N'EMP_DATES_ORDER',     NULL, N'Desligamento antes da admissão'),
 (13, N'EMP_DATES_ORDER',     NULL, N'Desligamento antes da admissão'),
 (14, N'EMP_DATES_ORDER',     NULL, N'Admissão muito no futuro'),
 (15, N'EMP_STATUS_TERM',     NULL, N'Desligado sem data de desligamento'),
 (16, N'EMP_STATUS_TERM',     NULL, N'Ativo com data de desligamento'),
 (17, N'PAY_TOTALS',          NULL, N'Total de descontos diferente da soma das rubricas'),
 (18, N'PAY_TOTALS',          NULL, N'Total de descontos diferente da soma das rubricas'),
 (19, N'PAY_TOTALS',          NULL, N'Bruto diferente da soma dos proventos'),
 (20, N'PAY_NET_NONPOSITIVE', NULL, N'Líquido zero'),
 (21, N'VAC_OVER',            NULL, N'35 dias tirados'),
 (22, N'VAC_OVER',            NULL, N'35 dias tirados'),
 (23, N'LEAVE_DATES',         NULL, N'Fim antes do início'),
 (24, N'LEAVE_DATES',         NULL, N'Fim antes do início'),
 (25, N'LEAVE_OVERLAP',       NULL, N'Dois afastamentos sobrepostos'),
 (26, N'LEAVE_OVERLAP',       NULL, N'Dois afastamentos sobrepostos'),
 (27, N'JOB_WEEKLY_HOURS',    NULL, N'48 horas semanais'),
 (28, N'JOB_WEEKLY_HOURS',    NULL, N'60 horas semanais'),
 (29, N'EMP_MIN_AGE',         NULL, N'Idade de 12 anos na admissão')
) m(rn, RuleCode, PairKey, Note) ON m.rn = p.rn;

/* ---------- Planta os defeitos ---------- */
UPDATE e SET Cpf = NULL      FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 1;
UPDATE e SET JobTitle = N''  FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 2;
UPDATE e SET BaseSalary = NULL FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 3;
UPDATE e SET BirthDate = NULL  FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 4;

UPDATE e SET Cpf = LEFT(e.Cpf, 10) + CASE RIGHT(RTRIM(e.Cpf), 1) WHEN '0' THEN '1' ELSE '0' END
FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 5;
UPDATE e SET Cpf = '11111111111' FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 6;
UPDATE e SET Cpf = '1234567'     FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 7;

UPDATE e SET FullName = o.FullName, BirthDate = o.BirthDate
FROM dbo.Employees e
JOIN #Pool p  ON p.Id = e.Id
JOIN #Pool po ON po.rn = p.rn - 1
JOIN dbo.Employees o ON o.Id = po.Id
WHERE p.rn IN (9, 11);

UPDATE e SET Status = N'desligado', TerminationDate = DATEADD(DAY, -30, e.HireDate)
FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn IN (12, 13);
UPDATE e SET HireDate = DATEADD(DAY, 400, @Today)
FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 14;

UPDATE e SET Status = N'desligado', TerminationDate = NULL
FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 15;
UPDATE e SET TerminationDate = DATEADD(MONTH, -2, @Today)
FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 16;

UPDATE pay SET TotalDeductions = pay.TotalDeductions + 100
FROM dbo.Payslips pay JOIN #Pool p ON p.Id = pay.EmployeeId WHERE p.rn IN (17, 18) AND pay.Competence = @LastComp;
UPDATE pay SET GrossAmount = pay.GrossAmount + 500
FROM dbo.Payslips pay JOIN #Pool p ON p.Id = pay.EmployeeId WHERE p.rn = 19 AND pay.Competence = @LastComp;

UPDATE pay SET TotalDeductions = pay.GrossAmount
FROM dbo.Payslips pay JOIN #Pool p ON p.Id = pay.EmployeeId WHERE p.rn = 20 AND pay.Competence = @LastComp;
UPDATE it SET Amount = pay.GrossAmount - (SELECT SUM(i2.Amount) FROM dbo.PayslipItems i2
                                         WHERE i2.PayslipId = pay.Id AND i2.Kind = 'D' AND i2.Code <> N'2020')
FROM dbo.PayslipItems it
JOIN dbo.Payslips pay ON pay.Id = it.PayslipId
JOIN #Pool p ON p.Id = pay.EmployeeId
WHERE p.rn = 20 AND pay.Competence = @LastComp AND it.Code = N'2020';

UPDATE v SET DaysTaken = 35 FROM dbo.VacationBalances v JOIN #Pool p ON p.Id = v.EmployeeId WHERE p.rn IN (21, 22);

INSERT INTO dbo.Leaves (EmployeeId, LeaveType, StartDate, EndDate)
SELECT p.Id, N'inss', DATEADD(DAY, -40, @Today), DATEADD(DAY, -60, @Today) FROM #Pool p WHERE p.rn IN (23, 24);
INSERT INTO dbo.Leaves (EmployeeId, LeaveType, StartDate, EndDate)
SELECT p.Id, N'outros', DATEADD(DAY, -100, @Today), DATEADD(DAY, -70, @Today) FROM #Pool p WHERE p.rn IN (25, 26);
INSERT INTO dbo.Leaves (EmployeeId, LeaveType, StartDate, EndDate)
SELECT p.Id, N'outros', DATEADD(DAY, -85, @Today), DATEADD(DAY, -50, @Today) FROM #Pool p WHERE p.rn IN (25, 26);

UPDATE e SET WeeklyHours = 48 FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 27;
UPDATE e SET WeeklyHours = 60 FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 28;
UPDATE e SET BirthDate = DATEADD(YEAR, -12, e.HireDate) FROM dbo.Employees e JOIN #Pool p ON p.Id = e.Id WHERE p.rn = 29;

/* ---------- Eventos eSocial simulados ---------- */
/* S-2200: 25 admissões recentes (os 7 mais antigos ficam sem jornada) */
SELECT TOP (25) e.Id, ROW_NUMBER() OVER (ORDER BY e.HireDate DESC, e.Id) AS rn
INTO #Ev
FROM dbo.Employees e
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.Status = N'ativo'
  AND e.HireDate >= DATEADD(MONTH, -24, @Today) AND e.HireDate <= @Today
  AND NOT EXISTS (SELECT 1 FROM #Pool p WHERE p.Id = e.Id AND p.rn <= 29)
ORDER BY e.HireDate DESC, e.Id;

UPDATE e SET WeeklyHours = NULL FROM dbo.Employees e JOIN #Ev v ON v.Id = e.Id WHERE v.rn >= 19;

INSERT INTO dbo.EsocialEvents (EmployeeId, EventCode, EventDate, Status, ConfirmedBy, ConfirmedAt)
SELECT e.Id, N'S-2200', e.HireDate,
       CASE WHEN v.rn <= 4 THEN N'enviado_simulado' ELSE N'pendente' END,
       CASE WHEN v.rn <= 4 THEN @RhUser END,
       CASE WHEN v.rn <= 4 THEN SYSUTCDATETIME() END
FROM #Ev v JOIN dbo.Employees e ON e.Id = v.Id;

INSERT INTO dbo.SeedExpectedDefects (RuleCode, EventCode, EmployeeId, Registration, Note)
SELECT N'ESOCIAL_S2200_CHECKLIST', N'S-2200', e.Id, e.Registration, N'S-2200: jornada semanal ausente'
FROM #Ev v JOIN dbo.Employees e ON e.Id = v.Id WHERE v.rn >= 19;

/* S-2230: 10 afastamentos saudáveis + 2 com fim antes do início */
INSERT INTO dbo.EsocialEvents (EmployeeId, LeaveId, EventCode, EventDate, Status)
SELECT TOP (10) l.EmployeeId, l.Id, N'S-2230', l.StartDate, N'pendente'
FROM dbo.Leaves l JOIN dbo.Employees e ON e.Id = l.EmployeeId
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]'
  AND (l.EndDate IS NULL OR l.EndDate >= l.StartDate)
  AND NOT EXISTS (SELECT 1 FROM #Pool p WHERE p.Id = e.Id AND p.rn <= 29)
ORDER BY l.Id;

INSERT INTO dbo.EsocialEvents (EmployeeId, LeaveId, EventCode, EventDate, Status)
SELECT l.EmployeeId, l.Id, N'S-2230', l.StartDate, N'pendente'
FROM dbo.Leaves l JOIN #Pool p ON p.Id = l.EmployeeId WHERE p.rn IN (23, 24);

INSERT INTO dbo.SeedExpectedDefects (RuleCode, EventCode, EmployeeId, Registration, Note)
SELECT N'ESOCIAL_S2230_CHECKLIST', N'S-2230', p.Id, p.Registration, N'S-2230: fim antes do início'
FROM #Pool p WHERE p.rn IN (23, 24);

/* S-2299: 10 desligamentos saudáveis + 3 com problema de data */
INSERT INTO dbo.EsocialEvents (EmployeeId, EventCode, EventDate, Status)
SELECT TOP (10) e.Id, N'S-2299', e.TerminationDate, N'pendente'
FROM dbo.Employees e
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.Status = N'desligado'
  AND e.TerminationDate IS NOT NULL AND e.TerminationDate >= e.HireDate
  AND NOT EXISTS (SELECT 1 FROM #Pool p WHERE p.Id = e.Id AND p.rn <= 29)
ORDER BY e.TerminationDate DESC;

INSERT INTO dbo.EsocialEvents (EmployeeId, EventCode, EventDate, Status)
SELECT p.Id, N'S-2299', COALESCE(e.TerminationDate, @Today), N'pendente'
FROM #Pool p JOIN dbo.Employees e ON e.Id = p.Id WHERE p.rn IN (12, 13, 15);

INSERT INTO dbo.SeedExpectedDefects (RuleCode, EventCode, EmployeeId, Registration, Note)
SELECT N'ESOCIAL_S2299_CHECKLIST', N'S-2299', p.Id, p.Registration,
       CASE WHEN p.rn = 15 THEN N'S-2299: desligado sem data' ELSE N'S-2299: desligamento antes da admissão' END
FROM #Pool p WHERE p.rn IN (12, 13, 15);

COMMIT TRANSACTION;
PRINT N'S03 concluído com sucesso.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH
GO

SELECT RuleCode, COUNT(*) AS Registros, COUNT(DISTINCT COALESCE(PairKey, CAST(EmployeeId AS VARCHAR(12)))) AS Ocorrencias
FROM dbo.SeedExpectedDefects GROUP BY RuleCode ORDER BY RuleCode;
SELECT EventCode, COUNT(*) AS Eventos FROM dbo.EsocialEvents e
JOIN dbo.Employees emp ON emp.Id = e.EmployeeId WHERE emp.Registration LIKE N'S[0-9][0-9][0-9][0-9]' GROUP BY EventCode;
SET NOEXEC OFF;
GO
