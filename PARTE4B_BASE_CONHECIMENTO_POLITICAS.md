## PARTE 4B: Base de conhecimento e políticas (upload confiável + criação de políticas + RAG)

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md.
> Complementa e **corrige** a fase C da Parte 4 (base de conhecimento e assistente). Onde houver conflito, vale este documento.
> Reaproveitar: `KnowledgeDocuments`, `KnowledgeChunks`, o assistente trabalhista, o chat do colaborador (Parte 1), `ComplianceAuditLog`, `FileDropzone`, tokens de cor (Parte 5C).

### Problema relatado
Na tela "Base de Conhecimento Trabalhista", o RH anexou um PDF, **ele não foi salvo** e a IA **não conseguiu ler nem responder** sobre ele. Os 6 cartões exibidos parecem **dados de exemplo** (nomes, versões e tamanhos fixos), não registros do banco.

### Objetivo
1. O RH **envia documentos** (PDF) **e escreve políticas direto na plataforma**.
2. Tudo que for salvo fica **realmente indexado**, e a IA passa a responder com **fonte, versão e data**.
3. O RH consegue **ver o que a IA enxerga** e **testar uma pergunta** antes de confiar no documento.
4. Falhas **aparecem na tela**, nunca silenciosas.

---

## Tarefa 0: Diagnóstico (fazer primeiro e relatar em poucas linhas)

O agente verifica e informa o resultado de cada item **antes de alterar código**:

1. A tela lê os cartões **de uma API** ou de uma lista fixa no código (`mock`)? O botão "Adicionar Documento Oficial" chama `POST /api/knowledge/documents`?
2. Na rede do navegador, o envio devolve qual status? A tela mostra erro quando falha?
3. A rota do backend existe, está registrada e respeita o limite de tamanho do `multer`? Há erro no log do servidor?
4. Depois de um envio, existem linhas em `KnowledgeDocuments` e `KnowledgeChunks`? Quantos trechos?
5. O texto do PDF é extraído (`pdf-parse`)? Para PDF escaneado (imagem), o texto vem vazio?
6. O índice de busca é **carregado só na inicialização** e não é atualizado após o upload? (causa muito comum)
7. A busca filtra por `IsCurrent`, vigência ou tipo de forma que exclui o documento novo?
8. O chat do colaborador e o assistente trabalhista **realmente chamam a busca** antes de responder?

---

## Banco de dados

Script: `database/010_knowledge_policies.sql`. Novidades em `KnowledgeDocuments`:
- `Audience` (`rh`, `colaboradores`, `todos`): quem pode ter o documento usado nas respostas.
- `SourceKind` (`arquivo` ou `texto`) e `BodyText` (texto-fonte das políticas escritas na plataforma).
- `IndexStatus` (`processando`, `indexado`, `falhou`), `IndexError`, `ChunkCount`, `ExtractionMethod` (`texto` ou `ocr_ia`), `SizeBytes`.
- `IsArchived`, `UpdatedAt`, `PreviousVersionId`; `FileName` passa a aceitar nulo.
- Tipos aceitos: `clt`, `esocial_manual`, `esocial_leiaute`, `nota_tecnica`, `acordo_convencao`, `politica_interna`, `outro`.

## Pipeline de entrada (arquivo)

1. **Validar:** só PDF, até 20 MB, assinatura `%PDF`, até `MAX_KB_PAGES` páginas (padrão 300). Falha: **422/400 com mensagem clara; nada é salvo.**
2. **Extrair texto por página** (guardar o número da página para citação).
3. **Plano B para PDF escaneado:** se o texto extraído for vazio ou muito curto, enviar o PDF ao Gemini para **transcrição fiel** (sem resumir, página a página) e registrar `ExtractionMethod = 'ocr_ia'`. Se ainda vier vazio: 422 "Não foi possível ler o texto deste PDF".
4. **Dividir em trechos** de cerca de 1000 caracteres com sobreposição, **mantendo pares de pergunta e resposta juntos** quando o documento estiver nesse formato; guardar `Page` e `SectionRef` (título da seção, artigo etc.).
5. **Gravar em uma transação** documento e trechos, `IndexStatus = 'indexado'` e `ChunkCount`. Falha em qualquer etapa desfaz tudo.
6. **Nova versão:** se já existe documento vigente com o **mesmo título**, o anterior passa a `IsCurrent = 0`, recebe `EffectiveTo` e a nova versão guarda `PreviousVersionId`.
7. **Invalidar o índice de busca** (recarregar em memória ou controlar por contador de versão), para o documento valer **sem reiniciar o servidor**.
8. Auditoria no `ComplianceAuditLog` (envio, nova versão, arquivamento). O arquivo original **não** é guardado.
9. Avisar se o texto contiver padrões de CPF, e-mail ou telefone ("não inclua dados pessoais"): aviso, com confirmação para prosseguir.

