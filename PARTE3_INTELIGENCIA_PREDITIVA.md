## PARTE 3: Central de Inteligência Preditiva

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md. Implementar **uma fase por vez** (A, B, C). Não adiantar fases.
> Stack do projeto: Node.js + Express no backend. **Não usar C#/ASP.NET.**

### Objetivo
Ajudar gestores a cruzar absenteísmo, horas extras e turnover para **antecipar** problemas de gestão de pessoas, em vez de só analisar o que já aconteceu. O módulo mostra indicadores, detecta padrões de risco, gera alertas com recomendação e, na fase B, prevê tendências para 30, 60 e 90 dias.

### Princípios (obrigatórios)

1. **Só dados agregados** (por departamento e mês). Nenhum dado individual de colaborador entra neste módulo: sem previsão, ranking ou alerta sobre pessoas.
2. **Apoio à decisão, nunca veredito.** A interface e os textos dos alertas deixam claro que não servem como justificativa para demissão, punição ou avaliação individual.
3. **Honestidade estatística.** Previsão nunca é apresentada como certeza. Toda previsão tem nível de confiabilidade (`baixa`, `media`, `alta`) e a explicação dos indicadores que pesaram.
4. **Explicável antes de sofisticado.** Regras claras e modelos simples (regressão) em vez de modelos opacos.
5. **Dados 100% fictícios**, gerados por script reproduzível. Na apresentação, dizer que os padrões foram simulados para demonstrar o funcionamento.

### Fases

| Fase | Entrega |
|---|---|
| **A (MVP)** | Banco + seed, endpoints de indicadores, dashboard com filtros e gráficos, cruzamento por regras, central de alertas |
| **B** | Serviço Python (FastAPI + scikit-learn) e área de previsões 30/60/90 dias |
| **C** | Recomendações em linguagem natural com Gemini e preparação para integração com o ERP TOTVS |

---

## Indicadores (fórmulas oficiais)

Calculados no banco (colunas calculadas em `DepartmentMonthlyMetrics`):

- **Absenteísmo (%)** = `AbsenceDays / (Headcount × WorkDays) × 100`
- **Horas extras por colaborador** = `OvertimeHours / Headcount`
- **Turnover mensal (%)** = `Terminations / Headcount × 100`

## Banco de dados e seed

Script: `database/003_analytics_schema.sql`. Tabelas: `Departments`, `DepartmentMonthlyMetrics`, `Alerts`, `Predictions`.

Seed em `backend/scripts/seedAnalytics.js`:
- **24 meses** terminando no último mês fechado (12 meses é pouco para o modelo da fase B).
- **6 departamentos**: Atendimento, Tecnologia, Financeiro, Comercial, Logística, RH.
- Gerador com **semente fixa** (resultado reproduzível) e **idempotente** (limpa e recria só as tabelas de métricas).
- Cenários simulados, com ruído leve:
  - **Atendimento:** faltas e horas extras sobem juntas nos últimos 5 meses, seguidas de aumento de desligamentos (cenário principal da demo).
  - **Logística:** horas extras altas de forma crônica.
  - **Comercial:** absenteísmo sobe e, dois meses depois, o turnover sobe (sinal precoce).
  - **Tecnologia, Financeiro, RH:** estáveis (servem de comparação).

## Cruzamento de indicadores (fase A)

Motor de regras em `backend/src/services/riskRulesService.js`, com limites em `backend/src/config/thresholds.js` (valores iniciais, ajustáveis).

| Código | Padrão detectado | Risco |
|---|---|---|
| `ABS_OT_UP` | Absenteísmo e horas extras crescendo juntos por 3 meses seguidos | moderado; alto se ambos ficarem 20% acima da média da empresa |
| `OT_CHRONIC` | Horas extras por colaborador acima do limite em 3 dos últimos 4 meses | moderado |
| `ABS_LEADS_TURNOVER` | Absenteísmo 30% acima da média dos 3 meses anteriores, seguido de alta no turnover | alto |
| `TRIPLE_RISK` | Faltas, horas extras e turnover subindo no mesmo trimestre | alto |

