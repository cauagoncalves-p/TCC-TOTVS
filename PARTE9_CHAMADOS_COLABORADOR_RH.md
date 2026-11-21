## PARTE 9: Chamados do colaborador para o RH

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md. Implementar **uma fase por vez** (A, B, C).
> Esta parte **concretiza e amplia a F01**: o chamado pode ser aberto **direto**, sem passar pelo chat (o atalho a partir do chat fica na fase D, opcional).
> Reaproveitar: `authMiddleware`, perfis, `Notifications` (Parte 4) e o sino de notificações, `ComplianceAuditLog`, componentes e tokens de cor do frontend.
> Banco: `database/011_support_tickets.sql` (já criado) e, opcionalmente, `database/seed/S07_chamados.sql` (6 chamados de exemplo).

### Objetivo
O colaborador **abre um chamado** com uma dúvida ou solicitação. **Todos os usuários do RH veem o chamado**, qualquer um pode **responder**, e o colaborador **recebe uma notificação** quando há resposta. A conversa continua no próprio chamado até ser resolvida.

### Fluxo

1. **Colaborador** abre o chamado (assunto, categoria e mensagem). → **todos os RH** recebem a notificação "Novo chamado".
2. **Qualquer RH** abre o chamado, opcionalmente clica **Assumir** (para os colegas saberem que alguém está cuidando) e **responde**.
3. O chamado passa a **Respondido** e o **colaborador recebe a notificação** "Seu chamado #N foi respondido pelo RH".
4. O colaborador responde de novo (o chamado volta a **Aberto**; o RH responsável, ou todos se ninguém assumiu, é notificado) ou marca como **Resolvido**.
5. O RH também pode **marcar como resolvido**; o colaborador é notificado.

### Estados

| Estado | Significa | Passa para este estado quando |
|---|---|---|
| `aberto` | Aguardando o RH | Chamado criado, ou o colaborador respondeu/reabriu |
| `em_atendimento` | Um RH assumiu | O RH clica em **Assumir** (e ainda não respondeu) |
| `respondido` | Aguardando o colaborador | O RH respondeu |
| `resolvido` | Encerrado | O RH ou o colaborador marcou como resolvido |

Reabrir: o colaborador pode responder em um chamado `resolvido` em até **7 dias**; depois disso, deve abrir um novo.

### Princípios

1. **Acesso:** colaborador vê **somente os próprios** chamados; **todo usuário `rh` vê todos**. Chamado de outra pessoa para um colaborador: **404** (não 403). `gestor` não tem acesso (403).
2. **Transparência:** o colaborador é avisado na tela de abertura: "Seu chamado pode ser visto por toda a equipe de RH."
3. **Minimização:** a tela pede para **não enviar senhas, números completos de documentos ou dados bancários** no chamado.
4. **Texto puro:** mensagens sem HTML, até 2000 caracteres, exibidas como texto.
5. **Notificação sem duplicar:** uma notificação por chamado e destinatário, **reativada** a cada novidade (ver abaixo).
6. Tudo auditado (abertura, resposta, assumir, resolver) no `ComplianceAuditLog`, sem copiar o conteúdo das mensagens.

### Regras de negócio

- **Categorias:** `ferias`, `holerite`, `beneficios`, `ponto`, `documentos`, `politicas`, `outros`.
- **Limites:** no máximo **3 chamados abertos ao mesmo tempo** por colaborador e **5 chamados criados por dia** (configuráveis); assunto de 5 a 150 caracteres; mensagem de 10 a 2000.
- **Assumir** é um aviso entre colegas, **não bloqueia** outro RH de responder. Um RH pode **liberar** o chamado.
- Ao responder, o RH torna-se o responsável se o chamado não tiver um.
- Toda mudança atualiza `UpdatedAt`, `LastMessageAt` e `LastMessageRole` na **mesma transação** que grava a mensagem.

### Notificações (tabela `Notifications` da Parte 4)

A tabela tem restrição única por `(UserId, Type, RefType, RefId)`. Por isso, **não inserir uma notificação nova a cada resposta**: usar **"inserir ou reativar"**. Para `RefType = 'chamado'` e `RefId = id do chamado`, se já existir, atualizar `Message`, `CreatedAt` e `IsRead = 0`; se não, inserir.

