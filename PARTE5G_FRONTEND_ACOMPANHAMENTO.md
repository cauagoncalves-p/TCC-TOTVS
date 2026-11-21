## PARTE 5G: Frontend do Acompanhamento de Colaboradores (índice de atenção)

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md. Somente frontend.
> Implementa as telas da `PARTE10_ACOMPANHAMENTO_INDIVIDUAL.md` (o backend da fase correspondente já deve estar pronto). Em conflito sobre **regras de negócio e limites de privacidade**, vale a PARTE10; sobre **telas e comportamento da interface**, vale este documento.
> **Passo zero:** atualizar `docs/API_CONTRACT.md` com as rotas **reais** de `/api/retention/*` (campos da lista, do detalhe, códigos dos sinais, paginação). Se divergir da PARTE10, vale o código; registrar a divergência.
> Reaproveitar: layout e abas de Inteligência, guardas de perfil, `DataTable`, badges, `ConfirmDialog`, `Toast`, `EmptyState`, `ErrorState`, Recharts, tokens de cor (5C), responsividade (5F) e acessibilidade/VLibras (Parte 6).

### Objetivo
Uma aba **"Colaboradores"** na tela de Inteligência Preditiva, **só para o RH**, que lista as pessoas **de um departamento ou de toda a empresa** com nome, setor, faltas, horas extras e outros sinais, e um **índice de atenção** explicável, com painel de detalhe. É uma ferramenta de **apoio à retenção e ao cuidado com as equipes**.

### Princípios (privacidade e responsabilidade, obrigatórios)
1. **Perfil `rh` apenas.** A aba e as rotas não existem para `gestor` nem `colaborador` (o backend também responde 403, e a tela trata isso).
2. **Aviso de uso restrito sempre visível** (lista, painel e página de transparência) e aviso de que **os acessos são registrados**.
3. **Linguagem responsável:** "índice de atenção" e níveis **Baixa, Moderada e Alta**. Proibido exibir "probabilidade de saída", "risco crítico", "vai sair" ou porcentagens de saída. O índice é "indicador de apoio, não é previsão".
4. **Nada além do que a API devolve.** A tela nunca exibe nem tenta obter salário, CPF, idade, gênero, motivo de ausência, saúde ou dados de clima.
5. **Sem exportação**, sem "copiar lista", sem impressão em massa nesta versão.
6. **Dados pessoais não ficam no navegador:** nada em `localStorage`, `sessionStorage`, URL ou logs; cache curto; limpeza no logout.
7. Nenhum dado fixo no frontend; tudo vem da API.

### Rotas e permissões

| Rota | Tela | Perfil |
|---|---|---|
| `/inteligencia/colaboradores` | Lista (aba "Colaboradores") | rh |
| `/inteligencia/colaboradores/como-calculamos` | Transparência do cálculo | rh |

A aba "Colaboradores" só aparece para `rh`. Quem não é `rh` e acessar a rota vê "Acesso não autorizado".
Estado da lista na URL: `escopo`, `departamento`, `nivel`, `ordem` e `pagina`. **O termo digitado na busca por nome nunca vai para a URL** e o painel de detalhe **não usa o identificador da pessoa na URL** (fica em estado da tela).

### Organização do código

```
features/retention/
  api.ts            chamadas HTTP
  hooks.ts          useRetentionList, useRetentionSummary, useRetentionDetail,
                    useRetentionConfig, useRecalculate, useAddFollowUp
  types.ts          tipos a partir do API_CONTRACT
  labels.ts         rótulos de nível, qualidade dos dados, sinais e tipos de acompanhamento
  utils/            formatação de tempo ("há 26 meses"), tendência, regras de exibição
  components/       RestrictedUseNotice, ScopeSelector, LevelFilter, SummaryCards, RetentionTable,
                    RetentionCardList, AttentionIndexBar, LevelBadge, SignalChips, TrendIndicator,
                    EmployeeDetailPanel, ScoreBreakdown, MonthlyComparisonChart, CareerTimeline,
                    NotConsideredBox, FollowUpForm, FollowUpList, MethodologyPage
pages/inteligencia/  EmployeesTab, MethodologyPage
```

