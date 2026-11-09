// backend/scripts/migrate_005_onboarding_universal.js
const { poolPromise } = require('../src/config/db');

async function migrate() {
  const pool = await poolPromise;
  console.log('--- Aplicando migração da Parte 2B (Onboarding Universal) ---');

  // 1. Tabela OnboardingDocuments
  console.log('Verificando tabela OnboardingDocuments...');
  const tableDocsCheck = await pool.request().query(`
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'OnboardingDocuments'
  `);
  if (tableDocsCheck.recordset.length === 0) {
    console.log('Criando tabela OnboardingDocuments...');
    await pool.request().query(`
      CREATE TABLE dbo.OnboardingDocuments (
        Id               INT IDENTITY(1,1) PRIMARY KEY,
        CaseId           INT NOT NULL
                         CONSTRAINT FK_OnbDocs_Case REFERENCES dbo.OnboardingCases(Id) ON DELETE CASCADE,
        FileName         NVARCHAR(255) NOT NULL,
        DocumentType     NVARCHAR(30)  NOT NULL
                         CONSTRAINT CK_OnbDocs_Type CHECK (DocumentType IN
                           ('ficha_admissao','curriculo','documento_identidade','comprovante_residencia','outro')),
        TypeSource       NVARCHAR(10)  NOT NULL DEFAULT 'ia'
                         CONSTRAINT CK_OnbDocs_TypeSource CHECK (TypeSource IN ('ia','analista')),
        ExtractionMethod NVARCHAR(12)  NOT NULL
                         CONSTRAINT CK_OnbDocs_Method CHECK (ExtractionMethod IN ('pdf_nativo','texto')),
        PageCount        INT NULL,
        ExtractedJson    NVARCHAR(MAX) NOT NULL,
        EvidenceReport   NVARCHAR(MAX) NULL,
        CreatedBy        INT NOT NULL
                         CONSTRAINT FK_OnbDocs_User REFERENCES dbo.Users(Id),
        CreatedAt        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    `);
    console.log('Tabela OnboardingDocuments criada com sucesso.');
  } else {
    console.log('Tabela OnboardingDocuments já existe.');
  }

  // Índice IX_OnbDocs_Case
  const idxCheck = await pool.request().query(`
    SELECT 1 FROM sys.indexes WHERE name = 'IX_OnbDocs_Case' AND object_id = OBJECT_ID('dbo.OnboardingDocuments')
  `);
  if (idxCheck.recordset.length === 0) {
    console.log('Criando índice IX_OnbDocs_Case...');
    await pool.request().query(`
      CREATE INDEX IX_OnbDocs_Case ON dbo.OnboardingDocuments (CaseId);
    `);
  }

  // 2. Tabela EmployeeProfiles
  console.log('Verificando tabela EmployeeProfiles...');
  const tableProfilesCheck = await pool.request().query(`
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmployeeProfiles'
  `);
  if (tableProfilesCheck.recordset.length === 0) {
    console.log('Criando tabela EmployeeProfiles...');
    await pool.request().query(`
      CREATE TABLE dbo.EmployeeProfiles (
        EmployeeId   INT NOT NULL PRIMARY KEY
                     CONSTRAINT FK_Profiles_Employee REFERENCES dbo.Employees(Id),
        ProfileJson  NVARCHAR(MAX) NOT NULL,
        SourceCaseId INT NULL
                     CONSTRAINT FK_Profiles_Case REFERENCES dbo.OnboardingCases(Id),
        UpdatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    `);
    console.log('Tabela EmployeeProfiles criada com sucesso.');
  } else {
    console.log('Tabela EmployeeProfiles já existe.');
  }

  // 3. Limpeza de casos não aprovados antigos (formato antigo plano)
  console.log('Limpando casos antigos não aprovados para evitar conflito de formato...');
  await pool.request().query(`
    DELETE FROM dbo.OnboardingCases WHERE Status <> 'aprovado';
  `);
  console.log('Casos antigos limpos.');

  console.log('--- Migração Parte 2B concluída com sucesso! ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