| Evento | Destinatários | Tipo | Mensagem |
|---|---|---|---|
| Chamado criado | **todos** os usuários `rh` | `chamado_novo` | "Novo chamado #N: assunto" |
| RH respondeu | o colaborador | `chamado_respondido` | "Seu chamado #N foi respondido pelo RH" |
| Colaborador respondeu ou reabriu | o RH responsável; se não houver, **todos** os `rh` | `chamado_mensagem` | "Nova mensagem no chamado #N" |
| RH marcou como resolvido | o colaborador | `chamado_resolvido` | "Seu chamado #N foi marcado como resolvido" |

Clicar na notificação abre o chamado (`/chamados/:id` para o colaborador, `/rh/chamados/:id` para o RH) e a marca como lida. Se a F14 (e-mail) existir, os mesmos eventos entram na fila de e-mails, sem dados do chamado no texto.

---

## Fase A: Backend

### Endpoints

| Método e rota | Perfil | Função |
|---|---|---|
| `POST /api/tickets` `{ subject, category, message, sessionId? }` | colaborador | Cria chamado e a 1ª mensagem (transação); notifica todos os RH |
| `GET /api/tickets/mine?status=&page=` | colaborador | Lista os próprios chamados, mais recentes primeiro |
| `GET /api/tickets?status=&category=&assigned=me\|none\|<id>&q=&page=` | rh | Fila de **todos** os chamados (busca por assunto ou nome do colaborador) |
| `GET /api/tickets/counts` | rh | Contagens para os selos do menu: abertos sem responsável, meus, respondidos, resolvidos |
| `GET /api/tickets/:id` | dono ou rh | Chamado + mensagens. Para RH, inclui dados básicos do colaborador (nome, matrícula, departamento, cargo; **nunca salário nem CPF**) |
| `POST /api/tickets/:id/messages` `{ content }` | dono ou rh | Responde; aplica transição de estado e notificações |
| `PATCH /api/tickets/:id/assign` `{ assignedTo: "me" \| null }` | rh | Assume ou libera |
| `PATCH /api/tickets/:id/resolve` | dono ou rh | Marca como resolvido |

Validações: campos obrigatórios e tamanhos, categoria válida, chamado `resolvido` há mais de 7 dias não aceita mensagem do colaborador (409 com mensagem clara), limites por colaborador (429 com mensagem clara), tudo com queries parametrizadas. Erros internos retornam mensagem genérica, sem texto de SQL.

### Camadas
`routes` → `controllers` (validação) → `ticketService` (regras, transições, notificações, auditoria) → `ticketRepository` (SQL) e `notificationService` (inserir ou reativar). As transições e a gravação da mensagem acontecem **em uma transação**; a notificação é gravada **depois do commit** e uma falha nela **não desfaz** o chamado (registrar o erro).

### Critérios de aceite (Fase A)
- `colab.0001` cria chamado e **os dois RH do seed** recebem a notificação.
- Qualquer RH lista e abre o chamado; um RH responde, o status vira `respondido` e o colaborador recebe **uma** notificação.
- Duas respostas seguidas do RH geram **uma única** notificação para o colaborador, reativada (`IsRead = 0`), sem erro de duplicidade.
- `colab.0002` abrindo o chamado de `colab.0001` recebe 404; `gestor` recebe 403.
- Colaborador respondendo em chamado `respondido` faz o status voltar para `aberto` e notifica o RH responsável (ou todos).
- Quarto chamado aberto simultâneo e sexto chamado do dia são recusados com mensagem clara.
- Resolver, reabrir dentro de 7 dias e recusa depois de 7 dias funcionam.
- Auditoria registrada para cada ação, sem o texto das mensagens.

---

## Fase B: Frontend do colaborador

Rotas: `/chamados` (lista), `/chamados/novo`, `/chamados/:id`. Menu do colaborador ganha **"Meus chamados"** com selo de chamados respondidos não lidos.

