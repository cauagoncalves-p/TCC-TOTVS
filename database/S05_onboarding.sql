/* =====================================================================
   S05_onboarding.sql  |  10 casos de onboarding prontos (sem chamar a IA), no formato { cadastro, perfil }
     3 aprovados (2 por PDF, 1 manual) ligados a colaboradores reais do S01 (um com perfil profissional)
     3 pendentes por PDF: sem problemas | CPF inválido | campos ausentes
     2 rascunhos manuais incompletos | 2 rejeitados (um por PDF, um manual)
   Os PDFs de verdade para testar o upload e o caso com conflito ou do tipo "outro" você cria pela tela.
   Pré-requisitos: S01 e S03 aplicados e scripts 005 e 006 (Partes 2B e 2C).
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO
SET NOCOUNT ON;
SET NOEXEC OFF;
GO

IF OBJECT_ID('dbo.SeedConfig') IS NULL OR OBJECT_ID('dbo.OnboardingCases') IS NULL OR OBJECT_ID('dbo.OnboardingDocuments') IS NULL
   OR OBJECT_ID('dbo.EmployeeProfiles') IS NULL OR OBJECT_ID('dbo.SeedExpectedDefects') IS NULL
   OR COL_LENGTH('dbo.OnboardingCases', 'Origin') IS NULL
   OR NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = N'rh.seed@seed.exemplo.com')
BEGIN
    RAISERROR(N'Pré-requisitos ausentes: rode S01 e S03 e aplique os scripts 005 e 006.', 16, 1);
    SET NOEXEC ON;
END
GO

IF EXISTS (SELECT 1 FROM dbo.OnboardingCases c JOIN dbo.Users u ON u.Id = c.CreatedBy WHERE u.Email = N'rh.seed@seed.exemplo.com')
BEGIN
    RAISERROR(N'O S05 já foi aplicado. Rode S00_reset.sql e depois S01 a S06 de novo.', 16, 1);
    SET NOEXEC ON;
END
GO

SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

DECLARE @Today DATE = (SELECT CAST(Value AS DATE) FROM dbo.SeedConfig WHERE KeyName = N'Today');
DECLARE @Rh  INT = (SELECT Id FROM dbo.Users WHERE Email = N'rh.seed@seed.exemplo.com');
DECLARE @Rh2 INT = (SELECT Id FROM dbo.Users WHERE Email = N'rh2.seed@seed.exemplo.com');
DECLARE @Hire NVARCHAR(10) = CONVERT(NVARCHAR(10), DATEADD(DAY, 14, @Today), 23);

/* ---------- Aprovados: 3 colaboradores recentes e saudáveis do S01 ---------- */
SELECT TOP (3) e.Id, e.Registration, ROW_NUMBER() OVER (ORDER BY e.HireDate DESC, e.Id) AS rn
INTO #Ap
FROM dbo.Employees e
WHERE e.Registration LIKE N'S[0-9][0-9][0-9][0-9]' AND e.Status = N'ativo'
  AND NOT EXISTS (SELECT 1 FROM dbo.SeedExpectedDefects x WHERE x.EmployeeId = e.Id)
ORDER BY e.HireDate DESC, e.Id;

INSERT INTO dbo.OnboardingCases
    (Status, SourceFileName, ExtractedJson, ReviewedJson, ValidationIssues, CreatedBy, CreatedAt, ReviewedBy, ReviewedAt, EmployeeId, RejectionReason, Origin)
SELECT N'aprovado',
       CASE WHEN a.rn <= 2 THEN N'seed_ficha_' + a.Registration + N'.pdf' END,
       CASE WHEN a.rn <= 2 THEN j.Cad ELSE N'{"cadastro":{},"perfil":{}}' END,
       j.Cad, N'[]',
       @Rh, DATEADD(DAY, -(10 + a.rn), SYSUTCDATETIME()), @Rh, DATEADD(DAY, -(9 + a.rn), SYSUTCDATETIME()),
       a.Id, NULL,
       CASE WHEN a.rn <= 2 THEN N'pdf' ELSE N'manual' END