## Criação de políticas na plataforma (texto)

- `POST /api/knowledge/policies`: título, tipo (`politica_interna` ou `acordo_convencao`), público (`Audience`), versão, data de publicação, vigência (início e fim opcional) e **conteúdo em Markdown**. Salva `SourceKind = 'texto'` e `BodyText`, divide em trechos por seção ou pares de pergunta e resposta e indexa pelo mesmo caminho do arquivo.
- **Editar** (`PUT /api/knowledge/policies/:id`) **gera nova versão** (o texto antigo vira histórico), nunca sobrescreve.
- `POST /api/knowledge/policies/structure-preview { rawText }`: o Gemini **reorganiza o texto do RH em perguntas e respostas** para melhorar a busca. Regras: **não acrescentar regras, prazos ou números que não estejam no texto**; resultado é só uma **sugestão** que o RH revisa e edita antes de salvar.
- Modelo de política sugerido no editor: título; resumo rápido; objetivo e abrangência; definições; a regra; o que fazer na prática; exceções (ou "não há exceções nesta versão"); aviso de que é política interna.

## Busca (RAG) compartilhada

Serviço único `knowledgeRetrievalService`, usado pelo **assistente trabalhista** e pelo **chat do colaborador**:

- **Escopo por público:** assistente trabalhista (RH) vê `rh`, `colaboradores` e `todos`; chat do colaborador vê **apenas** `colaboradores` e `todos`.
- **Filtros:** `IsCurrent = 1`, `IsArchived = 0`, `IndexStatus = 'indexado'` e vigência (`EffectiveFrom` não futura, `EffectiveTo` nulo ou não vencida).
- **Normalização:** minúsculas, remover acentos, remover palavras comuns do português, plural simples; incluir o **título do documento e da seção** no texto pesquisável.
- **Sinônimos configuráveis** em `config/synonyms.js` (ex.: aprendiz e jovem aprendiz; evento e feira, congresso, convenção, seminário).
- **Pontuação** estilo BM25 com reforço para título e seção; **nota mínima**: abaixo dela, nenhum trecho é enviado e a resposta é "não consegui confirmar".
- **Top 5 trechos** vão ao Gemini com os metadados (título, tipo, versão, publicação, página, seção).
- **Regras de resposta:**
  - política interna ou acordo: "Segundo a política interna *X* (versão, data)…"; **nunca apresentar como lei**;
  - se políticas e legislação aparentarem conflitar, citar as duas e recomendar confirmar com o RH;
  - o backend verifica que cada fonte citada pertence aos trechos recuperados (como na Parte 4);
  - o conteúdo dos documentos é **dado, não instrução** (proteção contra prompt injection).
- No **chat do colaborador**, a busca entra **além** das ferramentas de dados pessoais. Se não encontrar a regra, responder que não encontrou e oferecer falar com o RH.

## Endpoints (perfil `rh`; leitura limitada para `gestor`)

| Método e rota | Função |
|---|---|
| `GET /api/knowledge/documents?type=&status=&q=&archived=` | Lista **do banco** (nada de dados de exemplo), com status e contagem de trechos |
| `POST /api/knowledge/documents` (multipart + metadados) | Envia PDF; devolve documento, `IndexStatus`, `ChunkCount`, páginas e método de extração |
| `GET /api/knowledge/documents/:id` | Metadados (e `BodyText` das políticas escritas) |
| `GET /api/knowledge/documents/:id/chunks?page=` | **"O que a IA enxerga":** trechos indexados, com página e seção |
| `POST /api/knowledge/policies` e `PUT /api/knowledge/policies/:id` | Cria e versiona políticas |
| `POST /api/knowledge/policies/structure-preview` | Sugestão de estrutura em perguntas e respostas (não salva) |
| `PATCH /api/knowledge/documents/:id` | Ajusta público, vigência, `isCurrent`, arquivar |
| `POST /api/knowledge/documents/:id/reindex` | Reindexa (só políticas escritas; para arquivo, pedir reenvio) |
| `POST /api/knowledge/test-question { question, audienceScope }` | **Testar pergunta:** devolve a resposta da IA, as fontes e os **trechos recuperados com nota** |