### Dados e cache (TanStack Query)

| Hook | Comportamento |
|---|---|
| `useRetentionList(filtros)` | `staleTime` de 60 s; sem atualização automática periódica |
| `useRetentionSummary(escopo)` | `staleTime` de 60 s; acompanha o escopo e o filtro de departamento |
| `useRetentionDetail(id)` | `staleTime` de 0 e **`gcTime` de poucos segundos** (não manter dados da pessoa em cache depois de fechar o painel) |
| `useRetentionConfig()` | `staleTime` longo |
| `useRecalculate()` | Invalida lista, resumo e detalhe |
| `useAddFollowUp()` | Invalida o detalhe |

No **logout** (e ao trocar de usuário), limpar todo o cache das consultas `retention`. A busca por nome usa atraso de ~400 ms e mínimo de 2 caracteres.

### Rótulos (PT-BR)

| Valor da API | Texto exibido | Observação |
|---|---|---|
| `alta` | **Atenção alta** | cor de risco alto, ícone de alerta |
| `moderada` | **Atenção moderada** | cor de risco moderado |
| `baixa` | **Atenção baixa** | cor de risco baixo |
| `insuficiente` | **Dados insuficientes** | neutro, sem barra de índice |
| `nao_aplicavel` | **Não aplicável** | neutro, sem barra (ex.: aprendiz) |
| qualidade `parcial` | Chip "Dados parciais" com dica | informa que há poucos meses válidos |

Sinais (os códigos reais vêm do contrato): horas extras acima do setor, faltas em alta, sem movimentação de carreira há muito tempo, saldo de férias elevado. **Todo nível e todo sinal aparecem com texto e ícone**, nunca só cor.
Tendência: **"em alta"**, **"estável"** ou **"em queda"** (texto + seta), comparando com os 3 meses anteriores.

---

## Tela 1: Lista (`/inteligencia/colaboradores`)

**Cabeçalho**
- Abas da tela de Inteligência: **Visão por departamento** | **Colaboradores**.
- `RestrictedUseNotice` em destaque: "Uso restrito ao RH. Apoio à retenção e ao cuidado com as equipes. Não usar como base para demissão, punição ou avaliação disciplinar. Os acessos a esta tela são registrados."
- Link **"Como o índice é calculado"** e botão **Recalcular índice** (confirmação, com a data do último cálculo).

**Filtros** (`ScopeSelector`, `LevelFilter`, busca, opção)
- **Escopo:** "Toda a empresa" ou "Departamento" (lista de departamentos vinda da API).
- **Nível:** Todos, Alta, Moderada, Baixa, Dados insuficientes, Não aplicável.
- **Busca** por nome ou matrícula.
- Opção **"Somente com sinais"**.
- **Ordenação:** índice (padrão, maior primeiro), faltas no mês, horas extras, nome, tempo sem movimentação.

**Cartões de resumo** (`SummaryCards`): colaboradores analisados, **Atenção alta**, **Atenção moderada**, **Dados insuficientes**. Cada um **filtra a lista ao clicar** (alternar) e mostra o valor do escopo atual. Devem bater com a lista filtrada.

**Tabela** (`RetentionTable`; cartões no celular via `RetentionCardList`, conforme a PARTE5F)

| Coluna | Conteúdo |
|---|---|
| Nome | Nome e matrícula (abaixo) |
| Departamento e cargo | Dois níveis de texto |
| Tempo de casa | "2 anos e 3 meses" |
| Faltas | Último mês fechado e últimos 3 meses (ex.: "1 | 4") |
| Horas extras | Média dos 3 meses (ex.: "18 h") |
| Última movimentação | "há 26 meses" (ou "sem registro") |
| Saldo de férias | Dias |
| Índice de atenção | Barra + número (0 a 100) + nível (texto e ícone) + tendência |
| Sinais | Até 3 etiquetas; "+2" com dica quando houver mais |
| Ação | Botão **Ver detalhes** (a linha inteira também abre) |

