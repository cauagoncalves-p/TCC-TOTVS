/* =====================================================================
   012_individual_attention.sql  |  Acompanhamento individual (índice de atenção) - APENAS RH
   Banco: TotvsRhInteligenteDb. Idempotente.
   Pré-requisitos: dbo.Employees (001/002/004) e dbo.Users (001).
   MINIMIZAÇÃO DE DADOS (decisões de projeto):
     - frequência guarda APENAS dias de ausência e horas extras por mês: NUNCA o motivo
       (atestado, doença etc.), para não expor dado de saúde;
     - movimentações de carreira guardam só TIPO e DATA: NUNCA valores de salário;
     - não há colunas de idade, gênero, estado civil, raça, saúde, religião ou filiação.
   Dados de pesquisa de clima anônima (F16) NUNCA podem ser ligados a pessoas.
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO

/* ---------- Frequência mensal por colaborador ---------- */
IF OBJECT_ID('dbo.EmployeeMonthlyAttendance') IS NULL
CREATE TABLE dbo.EmployeeMonthlyAttendance (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId    INT NOT NULL CONSTRAINT FK_EmpAtt_Employee REFERENCES dbo.Employees(Id),
    MonthRef      DATE NOT NULL,                                   -- sempre o dia 1 do mês
    WorkDays      INT NOT NULL CONSTRAINT CK_EmpAtt_WorkDays CHECK (WorkDays BETWEEN 1 AND 31),
    AbsenceDays   DECIMAL(4,1) NOT NULL CONSTRAINT CK_EmpAtt_Absence CHECK (AbsenceDays >= 0),
    OvertimeHours DECIMAL(6,1) NOT NULL CONSTRAINT CK_EmpAtt_Overtime CHECK (OvertimeHours >= 0),
    CONSTRAINT UQ_EmpAtt UNIQUE (EmployeeId, MonthRef)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_EmpAtt_Month' AND object_id = OBJECT_ID('dbo.EmployeeMonthlyAttendance'))
CREATE INDEX IX_EmpAtt_Month ON dbo.EmployeeMonthlyAttendance (MonthRef, EmployeeId);
GO

/* ---------- Movimentações de carreira (só tipo e data) ---------- */
IF OBJECT_ID('dbo.EmployeeCareerEvents') IS NULL
CREATE TABLE dbo.EmployeeCareerEvents (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId  INT NOT NULL CONSTRAINT FK_CareerEv_Employee REFERENCES dbo.Employees(Id),
    EventDate   DATE NOT NULL,
    EventType   NVARCHAR(20) NOT NULL
                CONSTRAINT CK_CareerEv_Type CHECK (EventType IN ('admissao','reajuste','promocao','mudanca_cargo')),
    NewJobTitle NVARCHAR(100) NULL,
    Note        NVARCHAR(200) NULL
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CareerEv_Employee' AND object_id = OBJECT_ID('dbo.EmployeeCareerEvents'))
CREATE INDEX IX_CareerEv_Employee ON dbo.EmployeeCareerEvents (EmployeeId, EventDate DESC);
GO

/* ---------- Histórico do índice calculado (um registro por colaborador e mês) ---------- */
IF OBJECT_ID('dbo.RetentionRiskSnapshots') IS NULL
CREATE TABLE dbo.RetentionRiskSnapshots (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId     INT NOT NULL CONSTRAINT FK_Snap_Employee REFERENCES dbo.Employees(Id),
    SnapshotMonth  DATE NOT NULL,                                  -- mês de referência (último mês fechado)
    Score          INT NULL CONSTRAINT CK_Snap_Score CHECK (Score IS NULL OR Score BETWEEN 0 AND 100),
    Level          NVARCHAR(15) NOT NULL
                   CONSTRAINT CK_Snap_Level CHECK (Level IN ('baixa','moderada','alta','insuficiente','nao_aplicavel')),
    DataQuality    NVARCHAR(12) NOT NULL
                   CONSTRAINT CK_Snap_Quality CHECK (DataQuality IN ('completo','parcial','insuficiente')),
    ComponentsJson NVARCHAR(MAX) NOT NULL,                         -- pontos e explicação de cada componente
    ModelVersion   NVARCHAR(30) NOT NULL,                          -- ex.: regras-v1
    ComputedBy     INT NULL CONSTRAINT FK_Snap_User REFERENCES dbo.Users(Id),
    ComputedAt     DATETIME2 NOT NULL CONSTRAINT DF_Snap_ComputedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Snap UNIQUE (EmployeeId, SnapshotMonth)
);
GO

/* ---------- Ações de acompanhamento registradas pelo RH (apoio, nunca punição) ---------- */
IF OBJECT_ID('dbo.RetentionFollowUps') IS NULL
CREATE TABLE dbo.RetentionFollowUps (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId INT NOT NULL CONSTRAINT FK_FollowUp_Employee REFERENCES dbo.Employees(Id),
    CreatedBy  INT NOT NULL CONSTRAINT FK_FollowUp_User REFERENCES dbo.Users(Id),
    ActionType NVARCHAR(25) NOT NULL
               CONSTRAINT CK_FollowUp_Type CHECK (ActionType IN
                 ('conversa_1_1','revisao_carga','revisao_salarial','plano_desenvolvimento','outro')),
    Note       NVARCHAR(500) NOT NULL,                             -- a tela orienta a NÃO registrar dado de saúde
    CreatedAt  DATETIME2 NOT NULL CONSTRAINT DF_FollowUp_CreatedAt DEFAULT SYSUTCDATETIME()
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_FollowUp_Employee' AND object_id = OBJECT_ID('dbo.RetentionFollowUps'))
CREATE INDEX IX_FollowUp_Employee ON dbo.RetentionFollowUps (EmployeeId, CreatedAt DESC);
GO

/* Conferência: deve listar as 4 tabelas */
SELECT name FROM sys.tables
WHERE name IN ('EmployeeMonthlyAttendance','EmployeeCareerEvents','RetentionRiskSnapshots','RetentionFollowUps');
GO
