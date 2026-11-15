/* =====================================================================
   010_seed_demo_passwords.sql
   Atualiza as senhas dos usuários demo para '123456' com hash bcrypt real
   e insere Roberta RH e Carlos Gestor se ainda não existirem.
   ===================================================================== */

USE TotvsRhInteligenteDb;
GO

-- Hash bcrypt de '123456':
DECLARE @DefaultHash NVARCHAR(255) = '$2b$10$/W9.VIodv8klm6FPM8JlEuqfPOR6C1abQoeCrP9WoWCBKK.hoefAW';

-- 1. Atualiza Ana Souza e Bruno Lima
UPDATE dbo.Users
SET PasswordHash = @DefaultHash,
    IsActive = 1,
    MustChangePassword = 0
WHERE Email IN ('ana.souza@exemplo.com', 'bruno.lima@exemplo.com');

-- 2. Insere Roberta RH se não existir
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'roberta.rh@exemplo.com')
BEGIN
    INSERT INTO dbo.Users (Email, PasswordHash, Role, IsActive, MustChangePassword, CreatedAt)
    VALUES ('roberta.rh@exemplo.com', @DefaultHash, 'rh', 1, 0, SYSUTCDATETIME());

    DECLARE @RobertaUserId INT = SCOPE_IDENTITY();
    IF NOT EXISTS (SELECT 1 FROM dbo.Employees WHERE Registration = 'M0003')
    BEGIN
        INSERT INTO dbo.Employees (UserId, FullName, Registration, JobTitle, Department, HireDate, Status)
        VALUES (@RobertaUserId, 'Roberta RH', 'M0003', 'Analista de RH Senior', 'Recursos Humanos', '2021-01-10', 'ativo');
    END
END
ELSE
BEGIN
    UPDATE dbo.Users
    SET PasswordHash = @DefaultHash, IsActive = 1, MustChangePassword = 0, Role = 'rh'
    WHERE Email = 'roberta.rh@exemplo.com';
END

-- 3. Insere Carlos Gestor se não existir
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'carlos.gestor@exemplo.com')
BEGIN
    INSERT INTO dbo.Users (Email, PasswordHash, Role, IsActive, MustChangePassword, CreatedAt)
    VALUES ('carlos.gestor@exemplo.com', @DefaultHash, 'gestor', 1, 0, SYSUTCDATETIME());

    DECLARE @CarlosUserId INT = SCOPE_IDENTITY();
    IF NOT EXISTS (SELECT 1 FROM dbo.Employees WHERE Registration = 'M0004')
    BEGIN
        INSERT INTO dbo.Employees (UserId, FullName, Registration, JobTitle, Department, HireDate, Status)
        VALUES (@CarlosUserId, 'Carlos Gestor', 'M0004', 'Gerente de Tecnologia', 'Tecnologia', '2020-05-15', 'ativo');
    END
END
ELSE
BEGIN
    UPDATE dbo.Users
    SET PasswordHash = @DefaultHash, IsActive = 1, MustChangePassword = 0, Role = 'gestor'
    WHERE Email = 'carlos.gestor@exemplo.com';
END
GO

PRINT 'Senhas e perfis de demonstração atualizados com sucesso!';