- `<table>` com legenda, cabeçalhos associados e `aria-sort` nas colunas ordenáveis; linhas por teclado.
- Pessoas "Dados insuficientes" e "Não aplicável" exibem o rótulo no lugar da barra, com a dica do motivo (ex.: "Menos de 90 dias de casa", "Aprendiz: fora do índice").
- Paginação de 25 por página. **Nenhum botão de exportar.**
- **Estados:** carregando (linhas esqueleto), vazio ("Nenhum colaborador encontrado com esses filtros." + limpar filtros), erro com **Tentar de novo**; 403 mostra "Acesso restrito ao RH."

---

## Tela 2: Detalhe (painel lateral, `EmployeeDetailPanel`)

Abre ao clicar na linha; **tela cheia no celular**; fecha com `Esc` e botão, devolvendo o foco ao item de origem; foco preso dentro do painel enquanto aberto.

1. **Cabeçalho:** nome, matrícula, departamento, cargo, tempo de casa. Aviso "Este acesso é registrado."
2. **Índice e nível:** número grande, `LevelBadge`, qualidade dos dados e a frase fixa "Indicador de apoio. Não é uma previsão de saída."
3. **Composição do índice** (`ScoreBreakdown`): três barras (**Sobrecarga**, **Ausências**, **Estagnação**) com pontos, máximo e a **frase explicativa** vinda da API (ex.: "Horas extras: média de 26 h nos últimos 3 meses; mediana do departamento: 12 h").
4. **Faltas e horas extras de 12 meses** (`MonthlyComparisonChart`, Recharts): duas linhas pequenas, **a pessoa** e a **mediana do departamento**; meses sem registro (afastamento ou antes da admissão) aparecem como **lacuna**, sem preenchimento com zero. Sempre acompanhado de **resumo em texto** (acessibilidade e VLibras): "Nos últimos 3 meses, 4 faltas; a mediana do departamento é 1."
5. **Carreira** (`CareerTimeline`): admissão e movimentações com **tipo e data**, **sem valores**.
6. **Férias:** saldo e período.
7. **"O que não é considerado"** (`NotConsideredBox`): motivo de ausências, saúde, afastamentos legais, idade, gênero, salário e pesquisa de clima anônima.
8. **Acompanhamento (Fase C):** ver abaixo.
9. Estados de carregando (esqueleto), erro (**Tentar de novo**), 404 ("Colaborador não encontrado") e 429 (mensagem da API).

### Acompanhamento (`FollowUpForm` e `FollowUpList`, Fase C)
- Sugestões de apoio como **texto** (conversa individual, revisar carga e distribuição de tarefas, entender as causas com abordagem de apoio, avaliar plano de desenvolvimento). **Sem botão de disparar alerta ou integração com outro sistema.**
- Formulário: **tipo** (lista) e **nota** (até 500 caracteres, com contador), com aviso fixo **"Não registre dados de saúde nem motivo de ausências."**
- Histórico: data, tipo, quem registrou e nota, em **texto puro**.
- Após salvar: confirmação e atualização do histórico.

---

## Tela 3: Como o índice é calculado (`/inteligencia/colaboradores/como-calculamos`)
Página de **transparência** alimentada por `GET /api/retention/config`: versão do cálculo (`regras-v1`), janela de análise, tabela de **componentes e pesos** (Sobrecarga 40, Ausências 40, Estagnação 20), limites dos níveis, regras de **dados insuficientes e não aplicável**, e as **limitações**: usa regras simples e explicáveis, não é modelo de aprendizado de máquina, não considera motivos de ausência nem dados sensíveis, depende da qualidade dos dados e deve ser validado com dados reais antes de uso. Inclui `RestrictedUseNotice` e a caixa "O que não é considerado".

---

## Tratamento de erros

| Situação | Comportamento |
|---|---|
| 401 | O interceptor volta ao login |
| 403 | "Acesso restrito ao RH." (sem expor dados) |
| 404 | "Colaborador não encontrado." |
| 429 | Exibir a mensagem da API |
| 5xx ou sem conexão | "Não foi possível carregar agora. Tente de novo." com botão |
| Recalcular com falha | Mensagem e manutenção dos dados anteriores |

