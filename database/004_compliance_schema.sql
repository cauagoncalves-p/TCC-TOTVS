/* =====================================================================
   004_compliance_schema.sql  |  Parte 4: TOTVS Compliance Inteligente
   Banco: TotvsRhInteligenteDb. Idempotente. Dados FICTÍCIOS.
   Carga de dados: backend/scripts/seedCompliance.js
   ATENÇÃO: não há CHECK de coerência de datas (admissão x desligamento,
   início x fim de afastamento) DE PROPÓSITO: dados inconsistentes precisam
   poder existir para serem detectados pelo módulo.
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO

/* ---------- Complementos em tabelas existentes ---------- */
IF COL_LENGTH('dbo.Employees', 'TerminationDate') IS NULL
ALTER TABLE dbo.Employees ADD
    TerminationDate DATE          NULL,
    WeeklyHours     DECIMAL(4,1)  NULL,
    ContractType    NVARCHAR(20)  NULL;
GO
IF COL_LENGTH('dbo.ChatSessions', 'Channel') IS NULL
ALTER TABLE dbo.ChatSessions ADD Channel NVARCHAR(20) NOT NULL
    CONSTRAINT DF_ChatSessions_Channel DEFAULT 'colaborador';   -- 'colaborador' | 'trabalhista'
GO
IF COL_LENGTH('dbo.ChatMessages', 'SourcesJson') IS NULL
ALTER TABLE dbo.ChatMessages ADD SourcesJson NVARCHAR(MAX) NULL; -- fontes citadas na resposta
GO

/* ---------- Afastamentos (sem CID nem diagnóstico: LGPD) ---------- */
IF OBJECT_ID('dbo.Leaves') IS NULL
CREATE TABLE dbo.Leaves (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId INT NOT NULL CONSTRAINT FK_Leaves_Employees REFERENCES dbo.Employees(Id),
    LeaveType  NVARCHAR(20) NOT NULL
               CONSTRAINT CK_Leaves_Type CHECK (LeaveType IN ('inss','maternidade','paternidade','outros')),
    StartDate  DATE NOT NULL,
    EndDate    DATE NULL
);
GO

/* ---------- Catálogo de regras (cada regra TEM fonte) ---------- */
IF OBJECT_ID('dbo.ComplianceRules') IS NULL
CREATE TABLE dbo.ComplianceRules (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    Code            NVARCHAR(40)  NOT NULL UNIQUE,
    Category        NVARCHAR(20)  NOT NULL
                    CONSTRAINT CK_Rules_Category CHECK (Category IN ('integridade','esocial','clt')),
    EventCode       NVARCHAR(10)  NULL,                 -- ex.: S-2200 (regras de pré-envio)
    Severity        NVARCHAR(10)  NOT NULL
                    CONSTRAINT CK_Rules_Severity CHECK (Severity IN ('baixa','media','alta')),
    Title           NVARCHAR(150) NOT NULL,
    Description     NVARCHAR(500) NOT NULL,
    Guidance        NVARCHAR(600) NOT NULL,             -- orientação de correção
    SourceType      NVARCHAR(10)  NOT NULL
                    CONSTRAINT CK_Rules_SourceType CHECK (SourceType IN ('interna','oficial')),
    SourceReference NVARCHAR(300) NOT NULL,             -- 'Regra interna...' ou documento/artigo oficial
    SourceVerified  BIT NOT NULL DEFAULT 0,             -- 1 = conferido no texto oficial vigente
    IsActive        BIT NOT NULL DEFAULT 1
);
GO

/* ---------- Execuções de auditoria ---------- */
IF OBJECT_ID('dbo.ComplianceRuns') IS NULL
CREATE TABLE dbo.ComplianceRuns (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Scope           NVARCHAR(10) NOT NULL
                    CONSTRAINT CK_Runs_Scope CHECK (Scope IN ('cadastros','esocial')),
    EventCode       NVARCHAR(10) NULL,
    StartedBy       INT NOT NULL CONSTRAINT FK_Runs_User REFERENCES dbo.Users(Id),
    StartedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FinishedAt      DATETIME2 NULL,
    RecordsAnalyzed INT NOT NULL DEFAULT 0,
    IssuesNew       INT NOT NULL DEFAULT 0,
    IssuesOpen      INT NOT NULL DEFAULT 0
);
GO