Cada alerta gerado contém: departamento, indicadores envolvidos (com os números), nível de risco, justificativa, **possível causa a investigar** e **recomendação preventiva**. Na fase A, os textos vêm de modelos de texto fixos por regra (previsíveis e auditáveis). Alertas são deduplicados por `(departamento, regra, mês)`.

Recomendações-base por padrão: redistribuir atividades; avaliar necessidade de contratação; investigar causas do absenteísmo; acompanhar o departamento de perto; ações de retenção de talentos.

## Endpoints (todos com `authMiddleware` + perfil `gestor` ou `rh`)

| Método e rota | Função |
|---|---|
| `GET /api/analytics/departments` | Lista departamentos (para os filtros) |
| `GET /api/analytics/summary?from=&to=&departmentId=` | Cards: absenteísmo, horas extras/colab., turnover, alertas ativos, com variação vs. período anterior |
| `GET /api/analytics/timeseries?from=&to=&departmentId=` | Série mensal dos 3 indicadores (gráfico de evolução) |
| `GET /api/analytics/by-department?month=` | Comparativo entre departamentos no mês |
| `GET /api/analytics/hotspots` | Departamentos ordenados por concentração de risco (alertas ativos: alto=3, moderado=2, baixo=1) |
| `POST /api/alerts/generate` | Recalcula os alertas pelas regras |
| `GET /api/alerts?status=&risk=&departmentId=` | Lista alertas |
| `PATCH /api/alerts/:id` | Muda status (`lido`, `resolvido`) |
| `GET /api/predictions?horizon=` | Última execução de previsões (fase B) |
| `POST /api/predictions/run` | Executa o modelo (fase B) |

Perfil `colaborador` recebe 403. Parâmetros validados (datas, ids). Queries parametrizadas.

## Frontend (React + Recharts)

Página `Inteligência` (rota protegida para `gestor` e `rh`):
- **Filtros:** período e departamento. Alterar o filtro refaz as consultas.
- **Cards:** absenteísmo, horas extras/colaborador, turnover, alertas ativos (com variação e seta).
- **Gráficos:** evolução dos 3 indicadores (12 meses por padrão), comparativo por departamento (barras), ranking de concentração de risco.
- **Central de alertas:** lista com selo de risco, indicadores, justificativa, recomendação e botões marcar como lido/resolvido.
- **Previsões** (fase B): cards 30/60/90 dias por departamento, com selo de confiabilidade e "por que esta previsão".
- Estados de carregando, vazio e erro em todos os blocos. Aviso fixo: "Apoio à decisão. Não usar como base para ações individuais."
- Usar a paleta já definida no frontend; se não houver, centralizar os tokens de cor em um único arquivo.

---

## Fase B: Previsão com Python e scikit-learn

Serviço em `ml/` (FastAPI, porta 8000), **sem acesso direto ao banco**: o backend Node envia as séries mensais e recebe as previsões. Assim as camadas do projeto continuam intactas e o Python fica simples.

**Contrato:**
- `POST /predict` recebe, por departamento, a lista de meses com `headcount`, `absenceRate`, `overtimePerEmployee`, `turnoverRate`.
- Devolve, por departamento e horizonte (30, 60, 90 dias): `predictedTurnoverRate`, `predictedOvertimePerEmployee`, `increaseProbability`, `riskLevel`, `confidence`, `contributions` e `modelVersion`.
- O Node salva o resultado em `Predictions` (um `RunId` por execução).
- Se o serviço Python estiver fora do ar, a rota responde 503 amigável e o resto do dashboard continua funcionando.

**Modelagem (simples e interpretável):**
- Variáveis: valores defasados (lags 1 a 3), tendência dos últimos 3 meses e diferença em relação à média da empresa.
- Previsão numérica: regressão regularizada (ex.: Ridge). Probabilidade de aumento do turnover: regressão logística.
- Validação com divisão temporal (`TimeSeriesSplit`), nunca aleatória. Comparar sempre com a linha de base ingênua (repetir o último valor).
- `contributions`: peso de cada indicador (coeficiente × valor), mostrando se empurra o risco para cima ou para baixo.
- **Confiabilidade:** `baixa` se houver menos de 12 meses ou se o modelo não superar a linha de base; `media` com 12 a 23 meses e desempenho melhor que a base; `alta` só com 24+ meses e desempenho consistentemente melhor. Em `baixa`, a tela exibe o aviso de que a previsão tem baixa confiabilidade.
- Nível de risco por faixas da probabilidade (baixo, moderado, alto), definidas em constantes documentadas.
- Alertas com `Source = 'modelo'` podem ser gerados quando o risco previsto for alto **e** a confiabilidade não for baixa.