- **Lista:** cartões ou tabela com número, assunto, categoria, **selo de estado** (texto e ícone), data da última atividade e indicação "Nova resposta do RH". Filtro por estado. Estados de carregando, vazio ("Você ainda não abriu chamados" + botão) e erro.
- **Novo chamado:** assunto, categoria (lista), mensagem (contador de caracteres), avisos "Seu chamado pode ser visto por toda a equipe de RH" e "Não envie senhas nem números completos de documentos". Erros por campo, incluindo os limites (3 abertos, 5 por dia). Ao enviar, vai para o chamado criado.
- **Detalhe:** cabeçalho com número, assunto, categoria e estado; **conversa em ordem cronológica** (mensagens do colaborador e do RH visualmente distintas, identificando o autor como "Você" e "Equipe de RH", com data e hora); campo de resposta (desabilitado se `resolvido` há mais de 7 dias, com orientação para abrir novo); botão **Marcar como resolvido** (com confirmação). A conversa atualiza sozinha enquanto a tela está aberta (a cada ~30 s) e ao voltar o foco para a aba.
- **Notificações:** a notificação `chamado_respondido` abre `/chamados/:id`.

### Critérios de aceite (Fase B)
- O fluxo completo funciona na tela: abrir, receber a notificação de resposta (sino com contador), abrir pelo sino, responder e resolver.
- Texto exibido apenas como texto (sem HTML); mensagens longas quebram corretamente.
- Colaborador não vê chamados de outros nem consegue abrir o endereço de um chamado alheio.
- Tudo utilizável por teclado, estados com texto e ícone, tokens de cor e resumo para o VLibras.

---

## Fase C: Frontend do RH

Rotas: `/rh/chamados` (fila) e `/rh/chamados/:id`. Item de menu **"Chamados"** com selo da quantidade **abertos sem responsável**.

- **Fila (todos os RH veem os mesmos chamados):** abas ou filtros **Todos**, **Abertos sem responsável**, **Meus**, **Respondidos** e **Resolvidos**; filtro por categoria; busca por assunto ou nome. Colunas: número, assunto, **colaborador (nome e departamento)**, categoria, estado, **responsável** ("Sem responsável" quando não há), **última atividade** e **tempo aguardando o RH** (destacado quando o chamado está em `aberto`). Ordenação padrão: abertos mais antigos primeiro. Atualização automática (~30 s) e ao voltar o foco para a aba; selos atualizados sem recarregar a página.
- **Detalhe:** conversa completa, **cartão do colaborador** (nome, matrícula, departamento, cargo), responsável atual, botões **Assumir/Liberar**, **Marcar como resolvido** e campo de resposta. Se outro RH respondeu enquanto você digitava, mostrar aviso "Nova mensagem de [alguém]" sem perder o texto digitado.
- **Notificações:** `chamado_novo` e `chamado_mensagem` abrem `/rh/chamados/:id`.

### Critérios de aceite (Fase C)
- `rh.seed` e `rh2.seed` veem **a mesma fila**; quando um assume, o outro vê o responsável na lista.
- O selo "abertos sem responsável" do menu bate com a contagem da fila e atualiza sozinho.
- Resposta de um RH aparece para o colaborador e para o outro RH; o colaborador recebe a notificação.
- Aviso de nova mensagem quando outro RH responde durante a digitação, sem perder o texto.
- O cartão do colaborador não mostra salário nem CPF.
- `gestor` e `colaborador` não acessam as rotas do RH.

---

## Fase D (opcional): a partir do chat
Botão **"Falar com o RH"** no chat do colaborador e sugestão quando a IA não encontrar a resposta. O backend gera um **resumo editável** da conversa (Gemini, só a partir da própria sessão; assunto, sem copiar valores de holerite nem números de documentos) e o colaborador **confirma** antes de abrir o chamado, preenchendo `sessionId`. Detalhes na `F01_escalar_chat_para_rh.md`.

## Segurança e LGPD
Controle de acesso sempre no backend; texto puro e limites de tamanho; mensagens de erro genéricas; sem dados sensíveis do colaborador na tela do RH além do necessário; auditoria sem conteúdo; taxa de criação limitada; o aviso de visibilidade ao colaborador é obrigatório.

## Ordem de implementação
1. Aplicar `011_support_tickets.sql` (e, se quiser dados de teste, `seed/S07_chamados.sql`).
2. Fase A (backend), com testes por `curl` dos critérios.
3. Fase B (colaborador), testar o fluxo com `colab.0001`.
4. Fase C (RH), testar com `rh.seed` e `rh2.seed` ao mesmo tempo (dois navegadores ou janela anônima).
5. Fase D, se desejar.

## Fora do escopo
Anexos, notas internas visíveis só ao RH, SLA com prazos e alertas de atraso, atribuição automática por categoria, avaliação do atendimento, tempo real por WebSocket (a atualização é por consulta periódica).