FROM #Ap a
JOIN dbo.Employees e ON e.Id = a.Id
JOIN dbo.Users u ON u.Id = e.UserId
CROSS APPLY (SELECT CONCAT(N'{"cadastro":',
    (SELECT e.FullName AS fullName, RTRIM(e.Cpf) AS cpf, e.Rg AS rg, CONVERT(VARCHAR(10), e.BirthDate, 23) AS birthDate,
            u.Email AS email, e.Phone AS phone, e.ZipCode AS zipCode, e.Street AS street, e.City AS city, e.State AS state,
            e.JobTitle AS jobTitle, e.Department AS department, CONVERT(VARCHAR(10), e.HireDate, 23) AS hireDate,
            e.BaseSalary AS baseSalary
     FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
    N',"perfil":{}}') AS Cad) j;

INSERT INTO dbo.EmployeeProfiles (EmployeeId, ProfileJson, SourceCaseId)
SELECT a.Id,
       N'{"education":[{"course":"Análise e Desenvolvimento de Sistemas","institution":"Faculdade Exemplo","level":"graduacao","startDate":"2021-02","endDate":"2023-12","ongoing":false}],"experience":[{"role":"Analista Júnior","company":"Empresa Exemplo","startDate":"2022-01","endDate":null,"current":true,"duties":["Atendimento a usuários","Elaboração de relatórios"]}],"skills":["SQL","Excel","Comunicação"],"certifications":[],"languages":[{"language":"Inglês","level":"intermediário"}],"projects":[]}',
       c.Id
FROM #Ap a JOIN dbo.OnboardingCases c ON c.EmployeeId = a.Id
WHERE a.rn = 1;

/* ---------- Pendentes, rascunhos e rejeitados ---------- */
CREATE TABLE #C (Status NVARCHAR(20), FileName NVARCHAR(255), Extracted NVARCHAR(MAX), Reviewed NVARCHAR(MAX),
                 Issues NVARCHAR(MAX), Origin NVARCHAR(10), Reason NVARCHAR(300), Reviewer INT, AgeDays INT);

/* P1: pendente por PDF, sem problemas */
INSERT INTO #C VALUES (N'pendente_revisao', N'seed_ficha_mariana.pdf',
  CONCAT(N'{"cadastro":{"fullName":"Mariana Teixeira Lopes","cpf":"', dbo.fn_SeedCpf(9001),
         N'","rg":"4821973","birthDate":"1995-03-18","email":"mariana.lopes@exemplo.com","phone":"11987650001","zipCode":"01310100","street":"Rua das Acácias, 120","city":"São Paulo","state":"SP","jobTitle":"Analista de Dados","department":"Tecnologia","hireDate":"',
         @Hire, N'","baseSalary":7800},"perfil":{}}'),
  NULL, N'[]', N'pdf', NULL, NULL, 1);

/* P2: pendente por PDF, CPF inválido */
INSERT INTO #C VALUES (N'pendente_revisao', N'seed_ficha_diego.pdf',
  CONCAT(N'{"cadastro":{"fullName":"Diego Ramos Barbosa","cpf":"12345678900","rg":"3920184","birthDate":"1990-09-03","email":"diego.barbosa@exemplo.com","phone":"11987650002","zipCode":"13010000","street":"Rua do Comércio, 45","city":"Campinas","state":"SP","jobTitle":"Desenvolvedor","department":"Tecnologia","hireDate":"',
         @Hire, N'","baseSalary":6900},"perfil":{}}'),
  NULL, N'[{"field":"cpf","code":"CPF_INVALID","message":"CPF inválido","kind":"erro"}]', N'pdf', NULL, NULL, 2);

/* P3: pendente por PDF, campos ausentes */
INSERT INTO #C VALUES (N'pendente_revisao', N'seed_ficha_leticia.pdf',
  CONCAT(N'{"cadastro":{"fullName":"Letícia Moraes Nunes","cpf":"', dbo.fn_SeedCpf(9003),
         N'","birthDate":"1998-11-22","jobTitle":"Analista Financeiro","hireDate":"', @Hire, N'"},"perfil":{}}'),
  NULL, N'[{"field":"email","code":"REQUIRED","message":"Campo obrigatório","kind":"pendente"},{"field":"department","code":"REQUIRED","message":"Campo obrigatório","kind":"pendente"},{"field":"baseSalary","code":"REQUIRED","message":"Campo obrigatório","kind":"pendente"}]',
  N'pdf', NULL, NULL, 1);

