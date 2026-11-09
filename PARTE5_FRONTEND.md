## PARTE 5: Frontend (React + TypeScript)

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md. Implementar **uma fase por vez**. Não adiantar fases.
> O backend (Partes 1 a 4) já está pronto. O frontend **consome** a API; não altera regras do backend.

### Objetivo
Interface única e profissional do **TOTVS RH Inteligente**, com navegação por perfil (`colaborador`, `rh`, `gestor`), cobrindo: chat do colaborador, onboarding com IA, inteligência preditiva e compliance.

### Stack

- React + TypeScript + Vite
- React Router (rotas e guardas por perfil)
- TanStack Query (busca de dados, cache, estados de carregando/erro)
- Axios (cliente HTTP com interceptors)
- Recharts (gráficos)
- Tailwind CSS (estilo) + `lucide-react` (ícones)
- Variável de ambiente: `VITE_API_URL=http://localhost:3001`

### Passo zero obrigatório: contrato da API

Antes de qualquer tela, o agente lê as rotas **reais** em `backend/src/routes` e `controllers` e gera `docs/API_CONTRACT.md`: método, rota, perfis permitidos, parâmetros, corpo e formato da resposta de cada endpoint. A partir dele cria os tipos TypeScript em `src/types/`.
Se algo no backend divergir dos `.md` das Partes 1 a 4, **vale o código**; registrar a divergência no contrato. O backend deve liberar CORS para a origem do Vite (`http://localhost:5173`).

### Estrutura de pastas

```
frontend/src/
  app/          router, providers (QueryClient, Auth), layout
  pages/        uma pasta por tela
  features/     chat, onboarding, analytics, compliance, knowledge
                (cada uma com api.ts, hooks.ts, components/)
  components/   componentes compartilhados (ui)
  services/     http.ts (axios), authService.ts
  types/        tipos da API
  lib/          formatadores (data, %, moeda), máscara de CPF
  styles/       tokens de design
```

Regra: página só compõe; chamadas à API ficam em `features/*/api.ts` e hooks; componentes de `components/` não conhecem a API.

### Autenticação e perfis

- Tela de login (`POST /api/auth/login`). O token fica em `sessionStorage` (decisão do demo; evolução: cookie httpOnly).
- Interceptor do Axios envia `Authorization: Bearer`. **401** limpa a sessão e volta ao login.
- Guarda de rota `RequireRole`: perfil sem permissão vê a tela "Acesso não autorizado" (o backend continua sendo a autoridade).
- Menu lateral montado conforme o perfil:

| Perfil | Itens |
|---|---|
| `colaborador` | Assistente RH (chat), Meu perfil |
| `rh` | Onboarding, Inteligência, Compliance (todas as telas), Base de conhecimento, Assistente trabalhista |
| `gestor` | Inteligência, Compliance (Dashboard, Central de inconsistências, Calendário), somente leitura |

### Design system

- **Tokens** em um único arquivo (`styles/tokens.css` ou `tailwind.config`): cores, raio, sombras, espaçamento, tipografia. Proposta inicial: base azul-marinho e branco, com um destaque ciano; risco **alto** vermelho, **moderado** âmbar, **baixo** verde. Ajustar à identidade da plataforma.
- Visual limpo, cards com bastante respiro, desktop primeiro e utilizável em tablet.
- **Acessibilidade:** selos nunca dependem só de cor (texto e ícone junto); campos com `label`; foco visível; contraste adequado.
- Todo bloco com dados tem os 3 estados: **carregando** (skeleton), **vazio** (mensagem útil) e **erro** (com botão "tentar de novo").

### Componentes compartilhados (`components/`)