## Acessibilidade e responsividade
- Níveis, sinais e tendências com **texto e ícone**; contraste AA; tokens de cor da 5C. Níveis de atenção em tons de alerta, mas **sem linguagem alarmista**.
- Tabela acessível; painel com foco preso, `Esc` e retorno do foco; gráficos com resumo em texto; leitura por VLibras sem depender de imagens.
- Celular: lista em **cartões**, painel em tela cheia, filtros recolhidos em um painel "Filtros" (PARTE5F).
- Respeitar `prefers-reduced-motion`.

## Segurança no frontend
1. Nenhum `console.log` de nome, matrícula, índice, notas ou respostas da API.
2. Nenhum dado de pessoa em `localStorage`, `sessionStorage`, URL, título da página ou mensagens de erro; o campo de busca não é salvo.
3. Cache curto e limpeza no logout; o detalhe não permanece em cache ao fechar o painel.
4. Notas e textos exibidos **somente como texto** (sem HTML nem links automáticos).
5. Sem exportar, imprimir em massa ou copiar a lista (nenhum botão para isso); o backend continua sendo a autoridade de permissão.

---

## Ordem de implementação

**Fase A: lista**
1. Atualizar `API_CONTRACT.md`, tipos, `api.ts`, hooks, rótulos e rota com guarda `rh`.
2. Aba "Colaboradores" com `RestrictedUseNotice`, escopo, filtros, busca, ordenação e cartões de resumo clicáveis.
3. Tabela acessível e versão em cartões; níveis, sinais e tendência; estados de carregando, vazio e erro; paginação.

**Fase B: detalhe e transparência**
4. `EmployeeDetailPanel` com composição do índice, gráficos comparativos com resumo em texto, carreira, férias e "O que não é considerado".
5. Página "Como o índice é calculado" e botão **Recalcular índice** com confirmação.
6. Limpeza de cache no logout e cache curto do detalhe.

**Fase C: acompanhamento**
7. `FollowUpForm` e `FollowUpList`.
8. Revisão final de acessibilidade, privacidade (busca na URL, cache, logs) e responsividade.

## Critérios de aceite

**Fase A**
- Só o `rh` vê a aba "Colaboradores"; `gestor` e `colaborador` não a veem e recebem "Acesso não autorizado" pelo endereço.
- "Toda a empresa" lista os colaboradores ativos; ao escolher um departamento, só os dele aparecem; os cartões de resumo batem com a lista filtrada e filtram ao clicar.
- A tabela mostra nome, setor, cargo, tempo de casa, **faltas (último mês e 3 meses)**, **horas extras**, última movimentação, saldo de férias, índice, nível e sinais; **não aparece** salário, CPF, idade, gênero, motivo de ausência ou saúde.
- As **8 pessoas do gabarito** do seed aparecem como **Atenção alta**; aprendizes como **Não aplicável**; admitidos há menos de 90 dias como **Dados insuficientes** (sem barra).
- O termo da busca por nome **não aparece na URL**; não existe botão de exportar.
- Funciona por teclado, em celular (cartões) e com os estados de carregando, vazio e erro.

**Fase B**
- O painel abre e fecha com foco correto; mostra as três barras com as frases da API; os gráficos mostram a pessoa e a mediana do departamento, com lacunas nos meses sem registro e com resumo em texto.
- Fechar o painel não deixa os dados da pessoa em cache; sair da conta limpa tudo.
- A página de transparência mostra versão, pesos, limites e limitações.
- Recalcular pede confirmação e atualiza a lista.

**Fase C**
- O RH registra e vê ações de acompanhamento, com contador de 500 caracteres e o aviso sobre saúde; não existe botão de disparo automático.

**Geral**
- Nenhum texto com "probabilidade de saída", "risco crítico" ou equivalente; nenhum dado de pessoa em log, URL ou armazenamento do navegador.

## Fora do escopo
Exportação, impressão, comparação entre pessoas lado a lado, visão para gestor, simulador por pessoa, integração com outros sistemas, notificações automáticas sobre pessoas.