/* ---------- Central de inconsistências ---------- */
IF OBJECT_ID('dbo.ComplianceIssues') IS NULL
CREATE TABLE dbo.ComplianceIssues (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    RuleId         INT NOT NULL CONSTRAINT FK_Issues_Rule REFERENCES dbo.ComplianceRules(Id),
    EmployeeId     INT NULL CONSTRAINT FK_Issues_Employee REFERENCES dbo.Employees(Id),
    EntityType     NVARCHAR(20) NOT NULL
                   CONSTRAINT CK_Issues_Entity CHECK (EntityType IN ('employee','payslip','vacation','leave')),
    EntityId       INT NOT NULL,
    EventCode      NVARCHAR(10) NULL,
    Priority       NVARCHAR(10) NOT NULL
                   CONSTRAINT CK_Issues_Priority CHECK (Priority IN ('baixa','media','alta')),
    Description    NVARCHAR(500) NOT NULL,          -- descrição específica do caso
    Status         NVARCHAR(10) NOT NULL DEFAULT 'aberta'
                   CONSTRAINT CK_Issues_Status CHECK (Status IN ('aberta','corrigida','ignorada')),
    FirstRunId     UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_Issues_FirstRun REFERENCES dbo.ComplianceRuns(Id),
    LastRunId      UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_Issues_LastRun  REFERENCES dbo.ComplianceRuns(Id),
    DetectedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ResolvedBy     INT NULL CONSTRAINT FK_Issues_ResolvedBy REFERENCES dbo.Users(Id),
    ResolvedAt     DATETIME2 NULL,
    ResolutionNote NVARCHAR(300) NULL
);
GO
/* Uma única inconsistência ABERTA por (regra, entidade): reexecutar não duplica */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Issues_Open' AND object_id = OBJECT_ID('dbo.ComplianceIssues'))
CREATE UNIQUE INDEX UX_Issues_Open ON dbo.ComplianceIssues (RuleId, EntityType, EntityId) WHERE Status = 'aberta';
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Issues_Filter' AND object_id = OBJECT_ID('dbo.ComplianceIssues'))
CREATE INDEX IX_Issues_Filter ON dbo.ComplianceIssues (Status, Priority, DetectedAt DESC);
GO

/* ---------- Eventos eSocial simulados (nada é transmitido de verdade) ---------- */
IF OBJECT_ID('dbo.EsocialEvents') IS NULL
CREATE TABLE dbo.EsocialEvents (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId  INT NOT NULL CONSTRAINT FK_Esocial_Employee REFERENCES dbo.Employees(Id),
    LeaveId     INT NULL CONSTRAINT FK_Esocial_Leave REFERENCES dbo.Leaves(Id),
    EventCode   NVARCHAR(10) NOT NULL
                CONSTRAINT CK_Esocial_Event CHECK (EventCode IN ('S-2200','S-2230','S-2299')),
    EventDate   DATE NOT NULL,
    Status      NVARCHAR(25) NOT NULL DEFAULT 'pendente'
                CONSTRAINT CK_Esocial_Status
                CHECK (Status IN ('pendente','com_inconsistencias','pronto_para_envio','enviado_simulado')),
    LastRunId   UNIQUEIDENTIFIER NULL CONSTRAINT FK_Esocial_Run REFERENCES dbo.ComplianceRuns(Id),
    ConfirmedBy INT NULL CONSTRAINT FK_Esocial_ConfirmedBy REFERENCES dbo.Users(Id),
    ConfirmedAt DATETIME2 NULL
);
GO

