## PARTE 5D: Frontend da Base de Conhecimento e Políticas

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md. Somente frontend.
> Conecta a tela ao backend da `PARTE4B_BASE_CONHECIMENTO_POLITICAS.md` (já implementado). **Substitui** a tela "Base de Conhecimento Trabalhista" atual e a parte de fontes do chat.
> Reaproveitar: layout, guardas de perfil, `FileDropzone`, `DataTable`, badges, `ConfirmDialog`, `Toast`, `ChatPanel`, tokens de cor (5C) e acessibilidade (Parte 6).
> **Passo zero:** atualizar `docs/API_CONTRACT.md` lendo as rotas **reais** de `/api/knowledge/*` e do chat. Se o código divergir da 4B, vale o código; registrar a divergência.

### Problema a resolver
A tela atual exibe cartões que parecem **dados fixos**, o envio de PDF **não salva** e **falha sem mostrar erro**. A nova tela deve ser 100% alimentada pela API, mostrar o **estado real de cada documento** (indexado, processando, falhou) e permitir ao RH **conferir o que a IA enxerga e testar perguntas**.

### Princípios
1. **Nenhum dado fixo no código.** Tudo vem da API.
2. **Nada falha em silêncio:** todo erro de envio, indexação ou consulta aparece na tela, com o motivo.
3. O RH **sempre consegue verificar** o que a IA leu ("Ver trechos") e **testar** antes de confiar ("Testar pergunta").
4. Política interna e fonte oficial aparecem **rotuladas de forma diferente**; política interna nunca é apresentada como lei.
5. O backend é a autoridade: o frontend valida só para conforto e mostra o que a API responder.

### Rotas e permissões

| Rota | Tela | Perfis |
|---|---|---|
| `/conhecimento` | Lista de documentos | rh (completo), gestor (somente leitura: lista e "Ver trechos") |
| `/conhecimento/politicas/nova` | Editor de política | rh |
| `/conhecimento/politicas/:id/editar` | Nova versão de política escrita | rh |

Menu "Base de conhecimento" só para `rh` e `gestor`. `colaborador` recebe "Acesso não autorizado". Ações de escrita **não aparecem** para `gestor`.

### Endpoints usados
`GET /api/knowledge/documents`, `POST /api/knowledge/documents`, `GET /api/knowledge/documents/:id`, `GET /api/knowledge/documents/:id/chunks`, `POST /api/knowledge/policies`, `PUT /api/knowledge/policies/:id`, `POST /api/knowledge/policies/structure-preview`, `PATCH /api/knowledge/documents/:id`, `POST /api/knowledge/documents/:id/reindex`, `POST /api/knowledge/test-question`, e as rotas de chat que passam a devolver `sources`.

### Organização do código

```
features/knowledge/
  api.ts            chamadas HTTP (upload com progresso e cancelamento)
  hooks.ts          useKnowledgeDocuments (com atualização automática enquanto houver "processando"),
                    useUploadDocument, useCreatePolicy, useNewPolicyVersion, useStructurePreview,
                    useDocumentChunks, usePatchDocument, useReindex, useTestQuestion
  types.ts          tipos a partir do API_CONTRACT
  utils/            rótulos, formatação, detecção de dados pessoais (aviso), validação de arquivo
  components/       DocumentCard, DocumentFilters, IndexStatusBadge, ValidityBadge, AudienceChip,
                    ExtractionChip, UploadDocumentDialog, PolicyEditor, MarkdownPreview,
                    StructureSuggestionDialog, ChunksDrawer, TestQuestionPanel, SourcesList, ArchiveDialog
pages/knowledge/    KnowledgeListPage, PolicyEditorPage
```

Após qualquer escrita (envio, política, `PATCH`, reindexar), **invalidar** a lista de documentos.

### Rótulos (PT-BR)

