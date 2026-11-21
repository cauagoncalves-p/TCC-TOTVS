/* =====================================================================
   S00_reset.sql  |  Remove SOMENTE os dados criados pelos scripts S01 a S06
   Marcadores: matrícula S0000 (ex.: S0001), e-mail @seed.exemplo.com, obrigações e
   políticas do seed. Seus dados (M0001, ana, bruno, roberta etc.) NÃO são tocados.
   Tudo roda em uma transação: se der erro, nada é apagado.
   Requer SQL Server 2016 SP1 ou mais novo.
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO
BEGIN TRY
BEGIN TRANSACTION;

DECLARE @Emp TABLE (Id INT PRIMARY KEY);
INSERT INTO @Emp SELECT Id FROM dbo.Employees WHERE Registration LIKE N'S[0-9][0-9][0-9][0-9]';
DECLARE @Usr TABLE (Id INT PRIMARY KEY);
INSERT INTO @Usr SELECT Id FROM dbo.Users WHERE Email LIKE N'%@seed.exemplo.com';

IF OBJECT_ID('dbo.Notifications') IS NOT NULL
    DELETE FROM dbo.Notifications WHERE UserId IN (SELECT Id FROM @Usr);

/* Compliance: execuções feitas por usuários do seed e achados dos colaboradores do seed */
IF OBJECT_ID('dbo.ComplianceIssues') IS NOT NULL
BEGIN
    DELETE FROM dbo.ComplianceIssues
    WHERE EmployeeId IN (SELECT Id FROM @Emp)
       OR FirstRunId IN (SELECT Id FROM dbo.ComplianceRuns WHERE StartedBy IN (SELECT Id FROM @Usr))
       OR LastRunId  IN (SELECT Id FROM dbo.ComplianceRuns WHERE StartedBy IN (SELECT Id FROM @Usr));
    UPDATE dbo.ComplianceIssues SET ResolvedBy = NULL WHERE ResolvedBy IN (SELECT Id FROM @Usr);
END
IF OBJECT_ID('dbo.EsocialEvents') IS NOT NULL
BEGIN
    DELETE FROM dbo.EsocialEvents WHERE EmployeeId IN (SELECT Id FROM @Emp);
    UPDATE dbo.EsocialEvents SET ConfirmedBy = NULL WHERE ConfirmedBy IN (SELECT Id FROM @Usr);
    UPDATE dbo.EsocialEvents SET LastRunId = NULL
    WHERE LastRunId IN (SELECT Id FROM dbo.ComplianceRuns WHERE StartedBy IN (SELECT Id FROM @Usr));
END
IF OBJECT_ID('dbo.ComplianceRuns') IS NOT NULL
    DELETE FROM dbo.ComplianceRuns WHERE StartedBy IN (SELECT Id FROM @Usr);
IF OBJECT_ID('dbo.ComplianceAuditLog') IS NOT NULL
    DELETE FROM dbo.ComplianceAuditLog WHERE UserId IN (SELECT Id FROM @Usr);

/* Obrigações do seed */
IF OBJECT_ID('dbo.ObligationInstances') IS NOT NULL
    DELETE FROM dbo.ObligationInstances WHERE ObligationId IN
      (SELECT Id FROM dbo.Obligations WHERE Code IN (N'FOLHA_FECHAMENTO', N'ESOCIAL_PERIODICOS', N'RECOLHIMENTO_MENSAL', N'DECLARACAO_MENSAL'));
IF OBJECT_ID('dbo.Obligations') IS NOT NULL
    DELETE FROM dbo.Obligations WHERE Code IN (N'FOLHA_FECHAMENTO', N'ESOCIAL_PERIODICOS', N'RECOLHIMENTO_MENSAL', N'DECLARACAO_MENSAL');

/* Acompanhamento individual (tabelas do script 012) */
IF OBJECT_ID('dbo.RetentionFollowUps') IS NOT NULL
    DELETE FROM dbo.RetentionFollowUps WHERE EmployeeId IN (SELECT Id FROM @Emp) OR CreatedBy IN (SELECT Id FROM @Usr);
IF OBJECT_ID('dbo.RetentionRiskSnapshots') IS NOT NULL
    DELETE FROM dbo.RetentionRiskSnapshots WHERE EmployeeId IN (SELECT Id FROM @Emp);
IF OBJECT_ID('dbo.EmployeeCareerEvents') IS NOT NULL
    DELETE FROM dbo.EmployeeCareerEvents WHERE EmployeeId IN (SELECT Id FROM @Emp);
IF OBJECT_ID('dbo.EmployeeMonthlyAttendance') IS NOT NULL
    DELETE FROM dbo.EmployeeMonthlyAttendance WHERE EmployeeId IN (SELECT Id FROM @Emp);

/* Dados dos colaboradores */
DELETE FROM dbo.Leaves WHERE EmployeeId IN (SELECT Id FROM @Emp);
DELETE FROM dbo.PayslipItems WHERE PayslipId IN (SELECT Id FROM dbo.Payslips WHERE EmployeeId IN (SELECT Id FROM @Emp));
DELETE FROM dbo.Payslips WHERE EmployeeId IN (SELECT Id FROM @Emp);
DELETE FROM dbo.VacationBalances WHERE EmployeeId IN (SELECT Id FROM @Emp);

/* Onboarding */
IF OBJECT_ID('dbo.EmployeeProfiles') IS NOT NULL
    DELETE FROM dbo.EmployeeProfiles WHERE EmployeeId IN (SELECT Id FROM @Emp);
