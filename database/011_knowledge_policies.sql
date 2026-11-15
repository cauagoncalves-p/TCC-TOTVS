/* =====================================================================
   010_knowledge_policies.sql  |  Parte 4B: Base de conhecimento e políticas
   Banco: TotvsRhInteligenteDb. Idempotente.
   Pré-requisito: dbo.KnowledgeDocuments e dbo.KnowledgeChunks (script 004).

   ANTES DE RODAR, confira os tipos já gravados (o novo CHECK precisa aceitá-los):
       SELECT DISTINCT DocType FROM dbo.KnowledgeDocuments;
   Se aparecer valor fora desta lista, ajuste a lista do CHECK abaixo ou corrija os dados:
       clt, esocial_manual, esocial_leiaute, nota_tecnica, acordo_convencao, politica_interna, outro
   ===================================================================== */
USE TotvsRhInteligenteDb;
GO

/* ---------- Quem pode "enxergar" o documento nas respostas da IA ----------
   rh = só o assistente trabalhista | colaboradores = só o chat do colaborador | todos = ambos */
IF COL_LENGTH('dbo.KnowledgeDocuments', 'Audience') IS NULL
ALTER TABLE dbo.KnowledgeDocuments ADD Audience NVARCHAR(15) NOT NULL
    CONSTRAINT DF_KDoc_Audience DEFAULT 'rh'
    CONSTRAINT CK_KDoc_Audience CHECK (Audience IN ('rh','colaboradores','todos'));
GO

/* ---------- Origem do conteúdo: arquivo enviado ou texto escrito na plataforma ---------- */
IF COL_LENGTH('dbo.KnowledgeDocuments', 'SourceKind') IS NULL
ALTER TABLE dbo.KnowledgeDocuments ADD SourceKind NVARCHAR(10) NOT NULL
    CONSTRAINT DF_KDoc_SourceKind DEFAULT 'arquivo'
    CONSTRAINT CK_KDoc_SourceKind CHECK (SourceKind IN ('arquivo','texto'));
GO

/* Texto-fonte da política escrita na plataforma (permite editar gerando nova versão) */
IF COL_LENGTH('dbo.KnowledgeDocuments', 'BodyText') IS NULL
ALTER TABLE dbo.KnowledgeDocuments ADD BodyText NVARCHAR(MAX) NULL;
GO

/* ---------- Estado da indexação (o que a IA consegue ler) ---------- */
IF COL_LENGTH('dbo.KnowledgeDocuments', 'IndexStatus') IS NULL
ALTER TABLE dbo.KnowledgeDocuments ADD IndexStatus NVARCHAR(12) NOT NULL
    CONSTRAINT DF_KDoc_IndexStatus DEFAULT 'indexado'
    CONSTRAINT CK_KDoc_IndexStatus CHECK (IndexStatus IN ('processando','indexado','falhou'));
GO

IF COL_LENGTH('dbo.KnowledgeDocuments', 'IndexError') IS NULL
ALTER TABLE dbo.KnowledgeDocuments ADD IndexError NVARCHAR(300) NULL;
GO

IF COL_LENGTH('dbo.KnowledgeDocuments', 'ChunkCount') IS NULL
ALTER TABLE dbo.KnowledgeDocuments ADD ChunkCount INT NOT NULL
    CONSTRAINT DF_KDoc_ChunkCount DEFAULT 0;
GO

IF COL_LENGTH('dbo.KnowledgeDocuments', 'ExtractionMethod') IS NULL
ALTER TABLE dbo.KnowledgeDocuments ADD ExtractionMethod NVARCHAR(12) NULL
    CONSTRAINT CK_KDoc_ExtractionMethod CHECK (ExtractionMethod IN ('texto','ocr_ia'));
GO

IF COL_LENGTH('dbo.KnowledgeDocuments', 'SizeBytes') IS NULL
ALTER TABLE dbo.KnowledgeDocuments ADD SizeBytes BIGINT NULL;
GO

/* ---------- Arquivamento e versionamento ---------- */
IF COL_LENGTH('dbo.KnowledgeDocuments', 'IsArchived') IS NULL
ALTER TABLE dbo.KnowledgeDocuments ADD IsArchived BIT NOT NULL
    CONSTRAINT DF_KDoc_IsArchived DEFAULT 0;
GO

IF COL_LENGTH('dbo.KnowledgeDocuments', 'UpdatedAt') IS NULL
ALTER TABLE dbo.KnowledgeDocuments ADD UpdatedAt DATETIME2 NULL;
GO

IF COL_LENGTH('dbo.KnowledgeDocuments', 'PreviousVersionId') IS NULL
ALTER TABLE dbo.KnowledgeDocuments ADD PreviousVersionId INT NULL
    CONSTRAINT FK_KDoc_PreviousVersion REFERENCES dbo.KnowledgeDocuments(Id);
GO

/* Política escrita na plataforma não tem arquivo */
ALTER TABLE dbo.KnowledgeDocuments ALTER COLUMN FileName NVARCHAR(255) NULL;
GO

/* ---------- Tipos de documento ampliados ----------
   Remove qualquer CHECK existente sobre DocType e recria com a lista nova. */
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'ALTER TABLE dbo.KnowledgeDocuments DROP CONSTRAINT ' + QUOTENAME(name) + N';'
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.KnowledgeDocuments')
  AND definition LIKE '%DocType%';
EXEC sp_executesql @sql;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints
               WHERE name = 'CK_KDoc_Type_v2' AND parent_object_id = OBJECT_ID('dbo.KnowledgeDocuments'))
ALTER TABLE dbo.KnowledgeDocuments ADD CONSTRAINT CK_KDoc_Type_v2 CHECK (DocType IN
    ('clt','esocial_manual','esocial_leiaute','nota_tecnica','acordo_convencao','politica_interna','outro'));
GO

/* ---------- Acerto dos documentos já existentes ---------- */
UPDATE d SET ChunkCount = x.cnt
FROM dbo.KnowledgeDocuments d
CROSS APPLY (SELECT COUNT(*) AS cnt FROM dbo.KnowledgeChunks c WHERE c.DocumentId = d.Id) x;
GO

/* Documento de arquivo sem nenhum trecho = a IA não consegue ler: marcar como falha */
UPDATE dbo.KnowledgeDocuments
SET IndexStatus = 'falhou', IndexError = 'Nenhum trecho indexado. Reenvie o documento.'
WHERE ChunkCount = 0 AND SourceKind = 'arquivo';
GO

/* ---------- Índice para a busca da IA e para a listagem ---------- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_KDoc_Active' AND object_id = OBJECT_ID('dbo.KnowledgeDocuments'))
CREATE INDEX IX_KDoc_Active ON dbo.KnowledgeDocuments (IsCurrent, IsArchived, Audience, IndexStatus);
GO

/* Conferência: situação de cada documento (ChunkCount = 0 e 'falhou' indicam documento ilegível para a IA) */
SELECT Id, Title, DocType, Audience, SourceKind, IndexStatus, ChunkCount, IsCurrent, IsArchived
FROM dbo.KnowledgeDocuments ORDER BY Id DESC;
GO