/* D1 e D2: rascunhos manuais incompletos */
INSERT INTO #C VALUES (N'pendente_revisao', NULL, N'{"cadastro":{},"perfil":{}}',
  N'{"cadastro":{"fullName":"Otávio Pinto Correia","jobTitle":"Conferente"},"perfil":{}}',
  N'[{"field":"cpf","code":"REQUIRED","message":"Campo obrigatório","kind":"pendente"},{"field":"email","code":"REQUIRED","message":"Campo obrigatório","kind":"pendente"},{"field":"department","code":"REQUIRED","message":"Campo obrigatório","kind":"pendente"},{"field":"hireDate","code":"REQUIRED","message":"Campo obrigatório","kind":"pendente"}]',
  N'manual', NULL, NULL, 2);
INSERT INTO #C VALUES (N'pendente_revisao', NULL, N'{"cadastro":{},"perfil":{}}',
  CONCAT(N'{"cadastro":{"fullName":"Natália Cavalcanti Dias","cpf":"', dbo.fn_SeedCpf(9005), N'","email":"natalia.dias@exemplo.com"},"perfil":{}}'),
  N'[{"field":"jobTitle","code":"REQUIRED","message":"Campo obrigatório","kind":"pendente"},{"field":"department","code":"REQUIRED","message":"Campo obrigatório","kind":"pendente"},{"field":"hireDate","code":"REQUIRED","message":"Campo obrigatório","kind":"pendente"}]',
  N'manual', NULL, NULL, 1);

/* R1 e R2: rejeitados */
INSERT INTO #C VALUES (N'rejeitado', N'seed_ficha_rejeitada.pdf',
  N'{"cadastro":{"fullName":"Renato Alves Souza"},"perfil":{}}', NULL, N'[]', N'pdf',
  N'Documento ilegível e sem possibilidade de conferência dos dados.', @Rh2, 6);
INSERT INTO #C VALUES (N'rejeitado', NULL, N'{"cadastro":{},"perfil":{}}',
  N'{"cadastro":{"fullName":"Helena Gomes Ribeiro","jobTitle":"Analista de RH"},"perfil":{}}', N'[]', N'manual',
  N'Cadastro duplicado de colaborador já existente.', @Rh2, 4);

INSERT INTO dbo.OnboardingCases
    (Status, SourceFileName, ExtractedJson, ReviewedJson, ValidationIssues, CreatedBy, CreatedAt, ReviewedBy, ReviewedAt, EmployeeId, RejectionReason, Origin)
SELECT c.Status, c.FileName, c.Extracted, c.Reviewed, c.Issues, @Rh, DATEADD(DAY, -c.AgeDays, SYSUTCDATETIME()),
       c.Reviewer, CASE WHEN c.Reviewer IS NOT NULL THEN DATEADD(DAY, -(c.AgeDays - 1), SYSUTCDATETIME()) END,
       NULL, c.Reason, c.Origin
FROM #C c;

/* Um documento (ficha) para cada caso criado por PDF */
INSERT INTO dbo.OnboardingDocuments
    (CaseId, FileName, DocumentType, TypeSource, ExtractionMethod, PageCount, ExtractedJson, EvidenceReport, CreatedBy)
SELECT c.Id, c.SourceFileName, N'ficha_admissao', N'ia', N'pdf_nativo', 1, c.ExtractedJson, NULL, c.CreatedBy
FROM dbo.OnboardingCases c
WHERE c.CreatedBy = @Rh AND c.Origin = N'pdf' AND c.SourceFileName LIKE N'seed[_]%';

COMMIT TRANSACTION;
PRINT N'S05 concluído com sucesso.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH
GO

SELECT Status, Origin, COUNT(*) AS Casos FROM dbo.OnboardingCases c
JOIN dbo.Users u ON u.Id = c.CreatedBy WHERE u.Email = N'rh.seed@seed.exemplo.com'
GROUP BY Status, Origin ORDER BY Status, Origin;
SET NOEXEC OFF;
GO