IF OBJECT_ID('dbo.OnboardingDocuments') IS NOT NULL
    DELETE FROM dbo.OnboardingDocuments WHERE CaseId IN
      (SELECT Id FROM dbo.OnboardingCases WHERE CreatedBy IN (SELECT Id FROM @Usr) OR EmployeeId IN (SELECT Id FROM @Emp));
IF OBJECT_ID('dbo.OnboardingCases') IS NOT NULL
    DELETE FROM dbo.OnboardingCases WHERE CreatedBy IN (SELECT Id FROM @Usr) OR EmployeeId IN (SELECT Id FROM @Emp);

/* Chamados (F01): conversas e chamados dos usuários do seed */
IF OBJECT_ID('dbo.TicketMessages') IS NOT NULL
    DELETE FROM dbo.TicketMessages
    WHERE AuthorUserId IN (SELECT Id FROM @Usr)
       OR TicketId IN (SELECT Id FROM dbo.SupportTickets WHERE RequesterUserId IN (SELECT Id FROM @Usr));
IF OBJECT_ID('dbo.SupportTickets') IS NOT NULL
BEGIN
    UPDATE dbo.SupportTickets SET AssignedTo = NULL WHERE AssignedTo IN (SELECT Id FROM @Usr) AND RequesterUserId NOT IN (SELECT Id FROM @Usr);
    UPDATE dbo.SupportTickets SET ResolvedBy = NULL WHERE ResolvedBy IN (SELECT Id FROM @Usr) AND RequesterUserId NOT IN (SELECT Id FROM @Usr);
    DELETE FROM dbo.SupportTickets WHERE RequesterUserId IN (SELECT Id FROM @Usr);
END

/* Chat */
IF OBJECT_ID('dbo.ChatMessages') IS NOT NULL
    DELETE FROM dbo.ChatMessages WHERE SessionId IN (SELECT Id FROM dbo.ChatSessions WHERE UserId IN (SELECT Id FROM @Usr));
IF OBJECT_ID('dbo.ChatSessions') IS NOT NULL
    DELETE FROM dbo.ChatSessions WHERE UserId IN (SELECT Id FROM @Usr);

/* Base de conhecimento (políticas do seed) */
IF OBJECT_ID('dbo.KnowledgeChunks') IS NOT NULL
    DELETE FROM dbo.KnowledgeChunks WHERE DocumentId IN
      (SELECT Id FROM dbo.KnowledgeDocuments WHERE SourceOrg = N'RH (empresa fictícia, seed)' OR UploadedBy IN (SELECT Id FROM @Usr));
IF OBJECT_ID('dbo.KnowledgeDocuments') IS NOT NULL
    DELETE FROM dbo.KnowledgeDocuments WHERE SourceOrg = N'RH (empresa fictícia, seed)' OR UploadedBy IN (SELECT Id FROM @Usr);

/* Inteligência (Parte 3): métricas, alertas e previsões dos 7 departamentos do seed */
IF OBJECT_ID('dbo.SeedConfig') IS NOT NULL
BEGIN
    DECLARE @Dep TABLE (Id INT PRIMARY KEY);
    INSERT INTO @Dep SELECT Id FROM dbo.Departments
    WHERE Name IN (N'Atendimento', N'Tecnologia', N'Financeiro', N'Comercial', N'Logística', N'RH', N'Projetos Especiais');
    UPDATE dbo.Alerts SET UpdatedBy = NULL WHERE UpdatedBy IN (SELECT Id FROM @Usr);
    DELETE FROM dbo.Alerts WHERE DepartmentId IN (SELECT Id FROM @Dep);
    DELETE FROM dbo.Predictions WHERE DepartmentId IN (SELECT Id FROM @Dep);
    DELETE FROM dbo.DepartmentMonthlyMetrics WHERE DepartmentId IN (SELECT Id FROM @Dep);
END

DELETE FROM dbo.Employees WHERE Id IN (SELECT Id FROM @Emp);
DELETE FROM dbo.Users WHERE Id IN (SELECT Id FROM @Usr);

/* Departamento criado só pelo seed */
IF NOT EXISTS (SELECT 1 FROM dbo.Employees WHERE Department = N'Projetos Especiais')
   AND NOT EXISTS (SELECT 1 FROM dbo.DepartmentMonthlyMetrics m JOIN dbo.Departments d ON d.Id = m.DepartmentId WHERE d.Name = N'Projetos Especiais')
    DELETE FROM dbo.Departments WHERE Name = N'Projetos Especiais';

COMMIT TRANSACTION;
PRINT N'S00: dados do seed removidos.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH
GO

/* Tabelas auxiliares e função do seed (fora da transação) */
IF OBJECT_ID('dbo.SeedExpectedDefects') IS NOT NULL DROP TABLE dbo.SeedExpectedDefects;
IF OBJECT_ID('dbo.SeedExpectedAlerts') IS NOT NULL DROP TABLE dbo.SeedExpectedAlerts;
IF OBJECT_ID('dbo.SeedExpectedAttention') IS NOT NULL DROP TABLE dbo.SeedExpectedAttention;
IF OBJECT_ID('dbo.SeedConfig') IS NOT NULL DROP TABLE dbo.SeedConfig;
IF OBJECT_ID('dbo.fn_SeedCpf') IS NOT NULL DROP FUNCTION dbo.fn_SeedCpf;
PRINT N'S00: tabelas de gabarito e função auxiliar removidas. Pronto para rodar S01 de novo.';
GO
