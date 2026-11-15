/* =====================================================================
   009_email_outbox.sql  |  F14: Notificações por e-mail
   Banco: TotvsRhInteligenteDb. Idempotente.
   Pré-requisitos: dbo.Users (001) e dbo.Notifications (004, Parte 4).
   O e-mail leva apenas tipo de aviso, dado agregado e link (sem dado pessoal).
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO

/* ---------- Preferências por usuário e tipo de aviso ----------
   Sem linha = usa o padrão do perfil (definido na aplicação).
   Tipos (validados na aplicação): alerta_risco_alto, obrigacao_proxima,
   obrigacao_atrasada, chamado_respondido, solicitacao_decidida. */
IF OBJECT_ID('dbo.NotificationPreferences') IS NULL
CREATE TABLE dbo.NotificationPreferences (
    UserId       INT NOT NULL CONSTRAINT FK_NotifPrefs_User REFERENCES dbo.Users(Id),
    Type         NVARCHAR(30) NOT NULL,
    EmailEnabled BIT NOT NULL DEFAULT 1,
    UpdatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_NotificationPreferences PRIMARY KEY (UserId, Type)
);
GO

/* ---------- Fila de e-mails (padrão outbox) ----------
   A aplicação grava aqui; um worker envia pendentes com reenvio e espera crescente. */
IF OBJECT_ID('dbo.EmailOutbox') IS NULL
CREATE TABLE dbo.EmailOutbox (
    Id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId        INT NOT NULL CONSTRAINT FK_EmailOutbox_User REFERENCES dbo.Users(Id),
    ToEmail       NVARCHAR(150) NOT NULL,
    Type          NVARCHAR(30)  NOT NULL,
    Subject       NVARCHAR(200) NOT NULL,
    BodyText      NVARCHAR(MAX) NOT NULL,           -- texto simples, sem dado pessoal
    Status        NVARCHAR(10)  NOT NULL DEFAULT 'pendente'
                  CONSTRAINT CK_EmailOutbox_Status CHECK (Status IN ('pendente','enviado','falhou')),
    Attempts      INT NOT NULL DEFAULT 0,           -- máximo de 5 (regra da aplicação)
    NextAttemptAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),   -- espera crescente entre tentativas
    LastError     NVARCHAR(300) NULL,               -- mensagem curta, sem dados pessoais
    RefType       NVARCHAR(30)  NULL,               -- ex.: obrigacao, alerta, chamado, solicitacao
    RefId         INT NULL,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    SentAt        DATETIME2 NULL
);
GO

/* Mesmo evento nunca envia duas vezes (só vale quando há referência) */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'UX_EmailOutbox_Dedup' AND object_id = OBJECT_ID('dbo.EmailOutbox'))
CREATE UNIQUE INDEX UX_EmailOutbox_Dedup
    ON dbo.EmailOutbox (UserId, Type, RefType, RefId)
    WHERE RefType IS NOT NULL AND RefId IS NOT NULL;
GO

/* Busca rápida do worker: pendentes prontos para tentar */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_EmailOutbox_Pending' AND object_id = OBJECT_ID('dbo.EmailOutbox'))
CREATE INDEX IX_EmailOutbox_Pending
    ON dbo.EmailOutbox (NextAttemptAt) WHERE Status = 'pendente';
GO

/* Listagem de falhas para o RH */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_EmailOutbox_Status' AND object_id = OBJECT_ID('dbo.EmailOutbox'))
CREATE INDEX IX_EmailOutbox_Status ON dbo.EmailOutbox (Status, CreatedAt DESC);
GO

/* Conferência: deve listar as 2 tabelas */
SELECT name FROM sys.tables WHERE name IN ('NotificationPreferences', 'EmailOutbox');
GO
