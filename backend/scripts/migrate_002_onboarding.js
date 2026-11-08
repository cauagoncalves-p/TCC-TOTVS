// backend/scripts/migrate_002_onboarding.js
const { poolPromise } = require('../src/config/db');

async function migrate() {
  const pool = await poolPromise;
  console.log('--- Aplicando migração da Parte 2 (Onboarding) ---');

  // 1. Colunas adicionais em Employees
  console.log('Verificando colunas adicionais em Employees...');
  const cols = [
    { name: 'Cpf', type: 'CHAR(11) NULL' },
    { name: 'Rg', type: 'NVARCHAR(20) NULL' },
    { name: 'BirthDate', type: 'DATE NULL' },
    { name: 'Phone', type: 'NVARCHAR(20) NULL' },
    { name: 'PersonalEmail', type: 'NVARCHAR(150) NULL' },
    { name: 'ZipCode', type: 'CHAR(8) NULL' },
    { name: 'Street', type: 'NVARCHAR(150) NULL' },
    { name: 'City', type: 'NVARCHAR(100) NULL' },
    { name: 'State', type: 'CHAR(2) NULL' },
    { name: 'BaseSalary', type: 'DECIMAL(12,2) NULL' }
  ];

  for (const col of cols) {
    const check = await pool.request().query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Employees' AND COLUMN_NAME = '${col.name}'`
    );
    if (check.recordset.length === 0) {
      console.log(`Adicionando coluna ${col.name} em Employees...`);
      await pool.request().query(`ALTER TABLE dbo.Employees ADD ${col.name} ${col.type}`);
    }
  }

  // 2. Índice único de CPF em Employees
  console.log('Verificando índice UX_Employees_Cpf...');
  const idxCheck = await pool.request().query(
    `SELECT 1 FROM sys.indexes WHERE name = 'UX_Employees_Cpf' AND object_id = OBJECT_ID('dbo.Employees')`
  );
  if (idxCheck.recordset.length === 0) {
    console.log('Criando índice único UX_Employees_Cpf...');
    await pool.request().query(
      `CREATE UNIQUE INDEX UX_Employees_Cpf ON dbo.Employees (Cpf) WHERE Cpf IS NOT NULL`
    );
  }

  // 3. Sequência para gerar matrícula
  console.log('Verificando sequência EmployeeRegistrationSeq...');
  const seqCheck = await pool.request().query(
    `SELECT 1 FROM sys.sequences WHERE name = 'EmployeeRegistrationSeq'`
  );
  if (seqCheck.recordset.length === 0) {
    console.log('Criando sequência EmployeeRegistrationSeq...');
    await pool.request().query(
      `CREATE SEQUENCE dbo.EmployeeRegistrationSeq START WITH 3 INCREMENT BY 1`
    );
  }

  // 4. Tabela OnboardingCases
  console.log('Verificando tabela OnboardingCases...');
  const tblCheck = await pool.request().query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'OnboardingCases'`
  );
  if (tblCheck.recordset.length === 0) {
    console.log('Criando tabela OnboardingCases...');
    await pool.request().query(`
      CREATE TABLE dbo.OnboardingCases (
        Id               INT IDENTITY(1,1) PRIMARY KEY,
        Status           NVARCHAR(20) NOT NULL DEFAULT 'pendente_revisao'
                         CONSTRAINT CK_Onboarding_Status
                         CHECK (Status IN ('pendente_revisao','aprovado','rejeitado')),
        SourceFileName   NVARCHAR(255) NOT NULL,
        ExtractedJson    NVARCHAR(MAX) NOT NULL,
        ReviewedJson     NVARCHAR(MAX) NULL,
        ValidationIssues NVARCHAR(MAX) NULL,
        CreatedBy        INT NOT NULL
                         CONSTRAINT FK_Onboarding_CreatedBy REFERENCES dbo.users(id),
        CreatedAt        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        ReviewedBy       INT NULL
                         CONSTRAINT FK_Onboarding_ReviewedBy REFERENCES dbo.users(id),
        ReviewedAt       DATETIME2 NULL,
        EmployeeId       INT NULL
                         CONSTRAINT FK_Onboarding_Employee REFERENCES dbo.Employees(Id),
        RejectionReason  NVARCHAR(300) NULL
      );

      CREATE INDEX IX_Onboarding_Status ON dbo.OnboardingCases (Status, CreatedAt DESC);
    `);
  }

  console.log('--- Migração da Parte 2 concluída com sucesso! ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
