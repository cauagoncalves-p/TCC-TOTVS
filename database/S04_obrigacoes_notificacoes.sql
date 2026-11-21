/* =====================================================================
   S04_obrigacoes_notificacoes.sql  |  Obrigações (calendário) e notificações da Parte 4
   13 instâncias com datas RELATIVAS ao dia do S01 (rode de novo S00 a S06 antes de uma demonstração):
     4 concluídas (Em dia) | 3 vencendo em até 5 dias (Próximo do vencimento)
     3 vencendo em mais de 15 dias (Pendente) | 3 vencidas e não concluídas (Atrasado)
   Os prazos são ILUSTRATIVOS (SourceVerified = 0): confira prazos reais na fonte oficial.
   Os vencimentos aqui são datas diretas; o ajuste de fim de semana é testado gerando instâncias pelo app.
   Pré-requisito: S01 aplicado.
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO
SET NOCOUNT ON;
SET NOEXEC OFF;
GO

IF OBJECT_ID('dbo.SeedConfig') IS NULL OR OBJECT_ID('dbo.Obligations') IS NULL OR OBJECT_ID('dbo.ObligationInstances') IS NULL
   OR OBJECT_ID('dbo.Notifications') IS NULL
   OR NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = N'rh.seed@seed.exemplo.com')
BEGIN
    RAISERROR(N'Rode o S01 antes (e confirme que o script 004 da Parte 4 foi aplicado).', 16, 1);
    SET NOEXEC ON;
END
GO

SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

DECLARE @Today DATE = (SELECT CAST(Value AS DATE) FROM dbo.SeedConfig WHERE KeyName = N'Today');
DECLARE @CurMonth DATE = DATEFROMPARTS(YEAR(@Today), MONTH(@Today), 1);
DECLARE @RhUser INT = (SELECT Id FROM dbo.Users WHERE Email = N'rh.seed@seed.exemplo.com');

INSERT INTO dbo.Obligations (Code, Name, Frequency, DueDay, DueRuleText, SourceReference, SourceVerified, ResponsibleUserId)
SELECT v.Code, v.Name, N'mensal', v.DueDay,
       N'Prazo ilustrativo do seed: dia ' + CAST(v.DueDay AS NVARCHAR(2)) + N' do mês seguinte (conferir na fonte oficial)',
       N'Ilustrativo (seed). Conferir prazo e regra na fonte oficial.', 0, @RhUser
FROM (VALUES
  (N'FOLHA_FECHAMENTO',      N'Fechamento da folha de pagamento',          5),
  (N'ESOCIAL_PERIODICOS',    N'Envio de eventos periódicos do eSocial',   15),
  (N'RECOLHIMENTO_MENSAL',   N'Recolhimento mensal (ilustrativo)',         7),
  (N'DECLARACAO_MENSAL',     N'Declaração mensal (ilustrativa)',          15)
) v(Code, Name, DueDay)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Obligations o WHERE o.Code = v.Code);

;WITH V AS (
    SELECT x.Code, x.CompOff, x.DueOff, x.Done
    FROM (VALUES
      (N'FOLHA_FECHAMENTO',    -3, -60, 1),
      (N'FOLHA_FECHAMENTO',    -2, -30, 1),
      (N'FOLHA_FECHAMENTO',    -1,   3, 0),
      (N'FOLHA_FECHAMENTO',     0,  20, 0),
      (N'ESOCIAL_PERIODICOS',  -3, -58, 1),
      (N'ESOCIAL_PERIODICOS',  -2,  -8, 0),
      (N'ESOCIAL_PERIODICOS',  -1,   5, 0),
      (N'ESOCIAL_PERIODICOS',   0,  25, 0),
      (N'RECOLHIMENTO_MENSAL', -2, -28, 1),
      (N'RECOLHIMENTO_MENSAL', -1,  -2, 0),
      (N'RECOLHIMENTO_MENSAL',  0,   4, 0),
      (N'DECLARACAO_MENSAL',   -2, -12, 0),
      (N'DECLARACAO_MENSAL',    0,  30, 0)
    ) x(Code, CompOff, DueOff, Done)
)
INSERT INTO dbo.ObligationInstances (ObligationId, Competence, DueDate, Status, CompletedBy, CompletedAt)
SELECT o.Id,
       LEFT(CONVERT(VARCHAR(10), DATEADD(MONTH, V.CompOff, @CurMonth), 23), 7),
       DATEADD(DAY, V.DueOff, @Today),
       CASE WHEN V.Done = 1 THEN N'concluida' ELSE N'pendente' END,
       CASE WHEN V.Done = 1 THEN @RhUser END,
       CASE WHEN V.Done = 1 THEN DATEADD(DAY, -2, SYSUTCDATETIME()) END
FROM V JOIN dbo.Obligations o ON o.Code = V.Code
WHERE NOT EXISTS (SELECT 1 FROM dbo.ObligationInstances i
                  WHERE i.ObligationId = o.Id
                    AND i.Competence = LEFT(CONVERT(VARCHAR(10), DATEADD(MONTH, V.CompOff, @CurMonth), 23), 7));

/* Notificações para a usuária rh.seed: obrigações atrasadas ou vencendo em até 7 dias */
INSERT INTO dbo.Notifications (UserId, Type, Message, RefType, RefId, IsRead)
SELECT @RhUser, t.Typ,
       N'Obrigação "' + o.Name + N'" (' + i.Competence + N'): '
         + CASE WHEN i.DueDate < @Today THEN N'prazo vencido em ' ELSE N'vence em ' END + CONVERT(NVARCHAR(10), i.DueDate, 103),
       N'obrigacao', i.Id,
       CASE WHEN ROW_NUMBER() OVER (ORDER BY i.DueDate) % 2 = 0 THEN 1 ELSE 0 END
FROM dbo.ObligationInstances i
JOIN dbo.Obligations o ON o.Id = i.ObligationId
CROSS APPLY (SELECT CASE WHEN i.DueDate < @Today THEN N'obrigacao_atrasada' ELSE N'prazo_proximo' END AS Typ) t
WHERE o.Code IN (N'FOLHA_FECHAMENTO', N'ESOCIAL_PERIODICOS', N'RECOLHIMENTO_MENSAL', N'DECLARACAO_MENSAL')
  AND i.Status = N'pendente' AND i.DueDate <= DATEADD(DAY, 7, @Today)
  AND NOT EXISTS (SELECT 1 FROM dbo.Notifications n
                  WHERE n.UserId = @RhUser AND n.Type = t.Typ AND n.RefType = N'obrigacao' AND n.RefId = i.Id);

COMMIT TRANSACTION;
PRINT N'S04 concluído com sucesso.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH
GO

SELECT o.Name AS Obrigacao, i.Competence, i.DueDate, i.Status,
       CASE WHEN i.Status = N'concluida' THEN N'Em dia'
            WHEN i.DueDate < CAST(GETDATE() AS DATE) THEN N'Atrasado'
            WHEN i.DueDate <= DATEADD(DAY, 7, CAST(GETDATE() AS DATE)) THEN N'Próximo do vencimento'
            ELSE N'Pendente' END AS StatusExibido
FROM dbo.ObligationInstances i JOIN dbo.Obligations o ON o.Id = i.ObligationId
WHERE o.Code IN (N'FOLHA_FECHAMENTO', N'ESOCIAL_PERIODICOS', N'RECOLHIMENTO_MENSAL', N'DECLARACAO_MENSAL')
ORDER BY i.DueDate;
SET NOEXEC OFF;
GO
