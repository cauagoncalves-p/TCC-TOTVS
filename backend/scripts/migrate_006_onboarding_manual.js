// backend/scripts/migrate_006_onboarding_manual.js
const { poolPromise } = require('../src/config/db');

async function migrate() {
  const pool = await poolPromise;
  console.log('--- Aplicando migração da Parte 2C (006_onboarding_manual) ---');

  console.log('Alterando SourceFileName para NULL...');
  await pool.request().query(`
    ALTER TABLE dbo.OnboardingCases ALTER COLUMN SourceFileName NVARCHAR(255) NULL;
  `);

  console.log('Verificando coluna Origin...');
  const colCheck = await pool.request().query(`
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.OnboardingCases') AND name = 'Origin';
  `);

  if (colCheck.recordset.length === 0) {
    console.log('Adicionando coluna Origin...');
    await pool.request().query(`
      ALTER TABLE dbo.OnboardingCases ADD Origin NVARCHAR(10) NOT NULL
          CONSTRAINT DF_Onboarding_Origin DEFAULT 'pdf'
          CONSTRAINT CK_Onboarding_Origin CHECK (Origin IN ('pdf','manual'));
    `);
    console.log('Coluna Origin criada com sucesso.');
  } else {
    console.log('Coluna Origin já existe.');
  }

  console.log('--- Migração Parte 2C concluída com sucesso! ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