| Valor da API | Texto exibido |
|---|---|
| `clt` | Legislação / CLT |
| `esocial_manual` | Manual eSocial |
| `esocial_leiaute` | Leiaute eSocial |
| `nota_tecnica` | Nota técnica |
| `acordo_convencao` | Acordo / Convenção |
| `politica_interna` | Política interna |
| `outro` | Outro |
| `rh` / `colaboradores` / `todos` | Somente RH / Colaboradores / Todos |
| `indexado` / `processando` / `falhou` | Indexado / Processando / Falhou |

Datas `dd/mm/aaaa`; vigência sem fim exibida como **"Indeterminada"**; tamanho em KB ou MB; política escrita na plataforma exibe "Texto escrito na plataforma" no lugar do tamanho.

---

## Telas

### 1. Lista de documentos (`/conhecimento`)

**Cabeçalho:** título "Base de Conhecimento Trabalhista", descrição, botões **Adicionar Documento Oficial** e **Nova política** (só `rh`) e botão **Testar pergunta**.

**Filtros:** tipo (todos os rótulos acima), situação (Vigentes, Históricas, Arquivadas), público e busca por palavra-chave ou versão (com atraso de ~400 ms). Resumo na linha abaixo: "12 documentos: 10 indexados, 1 processando, 1 falhou".

**Cartão de documento** (grade de 3 colunas no desktop, 2 no tablet, 1 no celular):
- Tipo (rótulo) e **selo de vigência**: Vigente, Histórica, Ainda não vigente, Vencida ou Arquivada (usar o valor calculado pela API; se não houver, calcular com `IsCurrent`, `EffectiveFrom`, `EffectiveTo` e `IsArchived`).
- **Selo de indexação** com texto e ícone: "Indexado, 18 trechos", "Processando..." ou "Falhou" (com o motivo ao focar/passar o mouse e botão **Reenviar**).
- Chip de **público** e, quando for o caso, chip "Lido por IA (OCR)" com dica "Este PDF não tinha texto selecionável; confira a transcrição em Ver trechos".
- Título, versão, publicação, vigência e tamanho.
- Ações: **Ver trechos**, **Testar pergunta**, **Nova versão** (política escrita abre o editor; arquivo abre o envio já com o título preenchido), **Arquivar/Desarquivar** (confirmação). Documento histórico: só "Ver trechos".

**Estados:** carregando (cartões esqueleto), vazio ("Nenhum documento ainda. Envie um PDF ou escreva uma política."), erro com "Tentar de novo". Enquanto houver documento `processando`, a lista se atualiza sozinha (a cada ~3 s).

### 2. Diálogo "Adicionar Documento Oficial"

Campos: arquivo (área de envio, **PDF até 20 MB**, validado antes de enviar), título (sugerido pelo nome do arquivo), tipo, órgão/origem, endereço da fonte (opcional), versão, data de publicação, vigência (início e fim opcional) e **público** (Somente RH, Colaboradores, Todos). Aviso fixo: "Não inclua dados pessoais de colaboradores."

**Comportamento:**
- Barra de progresso do envio, depois "Indexando o documento..." (`aria-live="polite"`); botão **Cancelar** (cancela a requisição).
- Se já existir versão vigente com o mesmo título: aviso "Já existe a versão X de 'Título'. A nova substitui a atual, que ficará como histórica."
- **Sucesso:** resumo "6 páginas, 18 trechos indexados" + chip do método; se foi leitura por IA, aviso para conferir em "Ver trechos". Fecha, mostra confirmação e **destaca o novo cartão** por alguns segundos.
- **Erro (nunca silencioso):** mostrar a mensagem da API; mapeamento padrão:

| Situação | Mensagem |
|---|---|
| Não é PDF, vazio ou sem texto legível (400/422) | A mensagem devolvida pela API |
| Acima do limite (413) | "O arquivo passa de 20 MB." |
| Leitura por IA indisponível (502) | "Não foi possível ler o PDF agora. Tente de novo ou envie um PDF com texto selecionável." |
| Sem conexão | "Falha de conexão. Verifique sua internet e tente de novo." |
| Sem permissão (403) | "Você não tem permissão para esta ação." |
| 401 | O interceptor volta ao login |

