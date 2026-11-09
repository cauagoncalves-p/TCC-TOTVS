/* =====================================================================
   006_onboarding_manual.sql  |  Parte 2C: Onboarding com preenchimento manual
   Banco: TotvsRhInteligenteDb. Idempotente.
   Casos podem nascer sem PDF: SourceFileName passa a aceitar NULL e
   OnboardingCases ganha a coluna Origin ('pdf' | 'manual').
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO

ALTER TABLE dbo.OnboardingCases ALTER COLUMN SourceFileName NVARCHAR(255) NULL;
GO

IF COL_LENGTH('dbo.OnboardingCases', 'Origin') IS NULL
ALTER TABLE dbo.OnboardingCases ADD Origin NVARCHAR(10) NOT NULL
    CONSTRAINT DF_Onboarding_Origin DEFAULT 'pdf'
    CONSTRAINT CK_Onboarding_Origin CHECK (Origin IN ('pdf','manual'));
GO