## Fase C: Recomendações com Gemini e preparo para o ERP

- **Recomendações em linguagem natural:** o backend envia ao Gemini apenas números agregados do alerta ou da previsão (nunca dados pessoais) e pede uma explicação e ações sugeridas em português, em saída estruturada. O prompt proíbe afirmar certezas e proíbe sugerir medidas contra indivíduos. Se o Gemini falhar, usar o texto fixo da regra (a tela não quebra).
- **Preparo para o ERP TOTVS:** criar uma interface única de fonte de dados (`hrDataSource`) com a implementação atual `databaseSource`. A futura integração será outra implementação (`totvsSource`) que alimenta `DepartmentMonthlyMetrics`, sem mudar serviços nem telas. Documentar no código o formato esperado dos dados.

## Segurança e LGPD

1. Rotas só para `gestor` e `rh`; verificação sempre no backend.
2. Dados agregados e fictícios; nada de CPF, nome ou matrícula neste módulo.
3. Gemini e Python recebem somente agregados.
4. Textos e telas com o aviso de apoio à decisão.
5. Nunca registrar em log o corpo completo das previsões com dados sensíveis (aqui são agregados, mas manter o hábito).

---

## Ordem de implementação

**Fase A**
1. Rodar `003_analytics_schema.sql`; criar usuário de teste com perfil `gestor`.
2. `seedAnalytics.js` (24 meses, 6 departamentos, semente fixa) e conferir os dados no SSMS.
3. Repositories e `analyticsService` (summary, timeseries, by-department, hotspots) e rotas.
4. `thresholds.js`, `riskRulesService`, geração e listagem de alertas.
5. Frontend: página `Inteligência` com filtros, cards, gráficos e central de alertas.

**Fase B**
6. Serviço `ml/` com `/predict`, treino e validação temporal.
7. `predictionService` no Node (chamada ao Python, gravação em `Predictions`) e rotas.
8. Área de previsões no frontend com selo de confiabilidade e explicação.

**Fase C**
9. Recomendações com Gemini (com fallback para o texto fixo).
10. Interface `hrDataSource` e documentação do formato para o ERP.

## Critérios de aceite

**Fase A**
- Trocar o filtro de período ou departamento altera cards, gráficos e alertas, com dados vindos do banco.
- Atendimento aparece com alerta de risco alto (faltas e horas extras subindo juntas); Logística com `OT_CHRONIC`; Comercial com `ABS_LEADS_TURNOVER`; os estáveis sem alerta de risco alto.
- Cada alerta mostra departamento, indicadores com números, risco, justificativa e recomendação.
- Gerar alertas duas vezes não duplica registros.
- Marcar alerta como lido/resolvido persiste.
- `colaborador` recebe 403 em todas as rotas do módulo.
- Seed rodado duas vezes produz o mesmo resultado.

**Fase B**
- Previsões para 30, 60 e 90 dias por departamento, com risco, confiabilidade e indicadores que mais pesaram.
- Com menos de 12 meses de dados, a confiabilidade sai `baixa` e a tela avisa.
- Com o serviço Python parado, o dashboard continua funcionando e a área de previsões mostra mensagem de indisponibilidade.
- Nenhuma tela apresenta a previsão como certeza.

**Fase C**
- Recomendação em português gerada a partir de números agregados; com o Gemini indisponível, aparece o texto fixo.
- Trocar a fonte de dados exige mudar só a implementação de `hrDataSource`.

## Evoluções (fora do escopo agora)
- Escopo por departamento para cada gestor (hoje o gestor vê todos).
- Integração real com a API do ERP TOTVS.
- Alertas por e-mail ou notificação push.
- Reavaliação periódica do modelo com dados reais.
