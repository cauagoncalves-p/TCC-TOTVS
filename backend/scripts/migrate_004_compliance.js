// backend/scripts/migrate_004_compliance.js
const { poolPromise } = require('../src/config/db');

async function migrate() {
  const pool = await poolPromise;
  console.log('--- Aplicando migração da Parte 4 (Compliance Inteligente) ---');

  // Descobre o nome exato da tabela de usuários (Users ou users)
  const userTableQuery = await pool.request().query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE LOWER(TABLE_NAME) = 'users'
  `);
  const userTableName = userTableQuery.recordset.length > 0 ? userTableQuery.recordset[0].TABLE_NAME : 'users';

  const userColQuery = await pool.request().query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${userTableName}' AND LOWER(COLUMN_NAME) = 'id'
  `);
  const userColName = userColQuery.recordset.length > 0 ? userColQuery.recordset[0].COLUMN_NAME : 'id';

  // 1. Complementos em Employees
  console.log('Verificando complementos em Employees...');
  const empCols = [
    { name: 'TerminationDate', type: 'DATE NULL' },
    { name: 'WeeklyHours', type: 'DECIMAL(4,1) NULL' },
    { name: 'ContractType', type: 'NVARCHAR(20) NULL' }
  ];
  for (const col of empCols) {
    const check = await pool.request().query(`
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Employees' AND COLUMN_NAME = '${col.name}'
    `);
    if (check.recordset.length === 0) {
      console.log(`  Adicionando coluna ${col.name} em Employees...`);
      await pool.request().query(`ALTER TABLE dbo.Employees ADD ${col.name} ${col.type}`);
    }
  }

  // 2. Complementos em ChatSessions e ChatMessages
  console.log('Verificando complementos em ChatSessions e ChatMessages...');
  const sessionCheck = await pool.request().query(`
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ChatSessions' AND COLUMN_NAME = 'Channel'
  `);
  if (sessionCheck.recordset.length === 0) {
    console.log('  Adicionando coluna Channel em ChatSessions...');
    await pool.request().query(`ALTER TABLE dbo.ChatSessions ADD Channel NVARCHAR(20) NOT NULL CONSTRAINT DF_ChatSessions_Channel DEFAULT 'colaborador'`);
  }

  const msgCheck = await pool.request().query(`
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ChatMessages' AND COLUMN_NAME = 'SourcesJson'
  `);
  if (msgCheck.recordset.length === 0) {
    console.log('  Adicionando coluna SourcesJson em ChatMessages...');
    await pool.request().query(`ALTER TABLE dbo.ChatMessages ADD SourcesJson NVARCHAR(MAX) NULL`);
  }

  // 3. Tabela Leaves (Afastamentos)
  console.log('Verificando tabela Leaves...');
  const leavesCheck = await pool.request().query(`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Leaves'`);
  if (leavesCheck.recordset.length === 0) {
    console.log('  Criando tabela Leaves...');
    await pool.request().query(`
      CREATE TABLE dbo.Leaves (
        Id         INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId INT NOT NULL CONSTRAINT FK_Leaves_Employees REFERENCES dbo.Employees(Id),
        LeaveType  NVARCHAR(20) NOT NULL CONSTRAINT CK_Leaves_Type CHECK (LeaveType IN ('inss','maternidade','paternidade','outros')),
        StartDate  DATE NOT NULL,
        EndDate    DATE NULL
      );
    `);
  }

  // 4. Tabela ComplianceRules
  console.log('Verificando tabela ComplianceRules...');
  const rulesCheck = await pool.request().query(`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ComplianceRules'`);
  if (rulesCheck.recordset.length === 0) {
    console.log('  Criando tabela ComplianceRules...');
    await pool.request().query(`
      CREATE TABLE dbo.ComplianceRules (
        Id              INT IDENTITY(1,1) PRIMARY KEY,
        Code            NVARCHAR(40)  NOT NULL UNIQUE,
        Category        NVARCHAR(20)  NOT NULL CONSTRAINT CK_Rules_Category CHECK (Category IN ('integridade','esocial','clt')),
        EventCode       NVARCHAR(10)  NULL,
        Severity        NVARCHAR(10)  NOT NULL CONSTRAINT CK_Rules_Severity CHECK (Severity IN ('baixa','media','alta')),
        Title           NVARCHAR(150) NOT NULL,
        Description     NVARCHAR(500) NOT NULL,
        Guidance        NVARCHAR(600) NOT NULL,
        SourceType      NVARCHAR(10)  NOT NULL CONSTRAINT CK_Rules_SourceType CHECK (SourceType IN ('interna','oficial')),
        SourceReference NVARCHAR(300) NOT NULL,
        SourceVerified  BIT NOT NULL DEFAULT 0,
        IsActive        BIT NOT NULL DEFAULT 1
      );
    `);
  }

  // 5. Tabela ComplianceRuns
  console.log('Verificando tabela ComplianceRuns...');
  const runsCheck = await pool.request().query(`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ComplianceRuns'`);
  if (runsCheck.recordset.length === 0) {
    console.log('  Criando tabela ComplianceRuns...');
    await pool.request().query(`
      CREATE TABLE dbo.ComplianceRuns (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        Scope           NVARCHAR(10) NOT NULL CONSTRAINT CK_Runs_Scope CHECK (Scope IN ('cadastros','esocial')),
        EventCode       NVARCHAR(10) NULL,
        StartedBy       INT NOT NULL CONSTRAINT FK_Runs_User REFERENCES dbo.[${userTableName}]([${userColName}]),
        StartedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        FinishedAt      DATETIME2 NULL,
        RecordsAnalyzed INT NOT NULL DEFAULT 0,
        IssuesNew       INT NOT NULL DEFAULT 0,
        IssuesOpen      INT NOT NULL DEFAULT 0
      );
    `);
  }

  // 6. Tabela ComplianceIssues
  console.log('Verificando tabela ComplianceIssues...');
  const issuesCheck = await pool.request().query(`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ComplianceIssues'`);
  if (issuesCheck.recordset.length === 0) {
    console.log('  Criando tabela ComplianceIssues...');
    await pool.request().query(`
      CREATE TABLE dbo.ComplianceIssues (
        Id             INT IDENTITY(1,1) PRIMARY KEY,
        RuleId         INT NOT NULL CONSTRAINT FK_Issues_Rule REFERENCES dbo.ComplianceRules(Id),
        EmployeeId     INT NULL CONSTRAINT FK_Issues_Employee REFERENCES dbo.Employees(Id),
        EntityType     NVARCHAR(20) NOT NULL CONSTRAINT CK_Issues_Entity CHECK (EntityType IN ('employee','payslip','vacation','leave')),
        EntityId       INT NOT NULL,
        EventCode      NVARCHAR(10) NULL,
        Priority       NVARCHAR(10) NOT NULL CONSTRAINT CK_Issues_Priority CHECK (Priority IN ('baixa','media','alta')),
        Description    NVARCHAR(500) NOT NULL,
        Status         NVARCHAR(10) NOT NULL DEFAULT 'aberta' CONSTRAINT CK_Issues_Status CHECK (Status IN ('aberta','corrigida','ignorada')),
        FirstRunId     UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_Issues_FirstRun REFERENCES dbo.ComplianceRuns(Id),
        LastRunId      UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_Issues_LastRun  REFERENCES dbo.ComplianceRuns(Id),
        DetectedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        ResolvedBy     INT NULL CONSTRAINT FK_Issues_ResolvedBy REFERENCES dbo.[${userTableName}]([${userColName}]),
        ResolvedAt     DATETIME2 NULL,
        ResolutionNote NVARCHAR(300) NULL
      );
    `);
  }

  const uxIssuesCheck = await pool.request().query(`
    SELECT 1 FROM sys.indexes WHERE name = 'UX_Issues_Open' AND object_id = OBJECT_ID('dbo.ComplianceIssues')
  `);
  if (uxIssuesCheck.recordset.length === 0) {
    console.log('  Criando índice único UX_Issues_Open...');
    await pool.request().query(`
      CREATE UNIQUE INDEX UX_Issues_Open ON dbo.ComplianceIssues (RuleId, EntityType, EntityId) WHERE Status = 'aberta';
    `);
  }

  const ixIssuesCheck = await pool.request().query(`
    SELECT 1 FROM sys.indexes WHERE name = 'IX_Issues_Filter' AND object_id = OBJECT_ID('dbo.ComplianceIssues')
  `);
  if (ixIssuesCheck.recordset.length === 0) {
    console.log('  Criando índice IX_Issues_Filter...');
    await pool.request().query(`
      CREATE INDEX IX_Issues_Filter ON dbo.ComplianceIssues (Status, Priority, DetectedAt DESC);
    `);
  }

  // 7. Tabela EsocialEvents
  console.log('Verificando tabela EsocialEvents...');
  const esocialCheck = await pool.request().query(`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EsocialEvents'`);
  if (esocialCheck.recordset.length === 0) {
    console.log('  Criando tabela EsocialEvents...');
    await pool.request().query(`
      CREATE TABLE dbo.EsocialEvents (
        Id          INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId  INT NOT NULL CONSTRAINT FK_Esocial_Employee REFERENCES dbo.Employees(Id),
        LeaveId     INT NULL CONSTRAINT FK_Esocial_Leave REFERENCES dbo.Leaves(Id),
        EventCode   NVARCHAR(10) NOT NULL CONSTRAINT CK_Esocial_Event CHECK (EventCode IN ('S-2200','S-2230','S-2299')),
        EventDate   DATE NOT NULL,
        Status      NVARCHAR(25) NOT NULL DEFAULT 'pendente' CONSTRAINT CK_Esocial_Status CHECK (Status IN ('pendente','com_inconsistencias','pronto_para_envio','enviado_simulado')),
        LastRunId   UNIQUEIDENTIFIER NULL CONSTRAINT FK_Esocial_Run REFERENCES dbo.ComplianceRuns(Id),
        ConfirmedBy INT NULL CONSTRAINT FK_Esocial_ConfirmedBy REFERENCES dbo.[${userTableName}]([${userColName}]),
        ConfirmedAt DATETIME2 NULL
      );
    `);
  }

  // 8. Tabela ComplianceAuditLog
  console.log('Verificando tabela ComplianceAuditLog...');
  const auditCheck = await pool.request().query(`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ComplianceAuditLog'`);
  if (auditCheck.recordset.length === 0) {
    console.log('  Criando tabela ComplianceAuditLog...');
    await pool.request().query(`
      CREATE TABLE dbo.ComplianceAuditLog (
        Id          BIGINT IDENTITY(1,1) PRIMARY KEY,
        UserId      INT NULL CONSTRAINT FK_Audit_User REFERENCES dbo.[${userTableName}]([${userColName}]),
        Action      NVARCHAR(40) NOT NULL,
        EntityType  NVARCHAR(30) NULL,
        EntityId    NVARCHAR(40) NULL,
        DetailsJson NVARCHAR(MAX) NULL,
        CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    `);
  }

  // 9. Tabelas de Obrigações, Notificações e Conhecimento (para integridade do schema completo)
  console.log('Verificando tabela Obligations...');
  const oblCheck = await pool.request().query(`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Obligations'`);
  if (oblCheck.recordset.length === 0) {
    console.log('  Criando tabela Obligations...');
    await pool.request().query(`
      CREATE TABLE dbo.Obligations (
        Id                INT IDENTITY(1,1) PRIMARY KEY,
        Code              NVARCHAR(40)  NOT NULL UNIQUE,
        Name              NVARCHAR(150) NOT NULL,
        Frequency         NVARCHAR(12)  NOT NULL CONSTRAINT CK_Obl_Freq CHECK (Frequency IN ('mensal','anual','por_evento')),
        DueDay            INT NULL,
        DueRuleText       NVARCHAR(300) NOT NULL,
        SourceReference   NVARCHAR(300) NOT NULL,
        SourceVerified    BIT NOT NULL DEFAULT 0,
        ResponsibleUserId INT NULL CONSTRAINT FK_Obl_User REFERENCES dbo.[${userTableName}]([${userColName}]),
        IsActive          BIT NOT NULL DEFAULT 1
      );
    `);
  }

  const oblInstCheck = await pool.request().query(`SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ObligationInstances'`);
  if (oblInstCheck.recordset.length === 0) {
    console.log('  Criando tabela ObligationInstances...');
    await pool.request().query(`
      CREATE TABLE dbo.ObligationInstances (
        Id           INT IDENTITY(1,1) PRIMARY KEY,
        ObligationId INT NOT NULL CONSTRAINT FK_OblInst_Obl REFERENCES dbo.Obligations(Id),
        Competence   CHAR(7) NOT NULL,
        DueDate      DATE NOT NULL,
        Status       NVARCHAR(10) NOT NULL DEFAULT 'pendente' CONSTRAINT CK_OblInst_Status CHECK (Status IN ('pendente','concluida')),
        CompletedBy  INT NULL CONSTRAINT FK_OblInst_User REFERENCES dbo.[${userTableName}]([${userColName}]),
        CompletedAt  DATETIME2 NULL,
        CONSTRAINT UQ_OblInst UNIQUE (ObligationId, Competence)
      );
    `);
  }

  console.log('--- Migração da Parte 4 concluída com sucesso! ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
