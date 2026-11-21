/* =====================================================================
   S07_chamados.sql  |  6 chamados de exemplo (opcional), com conversas e notificações
   Pré-requisitos: S01 aplicado e script 011 (chamados). Rode depois do S01.
     #1 aberto (sem resposta) | #2 respondido, assumido por rh.seed | #3 em atendimento, assumido por rh2.seed
     #4 resolvido | #5 aberto, de um APRENDIZ sobre convite para evento externo | #6 respondido
   Notificações: 2 para cada RH (chamados novos) e 1 para cada colaborador com resposta.
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO
SET NOCOUNT ON;
SET NOEXEC OFF;
GO

IF OBJECT_ID('dbo.SupportTickets') IS NULL OR OBJECT_ID('dbo.TicketMessages') IS NULL OR OBJECT_ID('dbo.Notifications') IS NULL
   OR NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = N'rh.seed@seed.exemplo.com')
BEGIN
    RAISERROR(N'Pré-requisitos ausentes: rode o S01 e aplique o script 011 (e o 004 das notificações).', 16, 1);
    SET NOEXEC ON;
END
GO

IF EXISTS (SELECT 1 FROM dbo.SupportTickets t JOIN dbo.Users u ON u.Id = t.RequesterUserId WHERE u.Email LIKE N'%@seed.exemplo.com')
BEGIN
    RAISERROR(N'O S07 já foi aplicado. Rode S00_reset.sql e depois S01 a S07 de novo.', 16, 1);
    SET NOEXEC ON;
END
GO

SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

INSERT INTO dbo.SupportTickets
    (RequesterUserId, Subject, Category, Status, AssignedTo, CreatedAt, UpdatedAt, LastMessageAt, LastMessageRole, ResolvedAt, ResolvedBy)
SELECT u.Id, v.Subject, v.Category, v.Status, a.Id,
       DATEADD(HOUR, -v.AgeH, SYSUTCDATETIME()), DATEADD(HOUR, -v.LastH, SYSUTCDATETIME()),
       DATEADD(HOUR, -v.LastH, SYSUTCDATETIME()), v.LastRole,
       CASE WHEN v.Status = N'resolvido' THEN DATEADD(HOUR, -v.LastH, SYSUTCDATETIME()) END,
       CASE WHEN v.Status = N'resolvido' THEN a.Id END
FROM (VALUES
  (N'colab.0001@seed.exemplo.com', N'Dúvida sobre meu saldo de férias',             N'ferias',     N'aberto',         NULL,                           50, 50, N'colaborador'),
  (N'colab.0002@seed.exemplo.com', N'Desconto estranho no holerite do mês passado', N'holerite',   N'respondido',     N'rh.seed@seed.exemplo.com',    30,  6, N'rh'),
  (N'colab.0003@seed.exemplo.com', N'Mudei de endereço: atualizar vale-transporte', N'beneficios', N'em_atendimento', N'rh2.seed@seed.exemplo.com',   20, 20, N'colaborador'),
  (N'colab.0004@seed.exemplo.com', N'Preciso de uma declaração de vínculo',         N'documentos', N'resolvido',      N'rh.seed@seed.exemplo.com',   120, 96, N'colaborador'),
  (N'colab.0005@seed.exemplo.com', N'Recebi convite para um evento de cliente',     N'politicas',  N'aberto',         NULL,                            4,  4, N'colaborador'),
  (N'colab.0001@seed.exemplo.com', N'Esqueci de bater o ponto na sexta-feira',      N'ponto',      N'respondido',     N'rh.seed@seed.exemplo.com',    72, 24, N'rh')
) v(Email, Subject, Category, Status, AssigneeEmail, AgeH, LastH, LastRole)
JOIN dbo.Users u ON u.Email = v.Email
LEFT JOIN dbo.Users a ON a.Email = v.AssigneeEmail;

INSERT INTO dbo.TicketMessages (TicketId, AuthorUserId, AuthorRole, Content, CreatedAt)
SELECT t.Id, au.Id, m.Role, m.Content, DATEADD(HOUR, -m.AgeH, SYSUTCDATETIME())
FROM (VALUES
  (N'Dúvida sobre meu saldo de férias', N'colab.0001@seed.exemplo.com', N'colaborador',
   N'Olá! Gostaria de saber quantos dias de férias ainda tenho e até quando posso tirar.', 50),

  (N'Desconto estranho no holerite do mês passado', N'colab.0002@seed.exemplo.com', N'colaborador',
   N'Bom dia. No holerite do mês passado apareceu um desconto de coparticipação que não reconheço. Podem conferir?', 30),
  (N'Desconto estranho no holerite do mês passado', N'rh.seed@seed.exemplo.com', N'rh',
   N'Olá! Conferi o seu holerite: a rubrica de coparticipação do plano de saúde aparece porque houve uso do plano no mês. Se quiser, envio o detalhamento.', 6),

  (N'Mudei de endereço: atualizar vale-transporte', N'colab.0003@seed.exemplo.com', N'colaborador',
   N'Mudei de endereço e o trajeto mudou. Como atualizo o vale-transporte?', 20),

  (N'Preciso de uma declaração de vínculo', N'colab.0004@seed.exemplo.com', N'colaborador',
   N'Preciso de uma declaração de vínculo com a empresa para apresentar em um banco.', 120),
  (N'Preciso de uma declaração de vínculo', N'rh.seed@seed.exemplo.com', N'rh',
   N'Olá! A declaração foi emitida e enviada ao seu e-mail corporativo.', 100),
  (N'Preciso de uma declaração de vínculo', N'colab.0004@seed.exemplo.com', N'colaborador',
   N'Recebi, muito obrigado!', 96),

  (N'Recebi convite para um evento de cliente', N'colab.0005@seed.exemplo.com', N'colaborador',
   N'Um cliente me convidou para uma feira na próxima semana. Posso ir?', 4),

  (N'Esqueci de bater o ponto na sexta-feira', N'colab.0001@seed.exemplo.com', N'colaborador',
   N'Esqueci de registrar a saída na sexta-feira. Como faço o ajuste?', 72),
  (N'Esqueci de bater o ponto na sexta-feira', N'rh.seed@seed.exemplo.com', N'rh',
   N'Olá! Qual foi o horário real de saída? Com a informação, registro o ajuste.', 24)
) m(Subject, Email, Role, Content, AgeH)
JOIN dbo.SupportTickets t ON t.Subject = m.Subject
JOIN dbo.Users tu ON tu.Id = t.RequesterUserId AND tu.Email LIKE N'%@seed.exemplo.com'
JOIN dbo.Users au ON au.Email = m.Email;

/* Notificações: chamados novos para os dois RH; respostas para os colaboradores */
INSERT INTO dbo.Notifications (UserId, Type, Message, RefType, RefId, IsRead)
SELECT r.Id, N'chamado_novo', N'Novo chamado #' + CAST(t.Id AS NVARCHAR(10)) + N': ' + t.Subject, N'chamado', t.Id, 0
FROM dbo.SupportTickets t
JOIN dbo.Users req ON req.Id = t.RequesterUserId AND req.Email LIKE N'%@seed.exemplo.com'
CROSS JOIN dbo.Users r
WHERE t.Status = N'aberto' AND r.Email IN (N'rh.seed@seed.exemplo.com', N'rh2.seed@seed.exemplo.com');

INSERT INTO dbo.Notifications (UserId, Type, Message, RefType, RefId, IsRead)
SELECT t.RequesterUserId, N'chamado_respondido', N'Seu chamado #' + CAST(t.Id AS NVARCHAR(10)) + N' foi respondido pelo RH', N'chamado', t.Id, 0
FROM dbo.SupportTickets t
JOIN dbo.Users req ON req.Id = t.RequesterUserId AND req.Email LIKE N'%@seed.exemplo.com'
WHERE t.Status = N'respondido';

COMMIT TRANSACTION;
PRINT N'S07 concluído com sucesso.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH
GO

SELECT t.Id, u.Email AS Colaborador, t.Subject, t.Status, a.Email AS Responsavel,
       (SELECT COUNT(*) FROM dbo.TicketMessages m WHERE m.TicketId = t.Id) AS Mensagens
FROM dbo.SupportTickets t
JOIN dbo.Users u ON u.Id = t.RequesterUserId
LEFT JOIN dbo.Users a ON a.Id = t.AssignedTo
WHERE u.Email LIKE N'%@seed.exemplo.com' ORDER BY t.Id;
SET NOEXEC OFF;
GO