/* ---------- Auditoria (somente INSERT pela aplicação) ---------- */
IF OBJECT_ID('dbo.ComplianceAuditLog') IS NULL
CREATE TABLE dbo.ComplianceAuditLog (
    Id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId      INT NULL CONSTRAINT FK_Audit_User REFERENCES dbo.Users(Id),
    Action      NVARCHAR(40) NOT NULL,   -- run_started, issue_resolved, esocial_confirmed, document_uploaded...
    EntityType  NVARCHAR(30) NULL,
    EntityId    NVARCHAR(40) NULL,
    DetailsJson NVARCHAR(MAX) NULL,      -- nunca CPF completo
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* ---------- Obrigações e calendário ---------- */
IF OBJECT_ID('dbo.Obligations') IS NULL
CREATE TABLE dbo.Obligations (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    Code              NVARCHAR(40)  NOT NULL UNIQUE,
    Name              NVARCHAR(150) NOT NULL,
    Frequency         NVARCHAR(12)  NOT NULL
                      CONSTRAINT CK_Obl_Freq CHECK (Frequency IN ('mensal','anual','por_evento')),
    DueDay            INT NULL,                            -- dia do mês base do prazo
    DueRuleText       NVARCHAR(300) NOT NULL,              -- regra de prazo em texto
    SourceReference   NVARCHAR(300) NOT NULL,
    SourceVerified    BIT NOT NULL DEFAULT 0,
    ResponsibleUserId INT NULL CONSTRAINT FK_Obl_User REFERENCES dbo.Users(Id),
    IsActive          BIT NOT NULL DEFAULT 1
);
GO
IF OBJECT_ID('dbo.ObligationInstances') IS NULL
CREATE TABLE dbo.ObligationInstances (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    ObligationId INT NOT NULL CONSTRAINT FK_OblInst_Obl REFERENCES dbo.Obligations(Id),
    Competence   CHAR(7) NOT NULL,                         -- 'YYYY-MM'
    DueDate      DATE NOT NULL,
    Status       NVARCHAR(10) NOT NULL DEFAULT 'pendente'
                 CONSTRAINT CK_OblInst_Status CHECK (Status IN ('pendente','concluida')),
    CompletedBy  INT NULL CONSTRAINT FK_OblInst_User REFERENCES dbo.Users(Id),
    CompletedAt  DATETIME2 NULL,
    CONSTRAINT UQ_OblInst UNIQUE (ObligationId, Competence)
);
GO

/* ---------- Notificações ---------- */
IF OBJECT_ID('dbo.Notifications') IS NULL
CREATE TABLE dbo.Notifications (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    UserId    INT NOT NULL CONSTRAINT FK_Notif_User REFERENCES dbo.Users(Id),
    Type      NVARCHAR(30)  NOT NULL,                      -- prazo_proximo, obrigacao_atrasada
    Message   NVARCHAR(300) NOT NULL,
    RefType   NVARCHAR(30)  NULL,
    RefId     INT NULL,
    IsRead    BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Notif_Dedup UNIQUE (UserId, Type, RefType, RefId)
);
GO

/* ---------- Base de conhecimento (RAG) ---------- */
IF OBJECT_ID('dbo.KnowledgeDocuments') IS NULL
CREATE TABLE dbo.KnowledgeDocuments (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    Title         NVARCHAR(200) NOT NULL,
    DocType       NVARCHAR(20)  NOT NULL
                  CONSTRAINT CK_KDoc_Type CHECK (DocType IN ('clt','esocial_manual','esocial_leiaute','nota_tecnica','outro')),
    SourceOrg     NVARCHAR(150) NOT NULL,                  -- órgão/entidade que publicou
    SourceUrl     NVARCHAR(500) NULL,
    Version       NVARCHAR(30)  NOT NULL,
    PublishedAt   DATE NULL,                               -- data de publicação/atualização do documento
    EffectiveFrom DATE NULL,
    EffectiveTo   DATE NULL,
    IsCurrent     BIT NOT NULL DEFAULT 1,
    FileName      NVARCHAR(255) NOT NULL,
    UploadedBy    INT NOT NULL CONSTRAINT FK_KDoc_User REFERENCES dbo.Users(Id),
    UploadedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID('dbo.KnowledgeChunks') IS NULL
CREATE TABLE dbo.KnowledgeChunks (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    DocumentId INT NOT NULL CONSTRAINT FK_KChunk_Doc REFERENCES dbo.KnowledgeDocuments(Id),
    ChunkIndex INT NOT NULL,
    Page       INT NULL,
    SectionRef NVARCHAR(200) NULL,                         -- artigo/seção quando identificável
    Content    NVARCHAR(MAX) NOT NULL,
    CONSTRAINT UQ_KChunk UNIQUE (DocumentId, ChunkIndex)
);
GO

select * from Users