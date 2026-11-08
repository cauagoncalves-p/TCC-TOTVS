/* =====================================================================
   001_chatbot_schema.sql  |  Parte 1: Chatbot de RH
   Banco: TotvsRhInteligenteDb (SQL Server)
   Idempotente: pode rodar mais de uma vez sem quebrar.
   ATENÇÃO: se você já tem a tabela Users do login, NÃO recrie.
            Confira se ela tem Id, Email e Role e ajuste o FK de Employees.
   Todos os dados do seed são FICTÍCIOS.
   ===================================================================== */

IF DB_ID('TotvsRhInteligenteDb') IS NULL
    CREATE DATABASE TotvsRhInteligenteDb;
GO
USE TotvsRhInteligenteDb;
GO

/* ---------- Usuários (login) ---------- */
IF OBJECT_ID('dbo.Users') IS NULL
CREATE TABLE dbo.Users (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    Email        NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role         NVARCHAR(20)  NOT NULL
                 CONSTRAINT CK_Users_Role CHECK (Role IN ('colaborador','rh','gestor')),
    CreatedAt    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* ---------- Colaboradores ---------- */
IF OBJECT_ID('dbo.Employees') IS NULL
CREATE TABLE dbo.Employees (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    UserId       INT NOT NULL UNIQUE
                 CONSTRAINT FK_Employees_Users REFERENCES dbo.Users(Id),
    FullName     NVARCHAR(150) NOT NULL,
    Registration NVARCHAR(20)  NOT NULL UNIQUE,   -- matrícula
    JobTitle     NVARCHAR(100) NOT NULL,
    Department   NVARCHAR(100) NOT NULL,
    HireDate     DATE          NOT NULL,
    Status       NVARCHAR(20)  NOT NULL DEFAULT 'ativo'
                 CONSTRAINT CK_Employees_Status CHECK (Status IN ('ativo','afastado','desligado'))
);
GO

/* ---------- Férias ---------- */
IF OBJECT_ID('dbo.VacationBalances') IS NULL
CREATE TABLE dbo.VacationBalances (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId         INT NOT NULL
                       CONSTRAINT FK_Vacation_Employees REFERENCES dbo.Employees(Id),
    PeriodStart        DATE NOT NULL,   -- início do período aquisitivo
    PeriodEnd          DATE NOT NULL,   -- fim do período aquisitivo
    DaysEntitled       INT  NOT NULL DEFAULT 30,
    DaysTaken          INT  NOT NULL DEFAULT 0,
    DaysRemaining      AS (DaysEntitled - DaysTaken) PERSISTED,
    CONSTRAINT UQ_Vacation_Period UNIQUE (EmployeeId, PeriodStart)
);
GO

/* ---------- Holerites ---------- */
IF OBJECT_ID('dbo.Payslips') IS NULL
CREATE TABLE dbo.Payslips (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId      INT NOT NULL
                    CONSTRAINT FK_Payslips_Employees REFERENCES dbo.Employees(Id),
    Competence      CHAR(7) NOT NULL,                 -- 'YYYY-MM'
    GrossAmount     DECIMAL(12,2) NOT NULL,
    TotalDeductions DECIMAL(12,2) NOT NULL,
    NetAmount       AS (GrossAmount - TotalDeductions) PERSISTED,
    CONSTRAINT UQ_Payslips UNIQUE (EmployeeId, Competence)
);
GO

IF OBJECT_ID('dbo.PayslipItems') IS NULL
CREATE TABLE dbo.PayslipItems (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    PayslipId   INT NOT NULL
                CONSTRAINT FK_PayslipItems_Payslips REFERENCES dbo.Payslips(Id),
    Code        NVARCHAR(10)  NOT NULL,               -- rubrica (ex.: 1000, 2010)
    Description NVARCHAR(100) NOT NULL,               -- ex.: 'Vale-transporte'
    Kind        CHAR(1)       NOT NULL
                CONSTRAINT CK_PayslipItems_Kind CHECK (Kind IN ('P','D')),  -- Provento / Desconto
    Amount      DECIMAL(12,2) NOT NULL
);
GO

/* ---------- Chat ---------- */
IF OBJECT_ID('dbo.ChatSessions') IS NULL
CREATE TABLE dbo.ChatSessions (
    Id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    UserId    INT NOT NULL
              CONSTRAINT FK_ChatSessions_Users REFERENCES dbo.Users(Id),
    StartedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('dbo.ChatMessages') IS NULL
CREATE TABLE dbo.ChatMessages (
    Id        BIGINT IDENTITY(1,1) PRIMARY KEY,
    SessionId UNIQUEIDENTIFIER NOT NULL
              CONSTRAINT FK_ChatMessages_Sessions REFERENCES dbo.ChatSessions(Id),
    Role      NVARCHAR(10) NOT NULL
              CONSTRAINT CK_ChatMessages_Role CHECK (Role IN ('user','model')),
    Content   NVARCHAR(MAX) NOT NULL,
    ToolUsed  NVARCHAR(100) NULL,     -- qual ferramenta o bot chamou (auditoria)
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE INDEX IX_ChatMessages_Session ON dbo.ChatMessages (SessionId, CreatedAt);
GO

/* =====================================================================
   SEED FICTÍCIO (PasswordHash é placeholder: gere hashes bcrypt reais
   via script Node e atualize; nunca guarde senha em texto puro)
   ===================================================================== */
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'ana.souza@exemplo.com')
BEGIN
    INSERT INTO dbo.Users (Email, PasswordHash, Role) VALUES
        ('ana.souza@exemplo.com',  'TROCAR_HASH_BCRYPT', 'colaborador'),
        ('bruno.lima@exemplo.com', 'TROCAR_HASH_BCRYPT', 'colaborador');

    INSERT INTO dbo.Employees (UserId, FullName, Registration, JobTitle, Department, HireDate)
    SELECT u.Id, v.FullName, v.Reg, v.JobTitle, v.Dept, v.Hire
    FROM (VALUES
        ('ana.souza@exemplo.com',  'Ana Souza',  'M0001', 'Analista de Suporte', 'Tecnologia', '2022-03-14'),
        ('bruno.lima@exemplo.com', 'Bruno Lima', 'M0002', 'Desenvolvedor',       'Tecnologia', '2023-08-01')
    ) AS v(Email, FullName, Reg, JobTitle, Dept, Hire)
    JOIN dbo.Users u ON u.Email = v.Email;

    INSERT INTO dbo.VacationBalances (EmployeeId, PeriodStart, PeriodEnd, DaysEntitled, DaysTaken)
    SELECT e.Id, '2025-03-14', '2026-03-13', 30, CASE e.Registration WHEN 'M0001' THEN 10 ELSE 0 END
    FROM dbo.Employees e;

    INSERT INTO dbo.Payslips (EmployeeId, Competence, GrossAmount, TotalDeductions)
    SELECT e.Id, '2026-10', 5000.00, 1050.00 FROM dbo.Employees e;

    INSERT INTO dbo.PayslipItems (PayslipId, Code, Description, Kind, Amount)
    SELECT p.Id, i.Code, i.Descr, i.Kind, i.Amount
    FROM dbo.Payslips p
    CROSS JOIN (VALUES
        ('1000', 'Salário base',     'P', 5000.00),
        ('2010', 'INSS',             'D',  550.00),
        ('2020', 'Vale-transporte',  'D',  300.00),
        ('2030', 'Coparticipação plano de saúde', 'D', 200.00)
    ) AS i(Code, Descr, Kind, Amount);
END
GO