- Impedir envio duplicado (botão desabilitado durante o envio). O arquivo e os campos permanecem preenchidos após um erro, para tentar de novo.

### 3. Editor de política (`/conhecimento/politicas/nova` e `.../:id/editar`)

- **Formulário:** título, tipo (apenas Política interna ou Acordo / Convenção), público (padrão Todos), versão, publicação, vigência início e fim.
- **Conteúdo em Markdown** com **visualização ao lado** (abas no celular) e contador de caracteres. Botão **Usar modelo de política** (pede confirmação se já houver texto) que insere: título, resumo rápido, objetivo e abrangência, definições, a regra, o que fazer na prática, exceções (ou "não há exceções nesta versão") e aviso de política interna.
- **Sugerir estrutura com IA** (desabilitado sem texto): abre `StructureSuggestionDialog` com o original e a sugestão lado a lado, faixa fixa **"Sugestão da IA. Revise: ela pode ter alterado o sentido do texto."**, e botões **Usar sugestão**, **Copiar trechos** e **Descartar**. Nada é aplicado sem ação do RH.
- **Aviso de dados pessoais:** detecção simples de padrões de CPF, e-mail e telefone no texto, com aviso e pedido de confirmação antes de publicar (o backend também valida).
- **Publicar:** `POST` na criação; na edição, `PUT` cria **nova versão** (cabeçalho "Nova versão de {título} (atual: v1.0)", explicação "A versão atual ficará como histórica" e campo de versão diferente da atual). Sucesso volta à lista com o cartão destacado; erros aparecem no formulário, por campo quando a API indicar.
- Confirmação ao sair com alterações não salvas. Markdown renderizado **sem HTML cru** (sanitizado).

### 4. "Ver trechos" (`ChunksDrawer`)
Painel lateral com os trechos indexados: número, página, seção e texto (expansível), paginação e busca no texto. Cabeçalho com o documento, o total de trechos e o método de extração. Documento sem trechos: "Nenhum trecho indexado. A IA não consegue usar este documento." com **Reenviar** (arquivo) ou **Reindexar** (política escrita). Somente leitura; `gestor` também vê.

### 5. "Testar pergunta" (`TestQuestionPanel`)
- Campo de pergunta (até 500 caracteres) e escolha do **escopo**: "Assistente trabalhista (RH)" ou "Chat do colaborador", com a explicação de que o público do documento muda o resultado.
- Resultado: selo **Confirmada** ou **Não confirmada**, resposta, **Fontes** (`SourcesList`: título, tipo com chip "Política interna" ou "Fonte oficial", versão, página/seção e data de publicação) e acordeão **"Trechos recuperados"** com a **nota** de cada um, destacando os usados como fonte.
- Se nada foi recuperado: "Nenhum trecho passou da nota mínima. A IA responderia que não conseguiu confirmar."
- Estados de carregando ("Consultando os documentos...") e erro; histórico das últimas 5 perguntas da sessão (só em memória). Botão **Ouvir** (F04) se existir.

### 6. Fontes nos chats
- **Chat do colaborador** (`ChatPanel`): quando a resposta trouxer `sources`, exibir abaixo da mensagem "Fonte: Política interna *Título*, v1.0, publicada em 14/11/2026". Resposta não confirmada: texto claro de que não foi encontrada e, se a F01 existir, atalho "Falar com o RH".
- **Assistente trabalhista:** mesma lista de fontes, com os rótulos de política interna ou fonte oficial.
- Fontes **nunca** mostram texto de documento restrito ao RH no chat do colaborador (o backend garante; o frontend apenas exibe o que vier).

---

