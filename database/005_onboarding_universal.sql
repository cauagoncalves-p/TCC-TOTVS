/* =====================================================================
   005_onboarding_universal.sql  |  Parte 2B: Onboarding universal
   Banco: TotvsRhInteligenteDb. Idempotente.
   Um caso de onboarding passa a ter VÁRIOS documentos (ficha, currículo...).
   ExtractedJson/ReviewedJson de OnboardingCases passam a ter o formato:
   { "cadastro": {...}, "perfil": {...} }   (antes era um JSON plano).
   Sugestão: apague os casos de teste antigos (formato antigo) antes de testar:
     DELETE FROM dbo.OnboardingCases WHERE Status <> 'aprovado';
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO

/* ---------- Documentos enviados em cada caso ---------- */
IF OBJECT_ID('dbo.OnboardingDocuments') IS NULL
CREATE TABLE dbo.OnboardingDocuments (
    Id               INT IDENTITY(1,1) PRIMARY KEY,
    CaseId           INT NOT NULL
                     CONSTRAINT FK_OnbDocs_Case REFERENCES dbo.OnboardingCases(Id),
    FileName         NVARCHAR(255) NOT NULL,
    DocumentType     NVARCHAR(30)  NOT NULL
                     CONSTRAINT CK_OnbDocs_Type CHECK (DocumentType IN
                       ('ficha_admissao','curriculo','documento_identidade','comprovante_residencia','outro')),
    TypeSource       NVARCHAR(10)  NOT NULL DEFAULT 'ia'
                     CONSTRAINT CK_OnbDocs_TypeSource CHECK (TypeSource IN ('ia','analista')),
    ExtractionMethod NVARCHAR(12)  NOT NULL
                     CONSTRAINT CK_OnbDocs_Method CHECK (ExtractionMethod IN ('pdf_nativo','texto')),
    PageCount        INT NULL,
    ExtractedJson    NVARCHAR(MAX) NOT NULL,   -- saída bruta normalizada deste documento
    EvidenceReport   NVARCHAR(MAX) NULL,       -- JSON: campos confirmados / não confirmados no texto
    CreatedBy        INT NOT NULL
                     CONSTRAINT FK_OnbDocs_User REFERENCES dbo.Users(Id),
    CreatedAt        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_OnbDocs_Case' AND object_id = OBJECT_ID('dbo.OnboardingDocuments'))
CREATE INDEX IX_OnbDocs_Case ON dbo.OnboardingDocuments (CaseId);
GO

/* ---------- Perfil profissional do colaborador (formação, experiência...) ---------- */
IF OBJECT_ID('dbo.EmployeeProfiles') IS NULL
CREATE TABLE dbo.EmployeeProfiles (
    EmployeeId   INT NOT NULL PRIMARY KEY
                 CONSTRAINT FK_Profiles_Employee REFERENCES dbo.Employees(Id),
    ProfileJson  NVARCHAR(MAX) NOT NULL,       -- formação, experiência, habilidades, idiomas...
    SourceCaseId INT NULL
                 CONSTRAINT FK_Profiles_Case REFERENCES dbo.OnboardingCases(Id),
    UpdatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