`AppLayout` (sidebar, topbar, sino de notificações, menu do usuário), `PageHeader`, `StatCard` (valor, variação, seta), `DataTable` (ordenação e paginação), `FilterBar`, `RiskBadge` (baixo/moderado/alto), `PriorityBadge`, `StatusBadge`, `ConfidenceBadge` (baixa/media/alta), `SourceBadge` ("Regra interna" ou "Fonte oficial (a conferir)"), `FileDropzone` (PDF, valida tipo e tamanho), `ChatPanel` (mensagens, campo, "digitando...", renderiza fontes quando houver), `ConfirmDialog`, `Toast`, `DisclaimerBanner`, `EmptyState`, `ErrorState`, `Skeleton`.

### Avisos obrigatórios (vêm das Partes 2 a 4)

- **Onboarding:** "Dados extraídos por IA. Revise antes de aprovar."
- **Inteligência:** "Apoio à decisão. Não usar como base para ações individuais." Previsões **nunca** como certeza; mostrar a confiabilidade e, quando `baixa`, o aviso de baixa confiabilidade.
- **eSocial:** "Verificação preventiva do sistema. Não substitui a validação oficial do eSocial nem a análise de um profissional."
- **Assistente trabalhista:** "Apoio à consulta. Não substitui a análise de um profissional de legislação trabalhista." Quando `status = nao_confirmada`, mostrar destaque "Não foi possível confirmar a regra".
- **Obrigações:** prazos de seed exibem "prazo ilustrativo, conferir na fonte oficial" quando `SourceVerified = 0`.
- CPF **mascarado** em listas e tabelas (`***.***.***-25`); completo apenas no formulário de revisão do onboarding.

---

## Fases

### F0: Base
Contrato da API, projeto Vite, tokens, cliente HTTP, login, guarda por perfil, layout com menu por perfil, componentes compartilhados e telas "Acesso não autorizado" e "Não encontrado".
**Aceite:** login funciona com cada perfil; menu muda por perfil; rota proibida é bloqueada; 401 volta ao login; build sem erros de TypeScript.

### F1: Portal do colaborador
- **Assistente RH:** `ChatPanel` ligado a `POST /api/chat` e `GET /api/chat/sessions/:id/messages`; mantém o `sessionId`; sugestões de perguntas ("Quantos dias de férias tenho?", "Por que veio desconto de vale-transporte?"); erro 502 mostra mensagem amigável.
- **Meu perfil:** dados de `GET /api/me`.
**Aceite:** conversa fluida com estado "digitando"; histórico carregado ao reabrir a sessão; mensagem vazia ou acima de 1000 caracteres bloqueada no campo.

### F2: Onboarding (rh)
- **Lista de casos** com filtro por status.
- **Novo envio:** `FileDropzone` (PDF, até 5 MB) → `POST /api/onboarding/upload`.
- **Revisão do caso:** formulário pré-preenchido com os campos extraídos; campos ausentes ou inválidos destacados com a mensagem da validação; salvar correções (`PUT`); botões **Aprovar** (bloqueado enquanto houver erro de campo obrigatório) e **Rejeitar** (pede motivo); mostrar a senha temporária só na resposta da aprovação.
**Aceite:** o PDF completo vem sem alertas e aprova; o PDF incompleto mostra CPF inválido e campos ausentes e não aprova; caso aprovado vira somente leitura (409 tratado).

### F3: Inteligência preditiva (gestor, rh)
- Filtros de período e departamento (refazem as consultas).
- Cards: absenteísmo, horas extras por colaborador, turnover, alertas ativos (com variação).
- Gráficos (Recharts): evolução dos 3 indicadores, comparativo por departamento, ranking de concentração de risco.
- **Central de alertas:** selo de risco, indicadores, justificativa, recomendação; marcar lido/resolvido; botão "Recalcular alertas" (rh).
- **Previsões:** cards 30/60/90 dias por departamento com `RiskBadge`, `ConfidenceBadge` e "Por que esta previsão?" (indicadores que mais pesaram); se o serviço Python estiver indisponível (503), mostrar mensagem de indisponibilidade sem quebrar o resto da página.
- Recomendações em linguagem natural quando existirem.
**Aceite:** trocar filtro altera cards, gráficos e alertas; Atendimento aparece com risco alto; nenhuma previsão aparece como certeza.