## Acessibilidade (ver Parte 6)
Campos com `label` visível; erros ligados por `aria-describedby`; selos sempre com **texto e ícone**; progresso e resultados em região `aria-live`; foco movido para o resumo de erros ao falhar e para o cartão novo ao concluir; painéis (`ChunksDrawer`, teste de pergunta) fecham com Esc e devolvem o foco ao botão de origem; linguagem simples; tokens de cor da Parte 5C.

## Segurança no frontend
1. Perfis aplicados nas rotas e nos botões; o backend continua sendo a autoridade.
2. Nenhum `dangerouslySetInnerHTML`; Markdown sanitizado; mensagens de erro da API exibidas como texto.
3. Nunca `console.log` de texto de documento, de pergunta ou de resposta.
4. O arquivo não é guardado no navegador além do envio; sem texto de documento em `localStorage`.
5. Validação de tipo e tamanho no cliente é só conforto.

---

## Ordem de implementação

**Fase a: lista real e envio**
1. Atualizar `API_CONTRACT.md`, tipos, `api.ts` e hooks.
2. Lista com dados da API, filtros, selos, estados e atualização automática.
3. Diálogo de envio com progresso, mensagens de erro, aviso de versão e destaque do novo cartão. **Remover todos os dados fixos.**

**Fase b: conferir o que a IA lê**
4. `ChunksDrawer` ("Ver trechos") e ação de reenviar/reindexar.
5. `TestQuestionPanel` ("Testar pergunta") com fontes e trechos recuperados.

**Fase c: políticas**
6. Editor com modelo, visualização, aviso de dados pessoais e publicação.
7. Nova versão (edição), arquivar/desarquivar e ajuste de público e vigência (`PATCH`).
8. Sugestão de estrutura com IA (`StructureSuggestionDialog`).

**Fase d: chats e acabamento**
9. Fontes no chat do colaborador e no assistente trabalhista.
10. Revisão de acessibilidade, estados, README e `API_CONTRACT.md`.

## Critérios de aceite

**Fase a**
- A tela não contém nenhum documento fixo no código; a lista vem do banco.
- Enviar `politica_aprendizes_eventos_externos.pdf` mostra progresso, depois o cartão **"Indexado, N trechos"**, destacado.
- Arquivo inválido, grande demais ou ilegível mostra **erro visível com o motivo** e nada aparece como salvo.
- Documento `processando` vira "Indexado" sozinho, sem recarregar a página.
- Enviar uma nova versão do mesmo título avisa antes e deixa a anterior como "Histórica".

**Fase b**
- "Ver trechos" lista o que foi indexado, com página e seção; documento sem trechos mostra o aviso e a ação de reenviar.
- "Testar pergunta": "Aprendiz pode ir a uma feira?" retorna **Confirmada**, resposta negativa e fonte com título, versão e data; uma pergunta fora da base retorna **Não confirmada** com a lista de trechos (ou aviso de que nada passou da nota mínima).

**Fase c**
- Política criada no editor aparece na lista, é indexada e responde no "Testar pergunta" sem reiniciar o servidor.
- Editar gera nova versão; a anterior fica histórica e fora das respostas.
- A sugestão da IA nunca é aplicada sem o RH escolher "Usar sugestão"; o aviso de revisão está sempre visível.
- Texto com CPF, e-mail ou telefone gera aviso antes de publicar.

**Fase d**
- No chat do colaborador, pergunta sobre uma política com público Colaboradores ou Todos mostra a fonte; política somente RH não aparece.
- `gestor` vê a lista e os trechos sem botões de escrita; `colaborador` não acessa a tela.
- Tudo funciona por teclado, sem informação só por cor, com tokens de cor aplicados.

## Fora do escopo
Pré-visualização do PDF original (o arquivo não é guardado), fluxo de aprovação de políticas antes de publicar, assinatura de ciência pelos colaboradores, comparação visual entre versões.
