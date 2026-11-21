/* =====================================================================
   S06_conhecimento.sql  |  5 políticas FICTÍCIAS na base de conhecimento (Parte 4B), já "indexadas"
   Texto escrito direto nas tabelas (KnowledgeDocuments + KnowledgeChunks), sem PDF.
   Nenhum texto de lei ou norma oficial é gerado aqui: são políticas internas inventadas para teste.
     1) Aprendizes e eventos externos ... público: todos
     2) Trabalho remoto (home office) ... público: colaboradores
     3) Vale-transporte ................. público: todos
     4) Código de vestimenta ............ público: colaboradores
     5) Aprovação de horas extras ....... público: somente RH
   IMPORTANTE: como os dados entram direto no banco, REINICIE o backend depois deste script
   (o índice de busca da IA pode estar guardado em memória).
   Pré-requisitos: S01 aplicado e script 010 (Parte 4B).
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO
SET NOCOUNT ON;
SET NOEXEC OFF;
GO

IF OBJECT_ID('dbo.SeedConfig') IS NULL OR OBJECT_ID('dbo.KnowledgeDocuments') IS NULL OR OBJECT_ID('dbo.KnowledgeChunks') IS NULL
   OR COL_LENGTH('dbo.KnowledgeDocuments', 'Audience') IS NULL OR COL_LENGTH('dbo.KnowledgeDocuments', 'SourceKind') IS NULL
   OR NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = N'rh.seed@seed.exemplo.com')
BEGIN
    RAISERROR(N'Pré-requisitos ausentes: rode o S01 e aplique o script 010 (Parte 4B).', 16, 1);
    SET NOEXEC ON;
END
GO

IF EXISTS (SELECT 1 FROM dbo.KnowledgeDocuments WHERE SourceOrg = N'RH (empresa fictícia, seed)')
BEGIN
    RAISERROR(N'O S06 já foi aplicado. Rode S00_reset.sql e depois S01 a S06 de novo.', 16, 1);
    SET NOEXEC ON;
END
GO

SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

DECLARE @Today DATE = (SELECT CAST(Value AS DATE) FROM dbo.SeedConfig WHERE KeyName = N'Today');
DECLARE @Rh INT = (SELECT Id FROM dbo.Users WHERE Email = N'rh.seed@seed.exemplo.com');
DECLARE @Org NVARCHAR(150) = N'RH (empresa fictícia, seed)';

INSERT INTO dbo.KnowledgeDocuments
    (Title, DocType, SourceOrg, SourceUrl, Version, PublishedAt, EffectiveFrom, EffectiveTo, IsCurrent, FileName, UploadedBy,
     Audience, SourceKind, IndexStatus, ChunkCount, ExtractionMethod, IsArchived, UpdatedAt)
SELECT v.Title, N'politica_interna', @Org, NULL, N'1.0', DATEADD(DAY, -2, @Today), DATEADD(DAY, -2, @Today), NULL, 1, NULL, @Rh,
       v.Audience, N'texto', N'indexado', 0, N'texto', 0, SYSUTCDATETIME()
FROM (VALUES
  (N'Política interna: aprendizes e eventos externos',           N'todos'),
  (N'Política interna: trabalho remoto (home office)',           N'colaboradores'),
  (N'Política interna: vale-transporte',                         N'todos'),
  (N'Política interna: código de vestimenta',                    N'colaboradores'),
  (N'Política interna: aprovação de horas extras (uso do RH)',   N'rh')
) v(Title, Audience);

INSERT INTO dbo.KnowledgeChunks (DocumentId, ChunkIndex, Page, SectionRef, Content)
SELECT d.Id, c.Idx, 1, c.Section, c.Content
FROM (VALUES
 (N'Política interna: aprendizes e eventos externos', 0, N'Resumo rápido',
  N'Aprendizes não podem participar de eventos externos. Pela política interna da empresa, o aprendiz (jovem aprendiz) não participa de eventos realizados fora da empresa, como feiras, congressos, convenções, viagens e ações em clientes ou parceiros. Eventos internos, dentro da empresa, seguem permitidos com a ciência do orientador. Em caso de dúvida, procure o RH.'),
 (N'Política interna: aprendizes e eventos externos', 1, N'Objetivo e abrangência',
  N'Para que serve esta política? Ela define que aprendizes não participam de eventos externos e orienta aprendizes, orientadores e gestores sobre como agir quando houver convite ou necessidade de participação em um evento fora da empresa. A quem se aplica? A todos os aprendizes da empresa (jovens aprendizes em programa de aprendizagem), aos orientadores, aos gestores e às áreas que convidam ou escalam pessoas para eventos.'),
 (N'Política interna: aprendizes e eventos externos', 2, N'Definições: evento externo e evento interno',
  N'O que é um evento externo? É qualquer evento realizado fora das dependências da empresa, organizado pela empresa ou por terceiros: feiras, congressos, convenções, seminários, workshops externos, viagens a trabalho, visitas e ações em clientes ou parceiros, confraternizações fora da empresa e eventos de fornecedores. O que é um evento interno? É o que acontece dentro das dependências da empresa, como treinamentos, palestras, reuniões de integração e ações de equipe na sede ou em unidade da empresa.'),
 (N'Política interna: aprendizes e eventos externos', 3, N'A regra: eventos externos',
  N'O aprendiz pode participar de eventos externos? Não. Pela política interna, o aprendiz não participa de eventos externos em nome da empresa nem durante a jornada de trabalho. Isso vale para qualquer tipo de evento externo, mesmo quando o convite vem de um cliente, fornecedor ou parceiro. Existe alguma exceção? Esta versão da política não prevê exceções. Qualquer situação diferente deve ser levada ao RH antes de qualquer confirmação de presença. O aprendiz não deve confirmar participação por conta própria.'),
 (N'Política interna: aprendizes e eventos externos', 4, N'Eventos internos e aulas do programa',
  N'O aprendiz pode participar de um evento interno? Sim, desde que o orientador esteja ciente e a participação não prejudique a rotina do programa de aprendizagem. As aulas e atividades da parte teórica do programa de aprendizagem, organizadas pela instituição formadora, não são consideradas eventos externos para os fins desta política e seguem a programação da instituição.'),
 (N'Política interna: aprendizes e eventos externos', 5, N'O que fazer na prática',
  N'O que o aprendiz deve fazer ao receber um convite para um evento externo? Não confirmar presença, informar o orientador ou gestor e o RH, para que a empresa responda ao convidante ou indique outro colaborador. O que o gestor deve fazer? Não incluir aprendizes na escala nem na lista de participantes de eventos externos e indicar colaboradores que não sejam aprendizes. Quem esclarece dúvidas? O RH, por chamado ou pelo canal de atendimento da empresa.'),
 (N'Política interna: aprendizes e eventos externos', 6, N'Aviso',
  N'Este é um documento fictício, criado apenas para demonstração do sistema, e descreve uma política interna da empresa de exemplo. Não é texto de lei e não substitui a legislação trabalhista nem a análise de um profissional especializado. A política vale para a participação em nome da empresa ou durante a jornada de trabalho; atividades pessoais fora do expediente não são objeto desta política.'),

 (N'Política interna: trabalho remoto (home office)', 0, N'Resumo rápido',
  N'Política interna fictícia de trabalho remoto (home office). Colaboradores elegíveis podem trabalhar de casa até 2 dias por semana, com combinação prévia com o gestor. Aprendizes seguem as regras específicas do programa de aprendizagem e devem falar com o RH antes de qualquer pedido de trabalho remoto.'),
 (N'Política interna: trabalho remoto (home office)', 1, N'Quem pode e como pedir',
  N'Quem pode trabalhar em home office? Colaboradores com mais de 3 meses de empresa, em funções que permitem trabalho remoto, com aprovação do gestor. Como pedir? O colaborador combina os dias com o gestor e registra o combinado no sistema de ponto. Mudanças de dia devem ser avisadas com antecedência de pelo menos 1 dia útil.'),
 (N'Política interna: trabalho remoto (home office)', 2, N'Equipamentos e segurança',
  N'No home office o colaborador usa o equipamento da empresa e acesso seguro (VPN). Dados da empresa não devem ser guardados em dispositivos pessoais. A empresa pode revisar o acordo de home office se houver prejuízo ao trabalho. Documento fictício para demonstração, não é lei.'),

 (N'Política interna: vale-transporte', 0, N'Resumo rápido',
  N'Política interna fictícia de vale-transporte. O colaborador que usa transporte público para ir e voltar do trabalho pode optar pelo vale-transporte. O desconto aparece no holerite na rubrica Vale-transporte (código 2020), calculado conforme a regra de benefícios da empresa.'),
 (N'Política interna: vale-transporte', 1, N'Como solicitar e atualizar',
  N'Como pedir o vale-transporte? Informe ao RH o endereço e o trajeto. Mudou de endereço ou de trajeto? Avise o RH para atualizar o cadastro; a mudança vale a partir da competência seguinte à comunicação. Quem não usa transporte público pode renunciar ao benefício por escrito.'),
 (N'Política interna: vale-transporte', 2, N'Dúvidas sobre o desconto',
  N'Por que o desconto de vale-transporte veio com determinado valor? O valor segue a regra de benefícios da empresa e aparece no holerite do mês, na rubrica Vale-transporte. Se achar que o valor está errado, abra um chamado com o RH informando a competência do holerite. Documento fictício para demonstração, não é lei.'),

 (N'Política interna: código de vestimenta', 0, N'Resumo rápido',
  N'Política interna fictícia de código de vestimenta. No escritório, o vestuário é casual profissional: roupas limpas e adequadas ao ambiente de trabalho. Em dias de reunião com clientes, recomenda-se traje social ou casual elegante.'),
 (N'Política interna: código de vestimenta', 1, N'Exceções e dúvidas',
  N'Uniformes e equipamentos de proteção seguem a orientação de cada área. Dúvidas sobre o que é adequado devem ser tiradas com o gestor ou com o RH. Documento fictício para demonstração, não é lei.'),

 (N'Política interna: aprovação de horas extras (uso do RH)', 0, N'Resumo rápido',
  N'Política interna fictícia de aprovação de horas extras (uso do RH). Horas extras devem ser aprovadas previamente pelo gestor da área e registradas no ponto. O RH confere os registros antes do fechamento da folha.'),
 (N'Política interna: aprovação de horas extras (uso do RH)', 1, N'Acompanhamento',
  N'Departamentos com horas extras acima do esperado por vários meses devem ser avaliados pelo RH junto ao gestor, para redistribuir atividades ou avaliar reforço de equipe. Este é um material de apoio ao RH, fictício, e não é lei.')
) c(Title, Idx, Section, Content)
JOIN dbo.KnowledgeDocuments d ON d.Title = c.Title AND d.SourceOrg = @Org;

UPDATE d
SET ChunkCount = (SELECT COUNT(*) FROM dbo.KnowledgeChunks k WHERE k.DocumentId = d.Id),
    BodyText = STUFF((SELECT NCHAR(10) + NCHAR(10) + k.Content
                      FROM dbo.KnowledgeChunks k WHERE k.DocumentId = d.Id ORDER BY k.ChunkIndex
                      FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, N'')
FROM dbo.KnowledgeDocuments d
WHERE d.SourceOrg = @Org;

COMMIT TRANSACTION;
PRINT N'S06 concluído com sucesso. Reinicie o backend para o índice de busca recarregar.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH
GO

SELECT Id, Title, Audience, IndexStatus, ChunkCount, IsCurrent FROM dbo.KnowledgeDocuments
WHERE SourceOrg = N'RH (empresa fictícia, seed)' ORDER BY Id;
SET NOEXEC OFF;
GO
