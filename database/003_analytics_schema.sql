/* =====================================================================
   003_analytics_schema.sql  |  Parte 3: Central de Inteligência Preditiva
   Banco: TotvsRhInteligenteDb. Idempotente. Dados FICTÍCIOS e AGREGADOS
   (por departamento/mês). Nenhum dado individual entra neste módulo.
   A carga dos dados é feita pelo script Node backend/scripts/seedAnalytics.js
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO

/* ---------- Departamentos ---------- */
IF OBJECT_ID('dbo.Departments') IS NULL
CREATE TABLE dbo.Departments (
    Id       INT IDENTITY(1,1) PRIMARY KEY,
    Name     NVARCHAR(100) NOT NULL UNIQUE,
    IsActive BIT NOT NULL DEFAULT 1
);
GO


/* ---------- Métricas mensais por departamento ----------
   Colunas calculadas guardam as fórmulas oficiais dos indicadores. */
IF OBJECT_ID('dbo.DepartmentMonthlyMetrics') IS NULL
CREATE TABLE dbo.DepartmentMonthlyMetrics (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentId  INT NOT NULL
                  CONSTRAINT FK_Metrics_Department REFERENCES dbo.Departments(Id),
    MonthRef      DATE NOT NULL,                    -- sempre o dia 1 do mês
    Headcount     INT NOT NULL CONSTRAINT CK_Metrics_Headcount CHECK (Headcount >= 0),
    WorkDays      INT NOT NULL CONSTRAINT CK_Metrics_WorkDays  CHECK (WorkDays BETWEEN 1 AND 31),
    AbsenceDays   DECIMAL(8,1)  NOT NULL CONSTRAINT CK_Metrics_Absence  CHECK (AbsenceDays >= 0),
    OvertimeHours DECIMAL(10,1) NOT NULL CONSTRAINT CK_Metrics_Overtime CHECK (OvertimeHours >= 0),
    Hires         INT NOT NULL DEFAULT 0,
    Terminations  INT NOT NULL DEFAULT 0,
    /* % de dias perdidos: faltas / (pessoas x dias úteis) */
    AbsenceRate         AS CAST(AbsenceDays * 100.0 / NULLIF(Headcount * WorkDays, 0) AS DECIMAL(6,2)) PERSISTED,
    /* horas extras médias por colaborador no mês */
    OvertimePerEmployee AS CAST(OvertimeHours / NULLIF(Headcount, 0) AS DECIMAL(8,2)) PERSISTED,
    /* % de desligamentos sobre o quadro do mês */
    TurnoverRate        AS CAST(Terminations * 100.0 / NULLIF(Headcount, 0) AS DECIMAL(6,2)) PERSISTED,
    CONSTRAINT UQ_Metrics_DeptMonth UNIQUE (DepartmentId, MonthRef)
);
GO
/* ---------- Alertas ---------- */
IF OBJECT_ID('dbo.Alerts') IS NULL
CREATE TABLE dbo.Alerts (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentId   INT NOT NULL
                   CONSTRAINT FK_Alerts_Department REFERENCES dbo.Departments(Id),
    RuleCode       NVARCHAR(30) NOT NULL,           -- ex.: ABS_OT_UP, OT_CHRONIC
    RiskLevel      NVARCHAR(10) NOT NULL
                   CONSTRAINT CK_Alerts_Risk CHECK (RiskLevel IN ('baixo','moderado','alto')),
    Source         NVARCHAR(10) NOT NULL DEFAULT 'regra'
                   CONSTRAINT CK_Alerts_Source CHECK (Source IN ('regra','modelo')),
    ReferenceMonth DATE NOT NULL,                   -- mês analisado
    IndicatorsJson NVARCHAR(MAX) NOT NULL,          -- números que sustentam o alerta
    Justification  NVARCHAR(500) NOT NULL,
    Recommendation NVARCHAR(600) NOT NULL,
    Status         NVARCHAR(12) NOT NULL DEFAULT 'novo'
                   CONSTRAINT CK_Alerts_Status CHECK (Status IN ('novo','lido','resolvido')),
    CreatedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedBy      INT NULL CONSTRAINT FK_Alerts_UpdatedBy REFERENCES dbo.Users(Id),
    UpdatedAt      DATETIME2 NULL,
    CONSTRAINT UQ_Alerts_Dedup UNIQUE (DepartmentId, RuleCode, ReferenceMonth)
);
GO

/* ---------- Previsões do modelo (Python/scikit-learn) ---------- */
IF OBJECT_ID('dbo.Predictions') IS NULL
CREATE TABLE dbo.Predictions (
    Id                          INT IDENTITY(1,1) PRIMARY KEY,
    RunId                       UNIQUEIDENTIFIER NOT NULL,   -- agrupa uma execução
    DepartmentId                INT NOT NULL
                                CONSTRAINT FK_Pred_Department REFERENCES dbo.Departments(Id),
    HorizonDays                 INT NOT NULL
                                CONSTRAINT CK_Pred_Horizon CHECK (HorizonDays IN (30,60,90)),
    PredictedTurnoverRate       DECIMAL(6,2) NULL,
    PredictedOvertimePerEmployee DECIMAL(8,2) NULL,
    IncreaseProbability         DECIMAL(5,2) NULL,           -- 0 a 100 (%)
    RiskLevel                   NVARCHAR(10) NOT NULL
                                CONSTRAINT CK_Pred_Risk CHECK (RiskLevel IN ('baixo','moderado','alto')),
    Confidence                  NVARCHAR(10) NOT NULL
                                CONSTRAINT CK_Pred_Conf CHECK (Confidence IN ('baixa','media','alta')),
    ContributionsJson           NVARCHAR(MAX) NOT NULL,      -- indicadores que mais pesaram
    ModelVersion                NVARCHAR(30) NOT NULL,
    CreatedAt                   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Pred_Run' AND object_id = OBJECT_ID('dbo.Predictions'))
CREATE INDEX IX_Pred_Run ON dbo.Predictions (RunId, DepartmentId, HorizonDays);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Alerts_Status' AND object_id = OBJECT_ID('dbo.Alerts'))
CREATE INDEX IX_Alerts_Status ON dbo.Alerts (Status, RiskLevel, CreatedAt DESC);
GO
