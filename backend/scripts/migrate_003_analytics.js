// backend/scripts/migrate_003_analytics.js
const { poolPromise } = require('../src/config/db');

async function migrate() {
  const pool = await poolPromise;
  console.log('--- Aplicando migração da Parte 3 (Inteligência Preditiva / Analytics) ---');

  // 1. Tabela Departments
  console.log('Verificando tabela Departments...');
  const deptCheck = await pool.request().query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Departments'`
  );
  if (deptCheck.recordset.length === 0) {
    console.log('Criando tabela Departments...');
    await pool.request().query(`
      CREATE TABLE dbo.Departments (
        Id       INT IDENTITY(1,1) PRIMARY KEY,
        Name     NVARCHAR(100) NOT NULL UNIQUE,
        IsActive BIT NOT NULL DEFAULT 1
      );
    `);
  }

  // 2. Tabela DepartmentMonthlyMetrics
  console.log('Verificando tabela DepartmentMonthlyMetrics...');
  const metricsCheck = await pool.request().query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DepartmentMonthlyMetrics'`
  );
  if (metricsCheck.recordset.length === 0) {
    console.log('Criando tabela DepartmentMonthlyMetrics...');
    await pool.request().query(`
      CREATE TABLE dbo.DepartmentMonthlyMetrics (
        Id                  INT IDENTITY(1,1) PRIMARY KEY,
        DepartmentId        INT NOT NULL
                            CONSTRAINT FK_Metrics_Department REFERENCES dbo.Departments(Id),
        MonthRef            DATE NOT NULL,
        Headcount           INT NOT NULL CONSTRAINT CK_Metrics_Headcount CHECK (Headcount >= 0),
        WorkDays            INT NOT NULL CONSTRAINT CK_Metrics_WorkDays  CHECK (WorkDays BETWEEN 1 AND 31),
        AbsenceDays         DECIMAL(8,1)  NOT NULL CONSTRAINT CK_Metrics_Absence  CHECK (AbsenceDays >= 0),
        OvertimeHours       DECIMAL(10,1) NOT NULL CONSTRAINT CK_Metrics_Overtime CHECK (OvertimeHours >= 0),
        Hires               INT NOT NULL DEFAULT 0,
        Terminations        INT NOT NULL DEFAULT 0,
        AbsenceRate         AS CAST(AbsenceDays * 100.0 / NULLIF(Headcount * WorkDays, 0) AS DECIMAL(6,2)) PERSISTED,
        OvertimePerEmployee AS CAST(OvertimeHours / NULLIF(Headcount, 0) AS DECIMAL(8,2)) PERSISTED,
        TurnoverRate        AS CAST(Terminations * 100.0 / NULLIF(Headcount, 0) AS DECIMAL(6,2)) PERSISTED,
        CONSTRAINT UQ_Metrics_DeptMonth UNIQUE (DepartmentId, MonthRef)
      );
    `);
  }

  // 3. Tabela Alerts
  console.log('Verificando tabela Alerts...');
  const alertsCheck = await pool.request().query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Alerts'`
  );
  if (alertsCheck.recordset.length === 0) {
    console.log('Criando tabela Alerts...');
    // Descobre o nome exato da tabela de usuários (Users ou users)
    const userTableQuery = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE LOWER(TABLE_NAME) = 'users'
    `);
    const userTableName = userTableQuery.recordset.length > 0 ? userTableQuery.recordset[0].TABLE_NAME : 'users';

    // Descobre o nome exato da coluna PK de usuários
    const userColQuery = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${userTableName}' AND LOWER(COLUMN_NAME) = 'id'
    `);
    const userColName = userColQuery.recordset.length > 0 ? userColQuery.recordset[0].COLUMN_NAME : 'id';

    await pool.request().query(`
      CREATE TABLE dbo.Alerts (
        Id             INT IDENTITY(1,1) PRIMARY KEY,
        DepartmentId   INT NOT NULL
                       CONSTRAINT FK_Alerts_Department REFERENCES dbo.Departments(Id),
        RuleCode       NVARCHAR(30) NOT NULL,
        RiskLevel      NVARCHAR(10) NOT NULL
                       CONSTRAINT CK_Alerts_Risk CHECK (RiskLevel IN ('baixo','moderado','alto')),
        Source         NVARCHAR(10) NOT NULL DEFAULT 'regra'
                       CONSTRAINT CK_Alerts_Source CHECK (Source IN ('regra','modelo')),
        ReferenceMonth DATE NOT NULL,
        IndicatorsJson NVARCHAR(MAX) NOT NULL,
        Justification  NVARCHAR(500) NOT NULL,
        Recommendation NVARCHAR(600) NOT NULL,
        Status         NVARCHAR(12) NOT NULL DEFAULT 'novo'
                       CONSTRAINT CK_Alerts_Status CHECK (Status IN ('novo','lido','resolvido')),
        CreatedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedBy      INT NULL
                       CONSTRAINT FK_Alerts_UpdatedBy REFERENCES dbo.[${userTableName}]([${userColName}]),
        UpdatedAt      DATETIME2 NULL,
        CONSTRAINT UQ_Alerts_Dedup UNIQUE (DepartmentId, RuleCode, ReferenceMonth)
      );
    `);
  }

  const idxAlertsCheck = await pool.request().query(
    `SELECT 1 FROM sys.indexes WHERE name = 'IX_Alerts_Status' AND object_id = OBJECT_ID('dbo.Alerts')`
  );
  if (idxAlertsCheck.recordset.length === 0) {
    console.log('Criando índice IX_Alerts_Status...');
    await pool.request().query(`
      CREATE INDEX IX_Alerts_Status ON dbo.Alerts (Status, RiskLevel, CreatedAt DESC);
    `);
  }

  // 4. Tabela Predictions (Fase B/C)
  console.log('Verificando tabela Predictions...');
  const predCheck = await pool.request().query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Predictions'`
  );
  if (predCheck.recordset.length === 0) {
    console.log('Criando tabela Predictions...');
    await pool.request().query(`
      CREATE TABLE dbo.Predictions (
        Id                           INT IDENTITY(1,1) PRIMARY KEY,
        RunId                        UNIQUEIDENTIFIER NOT NULL,
        DepartmentId                 INT NOT NULL
                                     CONSTRAINT FK_Pred_Department REFERENCES dbo.Departments(Id),
        HorizonDays                  INT NOT NULL
                                     CONSTRAINT CK_Pred_Horizon CHECK (HorizonDays IN (30,60,90)),
        PredictedTurnoverRate        DECIMAL(6,2) NULL,
        PredictedOvertimePerEmployee DECIMAL(8,2) NULL,
        IncreaseProbability          DECIMAL(5,2) NULL,
        RiskLevel                    NVARCHAR(10) NOT NULL
                                     CONSTRAINT CK_Pred_Risk CHECK (RiskLevel IN ('baixo','moderado','alto')),
        Confidence                   NVARCHAR(10) NOT NULL
                                     CONSTRAINT CK_Pred_Conf CHECK (Confidence IN ('baixa','media','alta')),
        ContributionsJson            NVARCHAR(MAX) NOT NULL,
        ModelVersion                 NVARCHAR(30) NOT NULL,
        CreatedAt                    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    `);
  }

  const idxPredCheck = await pool.request().query(
    `SELECT 1 FROM sys.indexes WHERE name = 'IX_Pred_Run' AND object_id = OBJECT_ID('dbo.Predictions')`
  );
  if (idxPredCheck.recordset.length === 0) {
    console.log('Criando índice IX_Pred_Run...');
    await pool.request().query(`
      CREATE INDEX IX_Pred_Run ON dbo.Predictions (RunId, DepartmentId, HorizonDays);
    `);
  }

  console.log('--- Migração da Parte 3 concluída com sucesso! ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