### F4a: Compliance, validação e inconsistências
- **Validação de cadastros:** botão "Executar auditoria" (`POST /api/compliance/runs`, `scope=cadastros`), resumo da execução e tabela dos achados.
- **Central de inconsistências:** tabela com filtros (status, prioridade, evento, departamento, colaborador); painel lateral com descrição do caso, **regra e fonte** (`SourceBadge`), orientação de correção e ações **Marcar como corrigida** e **Ignorar** (justificativa obrigatória).
- **Auditoria eSocial:** lista de eventos (S-2200, S-2230, S-2299) com status; ação "Auditar evento"; **Confirmar envio simulado** com `ConfirmDialog`, desabilitado se houver inconsistência alta aberta; aviso de que nada é transmitido de verdade.
**Aceite:** a auditoria mostra os defeitos plantados; reexecutar não duplica; confirmar evento com pendência alta é bloqueado; `gestor` vê tudo sem botões de ação.

### F4b: Compliance, dashboard e obrigações
- **Dashboard:** conformidade (%), registros analisados, abertas, corrigidas, obrigações próximas, gráficos por prioridade, por regra, histórico e conformidade por departamento; filtros de período e departamento.
- **Calendário de obrigações:** grade mensal simples e lista; status com cores **e** texto (Em dia, Próximo do vencimento, Pendente, Atrasado); responsável; ação "Concluir" (rh).
- **Notificações:** sino com contador, lista e marcar como lida.
- **Histórico de auditorias:** execuções (`GET /api/compliance/runs`) e registro de auditoria paginado.
**Aceite:** indicadores batem com os dados do backend; os 4 status aparecem; concluir obrigação atualiza a tela; notificações não duplicam.

### F4c: Base de conhecimento e assistente trabalhista (rh)
- **Base de conhecimento:** lista com título, tipo, versão, data de publicação, vigência e se é a versão atual; upload de PDF (até 20 MB) com formulário de metadados; busca por palavras-chave.
- **Assistente trabalhista:** `ChatPanel` ligado a `POST /api/compliance/assistant/chat`; cada resposta mostra as fontes (título, versão, página/seção, **data de publicação**); `nao_confirmada` em destaque; aviso fixo.
**Aceite:** pergunta coberta mostra fontes; pergunta fora da base mostra "não foi possível confirmar"; nova versão de documento aparece como vigente e a anterior como histórica.

---

## Roteiro de demonstração (para a apresentação do TCC)

1. **Colaborador** (Ana): pergunta no chat quantos dias de férias tem e por que veio determinado desconto no holerite.
2. **RH**: envia a ficha de admissão completa, revisa os campos extraídos e aprova; depois envia a incompleta e mostra os alertas de CPF e campos ausentes.
3. **Gestor**: abre a Inteligência, filtra por Atendimento, mostra o alerta de risco alto e as previsões com confiabilidade.
4. **RH (compliance)**: executa a auditoria, abre uma inconsistência com a regra e a fonte, tenta confirmar um evento eSocial com pendência (bloqueado), corrige e confirma.
5. **Assistente trabalhista**: pergunta algo coberto pelos documentos (com fonte) e algo fora deles (resposta "não consegui confirmar").

## Segurança no frontend

1. O frontend **não decide permissão**: esconder menu é conveniência; o backend valida sempre.
2. Nunca guardar chave de API no frontend (a chave do Gemini só existe no backend).
3. Não renderizar HTML vindo da IA ou dos documentos (texto puro ou markdown sanitizado).
4. CPF mascarado em listas; nada de dado pessoal em `console.log`.
5. Validação de arquivo (tipo e tamanho) no cliente é só conforto; o backend revalida.

## Ordem sugerida

F0 → F1 → F2 → F3 → F4a → F4b → F4c. Ao fim de cada fase: testar manualmente com os perfis relevantes antes de seguir.
