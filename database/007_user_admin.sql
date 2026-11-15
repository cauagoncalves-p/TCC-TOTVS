/* =====================================================================
   007_user_admin.sql  |  F11: Administração de usuários e perfis
   Banco: TotvsRhInteligenteDb. Idempotente (pode rodar mais de uma vez).
   Pré-requisito: tabela dbo.Users existente (script 001).
   Usuários já cadastrados continuam ATIVOS e sem troca de senha obrigatória.
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO

/* Usuário ativo? 0 = inativo (não consegue entrar; token existente deixa de valer) */
IF COL_LENGTH('dbo.Users', 'IsActive') IS NULL
ALTER TABLE dbo.Users ADD IsActive BIT NOT NULL
    CONSTRAINT DF_Users_IsActive DEFAULT 1;
GO

/* 1 = precisa trocar a senha no próximo acesso (senha temporária) */
IF COL_LENGTH('dbo.Users', 'MustChangePassword') IS NULL
ALTER TABLE dbo.Users ADD MustChangePassword BIT NOT NULL
    CONSTRAINT DF_Users_MustChangePassword DEFAULT 0;
GO

/* Último login bem-sucedido (UTC) */
IF COL_LENGTH('dbo.Users', 'LastLoginAt') IS NULL
ALTER TABLE dbo.Users ADD LastLoginAt DATETIME2 NULL;
GO

/* Índice para a lista de usuários (filtros por perfil e status) */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_Users_Role_Active' AND object_id = OBJECT_ID('dbo.Users'))
CREATE INDEX IX_Users_Role_Active ON dbo.Users (Role, IsActive);
GO

/* Conferência: deve listar as 3 colunas novas */
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Users'
  AND COLUMN_NAME IN ('IsActive', 'MustChangePassword', 'LastLoginAt');
GO
