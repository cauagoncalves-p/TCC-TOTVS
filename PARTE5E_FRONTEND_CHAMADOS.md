## PARTE 5E: Frontend dos Chamados (colaborador e RH)

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md. Somente frontend.
> Implementa as **Fases B e C** da `PARTE9_CHAMADOS_COLABORADOR_RH.md` (o backend da Fase A já deve estar pronto). Em caso de conflito sobre regras de negócio, vale a PARTE9; sobre telas e comportamento da interface, vale este documento.
> **Passo zero:** atualizar `docs/API_CONTRACT.md` com as rotas **reais** de `/api/tickets/*` (formatos de resposta, paginação, campos do colaborador e do autor das mensagens). Se divergir da PARTE9, vale o código; registrar a divergência.
> Reaproveitar: layout, guardas de perfil, `DataTable`, badges, `ConfirmDialog`, `Toast`, `EmptyState`, `ErrorState`, sino de notificações, tokens de cor (5C) e regras de acessibilidade (Parte 6).

### Objetivo
Telas para o colaborador **abrir e acompanhar chamados** e para a equipe de RH **ver todos os chamados, assumir, responder e resolver**, com notificações levando direto à conversa.

### Princípios
1. **Nenhum dado fixo.** Tudo vem da API.
2. **O backend decide permissão**: o frontend esconde o que o perfil não pode usar, mas trata 403 e 404 com mensagem clara.
3. **Texto puro:** mensagens nunca são interpretadas como HTML nem transformadas em links automáticos.
4. **Nunca perder o que a pessoa está digitando**: erro de envio, atualização automática e novas mensagens não apagam o campo de resposta.
5. **Linguagem do ponto de vista de cada perfil** (colaborador e RH veem rótulos diferentes para o mesmo estado).
6. Estados de carregando, vazio e erro em todo bloco com dados.

### Rotas e permissões

| Rota | Tela | Perfil |
|---|---|---|
| `/chamados` | Meus chamados | colaborador |
| `/chamados/novo` | Novo chamado | colaborador |
| `/chamados/:id` | Detalhe e conversa | colaborador (dono) |
| `/rh/chamados` | Fila de chamados | rh |
| `/rh/chamados/:id` | Detalhe, resposta e ações | rh |

Menu: "Meus chamados" para `colaborador`; "Chamados" para `rh`. `gestor` não vê o item e recebe "Acesso não autorizado" nas rotas.

### Organização do código

```
features/tickets/
  api.ts            chamadas HTTP
  hooks.ts          useMyTickets, useTicketQueue, useTicketCounts, useTicket,
                    useCreateTicket, useSendMessage, useAssignTicket, useResolveTicket
  types.ts          tipos a partir do API_CONTRACT
  labels.ts         rótulos de estado e categoria por perfil
  utils/            formatação de datas relativas, regras de "pode responder"
  components/       TicketStatusBadge, CategoryChip, MyTicketsList, TicketQueueTable, TicketTabs,
                    NewTicketForm, ConversationThread, MessageBubble, ReplyBox, NewMessageBanner,
                    RequesterCard, AssignControls, ResolveButton, VisibilityNotice, MenuCounter
pages/tickets/      MyTicketsPage, NewTicketPage, MyTicketDetailPage, TicketQueuePage, TicketDetailRhPage
```

### Dados e atualização automática (TanStack Query)

| Hook | Atualização |
|---|---|
| `useMyTickets(filtros)` | Ao focar a aba e a cada ~60 s |
| `useTicketQueue(filtros)` | Ao focar a aba e a cada ~30 s |
| `useTicketCounts()` | A cada ~30 s (selos do menu do RH) |
| `useTicket(id)` | A cada ~30 s **somente com a aba visível** e a tela aberta |
| Mutações (`criar`, `enviar mensagem`, `assumir`, `resolver`) | Invalidam `tickets`, `ticket:id`, `ticketCounts` e `notifications` |

- **Enviar mensagem:** exibir a mensagem na conversa imediatamente como "Enviando..." e confirmá-la quando a API responder; em erro, marcá-la "Não enviada" com **Tentar de novo** e **manter o texto**.
- A atualização automática **mescla** mensagens novas pelo `id`, sem recarregar a lista inteira nem mexer no campo de resposta.
- Rótulos de tempo relativos ("há 2 horas") com a data e hora completas ao focar/passar o mouse.

### Rótulos por perfil

| Estado da API | Colaborador vê | RH vê |
|---|---|---|
| `aberto` | Aguardando o RH | Aberto |
| `em_atendimento` | Em atendimento | Em atendimento |
| `respondido` | Respondido pelo RH | Aguardando o colaborador |
| `resolvido` | Resolvido | Resolvido |

Categorias: `ferias` Férias, `holerite` Holerite, `beneficios` Benefícios, `ponto` Ponto, `documentos` Documentos, `politicas` Políticas, `outros` Outros. Estados sempre com **ícone e texto**, nunca só cor.

