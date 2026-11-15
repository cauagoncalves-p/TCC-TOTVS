/* =====================================================================
   008_auth_hardening.sql  |  F13: 2FA e recuperação de senha
   Banco: TotvsRhInteligenteDb. Idempotente.
   Pré-requisito: dbo.Users (001). Recomendado aplicar depois do 007 (F11).
   Segredos NUNCA em texto puro:
     - TwoFactorSecretEnc: segredo TOTP CRIPTOGRAFADO pela aplicação (AES-256-GCM)
     - CodeHash e TokenHash: somente hash (SHA-256 em hexadecimal, 64 caracteres)
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO

/* ---------- Colunas novas em Users ---------- */
IF COL_LENGTH('dbo.Users', 'TwoFactorEnabled') IS NULL
ALTER TABLE dbo.Users ADD TwoFactorEnabled BIT NOT NULL
    CONSTRAINT DF_Users_TwoFactorEnabled DEFAULT 0;
GO

IF COL_LENGTH('dbo.Users', 'TwoFactorSecretEnc') IS NULL
ALTER TABLE dbo.Users ADD TwoFactorSecretEnc NVARCHAR(500) NULL;
GO

/* Versão do token: incrementar invalida todos os JWT antigos do usuário
   (troca de senha, desativação do 2FA). O JWT carrega esse valor. */
IF COL_LENGTH('dbo.Users', 'TokenVersion') IS NULL
ALTER TABLE dbo.Users ADD TokenVersion INT NOT NULL
    CONSTRAINT DF_Users_TokenVersion DEFAULT 0;
GO

/* Proteção contra força bruta no login */
IF COL_LENGTH('dbo.Users', 'FailedLoginCount') IS NULL
ALTER TABLE dbo.Users ADD FailedLoginCount INT NOT NULL
    CONSTRAINT DF_Users_FailedLoginCount DEFAULT 0;
GO

IF COL_LENGTH('dbo.Users', 'LockedUntil') IS NULL
ALTER TABLE dbo.Users ADD LockedUntil DATETIME2 NULL;
GO

/* 2FA ativo exige segredo gravado */
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints
               WHERE name = 'CK_Users_2FA_Secret' AND parent_object_id = OBJECT_ID('dbo.Users'))
ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_2FA_Secret
    CHECK (TwoFactorEnabled = 0 OR TwoFactorSecretEnc IS NOT NULL);
GO

/* ---------- Códigos de recuperação do 2FA (uso único) ---------- */
IF OBJECT_ID('dbo.UserRecoveryCodes') IS NULL
CREATE TABLE dbo.UserRecoveryCodes (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    UserId    INT NOT NULL CONSTRAINT FK_RecoveryCodes_User REFERENCES dbo.Users(Id),
    CodeHash  CHAR(64) NOT NULL,                    -- SHA-256 hex do código
    UsedAt    DATETIME2 NULL,                       -- preenchido ao usar (uso único)
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_RecoveryCodes UNIQUE (UserId, CodeHash)
);
GO

/* ---------- Tokens de redefinição de senha (uso único, validade curta) ---------- */
IF OBJECT_ID('dbo.PasswordResetTokens') IS NULL
CREATE TABLE dbo.PasswordResetTokens (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    UserId    INT NOT NULL CONSTRAINT FK_ResetTokens_User REFERENCES dbo.Users(Id),
    TokenHash CHAR(64) NOT NULL CONSTRAINT UQ_ResetTokens_Hash UNIQUE,  -- SHA-256 hex
    ExpiresAt DATETIME2 NOT NULL,                   -- ex.: criação + 30 minutos
    UsedAt    DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_ResetTokens_User' AND object_id = OBJECT_ID('dbo.PasswordResetTokens'))
CREATE INDEX IX_ResetTokens_User ON dbo.PasswordResetTokens (UserId, ExpiresAt);
GO

/* Conferência: deve listar as 5 colunas novas em Users */
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Users'
  AND COLUMN_NAME IN ('TwoFactorEnabled','TwoFactorSecretEnc','TokenVersion','FailedLoginCount','LockedUntil');
GO
