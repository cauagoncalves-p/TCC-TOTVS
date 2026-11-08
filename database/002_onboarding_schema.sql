/* =====================================================================
   002_onboarding_schema.sql  |  Parte 2: Onboarding com extração por IA
   Banco: TotvsRhInteligenteDb. Idempotente. Dados FICTÍCIOS.
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO

/* ---------- Dados cadastrais completos do colaborador ---------- */
IF COL_LENGTH('dbo.Employees', 'Cpf') IS NULL
ALTER TABLE dbo.Employees ADD
    Cpf           CHAR(11)      NULL,   -- só dígitos
    Rg            NVARCHAR(20)  NULL,
    BirthDate     DATE          NULL,
    Phone         NVARCHAR(20)  NULL,
    PersonalEmail NVARCHAR(150) NULL,
    ZipCode       CHAR(8)       NULL,   -- só dígitos
    Street        NVARCHAR(150) NULL,
    City          NVARCHAR(100) NULL,
    State         CHAR(2)       NULL,
    BaseSalary    DECIMAL(12,2) NULL;
GO

/* CPF único (ignora linhas sem CPF) */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'UX_Employees_Cpf' AND object_id = OBJECT_ID('dbo.Employees'))
CREATE UNIQUE INDEX UX_Employees_Cpf ON dbo.Employees (Cpf) WHERE Cpf IS NOT NULL;
GO

/* ---------- Sequência para gerar a matrícula (M0001, M0002 já usadas no seed) ---------- */
IF OBJECT_ID('dbo.EmployeeRegistrationSeq') IS NULL
CREATE SEQUENCE dbo.EmployeeRegistrationSeq START WITH 3 INCREMENT BY 1;
GO

/* ---------- Casos de onboarding ---------- */
IF OBJECT_ID('dbo.OnboardingCases') IS NULL
CREATE TABLE dbo.OnboardingCases (
    Id               INT IDENTITY(1,1) PRIMARY KEY,
    Status           NVARCHAR(20)  NOT NULL DEFAULT 'pendente_revisao'
                     CONSTRAINT CK_Onboarding_Status
                     CHECK (Status IN ('pendente_revisao','aprovado','rejeitado')),
    SourceFileName   NVARCHAR(255) NOT NULL,
    ExtractedJson    NVARCHAR(MAX) NOT NULL,   -- o que a IA extraiu (imutável)
    ReviewedJson     NVARCHAR(MAX) NULL,       -- versão corrigida pelo analista de DP
    ValidationIssues NVARCHAR(MAX) NULL,       -- JSON: campos ausentes/inválidos
    CreatedBy        INT NOT NULL
                     CONSTRAINT FK_Onboarding_CreatedBy REFERENCES dbo.Users(Id),
    CreatedAt        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ReviewedBy       INT NULL
                     CONSTRAINT FK_Onboarding_ReviewedBy REFERENCES dbo.Users(Id),
    ReviewedAt       DATETIME2 NULL,
    EmployeeId       INT NULL
                     CONSTRAINT FK_Onboarding_Employee REFERENCES dbo.Employees(Id),
    RejectionReason  NVARCHAR(300) NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_Onboarding_Status' AND object_id = OBJECT_ID('dbo.OnboardingCases'))
CREATE INDEX IX_Onboarding_Status ON dbo.OnboardingCases (Status, CreatedAt DESC);
GO