---

## Telas do colaborador

### 1. Meus chamados (`/chamados`)
- Cabeçalho com botão **Novo chamado**.
- Lista (cartões em celular, tabela em desktop): número (#12), assunto, categoria, **estado**, última atividade e, quando houver resposta não lida, o destaque **"Nova resposta do RH"**.
- Filtro por estado (Todos, Aguardando o RH, Respondidos, Resolvidos); paginação.
- Vazio: "Você ainda não abriu chamados. Precisa de ajuda do RH?" + botão. Erro com **Tentar de novo**.
- Selo no menu: quantidade de notificações **não lidas** de chamados.

### 2. Novo chamado (`/chamados/novo`)
- Campos: **Assunto** (5 a 150), **Categoria** (lista), **Mensagem** (10 a 2000, com contador).
- Avisos visíveis, no topo do formulário: "Seu chamado pode ser visto por toda a equipe de RH." e "Não envie senhas, números completos de documentos nem dados bancários."
- Validação no cliente só de tamanho e obrigatoriedade; **erros do servidor por campo**.
- Erros especiais: limite de chamados abertos ou de criação por dia (mostrar a mensagem da API em destaque, com link para "Meus chamados").
- Sucesso: vai para `/chamados/:id` com a confirmação "Chamado #N aberto. Avisamos você quando o RH responder."
- Aviso de alterações não salvas ao sair com texto digitado (somente em memória; nunca guardar o rascunho em `localStorage`).

### 3. Detalhe do chamado (`/chamados/:id`)
- Cabeçalho: #número, assunto, categoria, **estado**, abertura.
- **Conversa** em ordem cronológica: balões diferentes para "Você" e "Equipe de RH" (nunca expor e-mail de RH ao colaborador), com data e hora.
- **Campo de resposta** (`ReplyBox`): contador de 2000, **Ctrl/Cmd+Enter envia**, Enter quebra linha, dica de atalho visível, botão **Enviar** desabilitado durante o envio ou campo vazio.
- Chamado `resolvido`: faixa "Chamado resolvido em [data]". Dentro do prazo de reabertura, o campo continua ativo com o aviso "Responder reabre o chamado"; passado o prazo (a API devolve 409), mostrar "Este chamado foi resolvido há mais de 7 dias. Abra um novo chamado." com botão.
- Botão **Marcar como resolvido** (com confirmação), escondido se já resolvido.
- Ao abrir a tela, a notificação correspondente é **marcada como lida**.

---

## Telas do RH

### 4. Fila de chamados (`/rh/chamados`)
- **Abas com contagem** (a aba escolhida fica na URL, `?aba=`): 
  - **Abertos sem responsável** (padrão): `status=aberto` e `assigned=none`;
  - **Meus**: `assigned=me`, ocultando resolvidos por padrão (com opção de incluí-los);
  - **Respondidos**: `status=respondido`;
  - **Resolvidos**: `status=resolvido`;
  - **Todos**.
- Filtro por **categoria** e **busca** por assunto ou nome do colaborador (atraso de ~400 ms).
- Tabela (`<table>` com legenda e cabeçalhos associados): #, assunto, **colaborador (nome e departamento)**, categoria, estado, **responsável** ("Sem responsável" quando vazio), **última atividade**, **tempo aguardando o RH** (apenas em `aberto`; destacado em âmbar acima de 24 h e em vermelho acima de 72 h, **com texto e ícone**, como indicação visual e não como regra de prazo).
- A linha inteira é clicável e há um botão **Abrir** acessível por teclado. Paginação de 20 por página.
- Todos os usuários do RH veem **a mesma fila**; quando um colega assume ou responde, a lista reflete na próxima atualização automática.
- Selo no menu "Chamados": quantidade de **abertos sem responsável** (`/counts`).
- Vazio por aba (ex.: "Nenhum chamado aguardando o RH. Bom trabalho!").

### 5. Detalhe do RH (`/rh/chamados/:id`)
- **Coluna principal:** conversa completa (identificando autores: o colaborador pelo nome e cada RH pelo nome ou e-mail, conforme a API) e `ReplyBox`.
- **Coluna lateral** (abaixo da conversa em telas pequenas):
  - `RequesterCard`: nome, matrícula, departamento e cargo (**sem salário nem CPF**);
  - estado atual, categoria, abertura e **responsável**;
  - botões **Assumir** / **Liberar** e **Marcar como resolvido** (confirmação).
- **Aviso de nova mensagem:** se chegarem mensagens enquanto o RH digita, mostrar `NewMessageBanner` ("Nova mensagem de [nome]. Ver") sem tocar no texto digitado. Se outro RH respondeu, avisar antes de enviar uma resposta que possa duplicar ("[nome] respondeu há 1 minuto").
- Responder faz o RH assumir o chamado quando ele não tinha responsável (refletir na tela após o retorno da API).
- Ao abrir, marcar a notificação do chamado como lida.

---

## Notificações (sino)
- Tipos: `chamado_novo`, `chamado_mensagem` (RH) e `chamado_respondido`, `chamado_resolvido` (colaborador), com `RefType = 'chamado'` e `RefId = id`.
- Clique: marcar como lida e navegar para `/rh/chamados/:id` (RH) ou `/chamados/:id` (colaborador).
- Se o chamado não existir mais ou não for acessível (404), mostrar "Chamado não encontrado" e voltar à lista, sem erro técnico.
- A notificação reativada (mesma `RefId`) deve reaparecer como **não lida** com o texto atualizado.

## Tratamento de erros

| Situação | Comportamento |
|---|---|
| 400 (validação) | Erros por campo; a mensagem digitada permanece |
| 401 | O interceptor volta ao login |
| 403 | "Você não tem permissão para esta ação." |
| 404 | "Chamado não encontrado." com botão para a lista |
| 409 | Exibir a mensagem da API (ex.: prazo de reabertura) |
| 429 | Exibir a mensagem da API (limites) |
| 5xx ou sem conexão | "Não foi possível concluir agora. Tente de novo." e **manter o texto** |

## Acessibilidade e tema
- Cores e selos da Parte 5C; estado sempre com ícone e texto; contraste AA.
- Conversa em uma lista com `role="log"`, novas mensagens anunciadas de forma discreta (`aria-live="polite"`); mensagem enviada anunciada ("Mensagem enviada"); foco devolvido ao campo de resposta após enviar.
- Formulários com `label` visível e erros ligados por `aria-describedby`; resumo de erros com foco ao falhar.
- Navegação completa por teclado (abas, tabela, botões, atalho Ctrl/Cmd+Enter).
- Texto real e simples para o VLibras; datas relativas com a data completa disponível em texto.

## Segurança no frontend
1. Mensagens renderizadas **somente como texto** (sem `dangerouslySetInnerHTML`, sem links automáticos).
2. Nenhum `console.log` de assunto, mensagem, nome ou e-mail; nenhum conteúdo de chamado em `localStorage`, `sessionStorage` ou na URL (`?q=` da busca contém só o termo digitado pelo RH, e não é registrado).
3. O colaborador nunca vê e-mails de pessoas do RH.
4. Nenhuma lógica de permissão só no cliente: a API continua sendo a autoridade.

---

## Ordem de implementação

**Fase B: colaborador**
1. Atualizar `API_CONTRACT.md`, tipos, `api.ts`, hooks, rótulos e rotas com guarda.
2. Meus chamados (lista, filtros, estados) e selo no menu.
3. Novo chamado (formulário, avisos, erros dos limites).
4. Detalhe com conversa, `ReplyBox`, resolver e prazo de reabertura; atualização automática.
5. Roteamento das notificações do colaborador.

**Fase C: RH**
6. Fila com abas, contagens, filtros, busca e atualização automática; selo no menu.
7. Detalhe com `RequesterCard`, assumir/liberar, resolver.
8. `NewMessageBanner`, aviso de resposta duplicada e envio otimista com "Tentar de novo".
9. Roteamento das notificações do RH; revisão de acessibilidade, estados e README.

## Critérios de aceite

**Fase B**
- Com `colab.0001`: abrir chamado, ver o estado "Aguardando o RH", receber a notificação de resposta no sino (contador), abrir pelo sino, responder e marcar como resolvido.
- O selo do menu mostra as respostas não lidas e some ao abrir o chamado.
- Limites (3 abertos, 5 por dia) e prazo de 7 dias exibem a mensagem da API.
- Erro de envio mantém o texto e permite tentar de novo; atalho Ctrl/Cmd+Enter funciona.
- `colab.0002` não consegue abrir o chamado de `colab.0001` (mensagem de não encontrado).

**Fase C**
- `rh.seed` e `rh2.seed` veem a mesma fila; quando um assume, o outro vê o responsável na atualização automática.
- O selo "abertos sem responsável" bate com a contagem da aba e atualiza sozinho.
- Responder muda o estado para "Aguardando o colaborador" e o colaborador recebe **uma** notificação, reativada nas respostas seguintes.
- Mensagem nova de outro RH durante a digitação mostra o aviso sem apagar o texto.
- O cartão do colaborador não mostra salário nem CPF; `gestor` e `colaborador` não acessam `/rh/chamados`.

**Geral**
- Nenhum dado fixo; nenhum HTML interpretado a partir das mensagens; tudo utilizável por teclado, com estados em texto e ícone, e tokens de cor aplicados.

## Fora do escopo
Anexos, notas internas só do RH, SLA com alertas de atraso, tempo real por WebSocket (a atualização é por consulta periódica), avaliação do atendimento.