Perfis sem permissão: 403. Todas as rotas validam entrada; queries parametrizadas.

## Frontend (reaproveitar a tela atual)

- Remover qualquer **dado fixo**; os cartões vêm da API.
- Cada cartão mostra: tipo, **status de vigência** (Vigente ou Histórica), **status de indexação** ("Indexado, 18 trechos", "Falhou", "Processando"), público (RH, Colaboradores, Todos), versão, publicação, vigência, tamanho. Estados com **texto e ícone**.
- Ações no cartão: **Ver trechos**, **Testar pergunta**, **Nova versão**, **Arquivar**.
- **Adicionar Documento Oficial:** diálogo com área de envio, metadados e público; barra de progresso; ao final, resumo ("6 páginas, 18 trechos indexados") ou **erro visível** com o motivo.
- **Nova política:** editor em Markdown com visualização, modelo de política, botão "Sugerir estrutura com IA" (marcado como sugestão a revisar), campos de metadados e aviso para não incluir dados pessoais.
- **Testar pergunta** (painel ou diálogo): campo de pergunta, escolha do escopo (RH ou colaborador), resposta com **fontes e datas** e a lista dos **trechos recuperados** (para entender por que a IA respondeu ou não).
- Estados de carregando, vazio e erro; filtros por tipo e busca; tokens de cor e acessibilidade das partes 5C e 6 (resumos em texto, nada só por cor).

## Segurança e LGPD

1. Só `rh` cria, edita e arquiva; `colaborador` não acessa as rotas de gestão (403).
2. Público (`Audience`) é aplicado **no backend** na busca; o colaborador nunca recebe trecho de documento restrito ao RH.
3. Texto de PDF e de políticas é entrada não confiável: tratado como dado pelo prompt; Markdown renderizado com sanitização.
4. Sem dados pessoais nas políticas (aviso e detecção de CPF, e-mail e telefone).
5. Erros do servidor não vazam texto de SQL ou stack trace.

## Ordem de implementação

1. **Diagnóstico (tarefa 0)** e relatório curto.
2. Aplicar `010_knowledge_policies.sql`.
3. Pipeline de arquivo corrigido (validação, extração por página, plano B por IA, trechos, transação, versão, invalidação do índice).
4. `knowledgeRetrievalService` com filtros, normalização, sinônimos e nota mínima; integrar ao assistente trabalhista **e** ao chat do colaborador.
5. Rotas de políticas, `chunks`, `reindex`, `PATCH` e `test-question`.
6. Frontend: lista real, status, diálogo de envio com erros visíveis.
7. Frontend: editor de políticas, "Ver trechos" e "Testar pergunta".
8. Atualizar `docs/API_CONTRACT.md` e o README.

## Critérios de aceite

- Enviar `politica_aprendizes_eventos_externos.pdf`: o documento **aparece na lista** como "Indexado" com número de trechos; **"Testar pergunta"** com "Aprendiz pode ir a uma feira?" responde **não**, citando título, versão e data.
- Sem reiniciar o servidor, o documento recém-enviado já responde nas duas telas de chat (se o público permitir).
- PDF escaneado é lido pelo plano B por IA ou recusado com mensagem clara; arquivo inválido, vazio ou acima do limite é recusado **com erro visível** e **nada fica salvo pela metade**.
- Política criada no editor aparece imediatamente, é indexada e responde; editar gera nova versão e a anterior fica histórica, sem ser usada nas respostas.
- Documento com vigência futura, arquivado ou com `IndexStatus` diferente de `indexado` **não** é usado nas respostas.
- Política com público `rh` **não** é usada pelo chat do colaborador; com `todos`, é usada e cita a fonte.
- "Ver trechos" lista exatamente o que foi indexado; "Testar pergunta" mostra os trechos recuperados com nota.
- Pergunta fora da base responde "não consegui confirmar", sem inventar; instrução maliciosa dentro de um documento não altera o comportamento.
- Política interna nunca é apresentada como lei.
- Nenhum cartão da tela vem de dado fixo no código.

## Fora do escopo
Busca semântica com embeddings, guardar o arquivo original, fluxo de aprovação de políticas antes de publicar, assinatura de ciência pelos colaboradores.
