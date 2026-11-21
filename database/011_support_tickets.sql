/* =====================================================================
   011_support_tickets.sql  |  Chamados do colaborador para o RH
   Banco: TotvsRhInteligenteDb. Idempotente.
   Pré-requisito: dbo.Users (001). Usa também dbo.Notifications (004) para avisos.
   Regras de acesso (feitas no backend): o colaborador vê só os próprios chamados;
   TODOS os usuários com perfil rh veem todos os chamados.
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO

IF OBJECT_ID('dbo.SupportTickets') IS NULL
CREATE TABLE dbo.SupportTickets (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    RequesterUserId INT NOT NULL CONSTRAINT FK_Tickets_Requester REFERENCES dbo.Users(Id),
    Subject         NVARCHAR(150) NOT NULL,
    Category        NVARCHAR(20)  NOT NULL
                    CONSTRAINT CK_Tickets_Category CHECK (Category IN
                      ('ferias','holerite','beneficios','ponto','documentos','politicas','outros')),
    /* aberto = aguardando o RH | em_atendimento = um RH assumiu | respondido = aguardando o colaborador | resolvido */
    Status          NVARCHAR(20)  NOT NULL CONSTRAINT DF_Tickets_Status DEFAULT 'aberto'
                    CONSTRAINT CK_Tickets_Status CHECK (Status IN ('aberto','em_atendimento','respondido','resolvido')),
    AssignedTo      INT NULL CONSTRAINT FK_Tickets_Assigned REFERENCES dbo.Users(Id),   -- RH responsável (opcional)
    SessionId       UNIQUEIDENTIFIER NULL,        -- conversa do chat que originou o chamado (opcional, sem FK)
    CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Tickets_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Tickets_UpdatedAt DEFAULT SYSUTCDATETIME(),
    LastMessageAt   DATETIME2 NOT NULL CONSTRAINT DF_Tickets_LastMsgAt DEFAULT SYSUTCDATETIME(),
    LastMessageRole NVARCHAR(12)  NOT NULL CONSTRAINT DF_Tickets_LastMsgRole DEFAULT 'colaborador'
                    CONSTRAINT CK_Tickets_LastRole CHECK (LastMessageRole IN ('colaborador','rh')),
    ResolvedAt      DATETIME2 NULL,
    ResolvedBy      INT NULL CONSTRAINT FK_Tickets_ResolvedBy REFERENCES dbo.Users(Id)
);
GO

IF OBJECT_ID('dbo.TicketMessages') IS NULL
CREATE TABLE dbo.TicketMessages (
    Id           BIGINT IDENTITY(1,1) PRIMARY KEY,
    TicketId     INT NOT NULL CONSTRAINT FK_TicketMsg_Ticket REFERENCES dbo.SupportTickets(Id),
    AuthorUserId INT NOT NULL CONSTRAINT FK_TicketMsg_Author REFERENCES dbo.Users(Id),
    AuthorRole   NVARCHAR(12)  NOT NULL
                 CONSTRAINT CK_TicketMsg_Role CHECK (AuthorRole IN ('colaborador','rh')),
    Content      NVARCHAR(2000) NOT NULL,          -- texto puro (sem HTML)
    CreatedAt    DATETIME2 NOT NULL CONSTRAINT DF_TicketMsg_CreatedAt DEFAULT SYSUTCDATETIME()
);
GO

/* "Meus chamados" do colaborador */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Tickets_Requester' AND object_id = OBJECT_ID('dbo.SupportTickets'))
CREATE INDEX IX_Tickets_Requester ON dbo.SupportTickets (RequesterUserId, LastMessageAt DESC);
GO
/* Fila do RH (filtro por status) */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Tickets_Status' AND object_id = OBJECT_ID('dbo.SupportTickets'))
CREATE INDEX IX_Tickets_Status ON dbo.SupportTickets (Status, LastMessageAt DESC);
GO
/* Chamados assumidos por cada RH */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Tickets_Assigned' AND object_id = OBJECT_ID('dbo.SupportTickets'))
CREATE INDEX IX_Tickets_Assigned ON dbo.SupportTickets (AssignedTo, Status);
GO
/* Conversa de um chamado */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TicketMessages_Ticket' AND object_id = OBJECT_ID('dbo.TicketMessages'))
CREATE INDEX IX_TicketMessages_Ticket ON dbo.TicketMessages (TicketId, CreatedAt);
GO

/* Conferência: deve listar as 2 tabelas */
SELECT name FROM sys.tables WHERE name IN ('SupportTickets', 'TicketMessages');
GO
