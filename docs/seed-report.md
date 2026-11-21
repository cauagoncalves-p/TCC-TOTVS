# Relatório de Verificação do Seed Mestre (Parte 8B)

Data de Execução: 2026-11-18T22:42:57.193Z  
Data de Referência do Seed (`SeedConfig.Today`): **2026-11-18**  
Usuário Executor: `rh.seed@seed.exemplo.com`

---

## 1. Resumo Geral de Execução

- **Auditoria de Cadastros:** 1096 registros analisados, 31 inconsistências abertas.
- **Deduplicação na Reanálise:** Aprovada (0 novos achados na reexecução)
- **Auditoria eSocial:** 50 eventos analisados, 12 inconsistências abertas.
- **Central de Alertas:** 8 cenários avaliados.
- **Quadro de Pessoal:** Variação máxima entre métricas e cadastros dentro do limite de defeitos plantados por departamento.

---

## 2. Compliance: Tabela Comparativa por Regra

| Regra | Gabarito (Linhas) | Ocorrências Esperadas | Encontrados | Falsos Negativos | Falsos Positivos |
|---|---|---|---|---|---|
| `EMP_CPF_INVALID` | 3 | 3 | 3 | 0 | 0 |
| `EMP_DATES_ORDER` | 3 | 3 | 3 | 0 | 0 |
| `EMP_DUP_PERSON` | 4 | 2 | 4 | 0 | 0 |
| `EMP_MIN_AGE` | 1 | 1 | 1 | 0 | 0 |
| `EMP_REQ_FIELDS` | 4 | 4 | 4 | 0 | 0 |
| `EMP_STATUS_TERM` | 2 | 2 | 2 | 0 | 0 |
| `ESOCIAL_S2200_CHECKLIST` | 7 | 7 | 7 | 0 | 0 |
| `ESOCIAL_S2230_CHECKLIST` | 2 | 2 | 2 | 0 | 0 |
| `ESOCIAL_S2299_CHECKLIST` | 3 | 3 | 3 | 0 | 0 |
| `JOB_WEEKLY_HOURS` | 2 | 2 | 2 | 0 | 0 |
| `LEAVE_DATES` | 2 | 2 | 2 | 0 | 0 |
| `LEAVE_OVERLAP` | 2 | 2 | 2 | 0 | 0 |
| `PAY_NET_NONPOSITIVE` | 1 | 1 | 1 | 0 | 0 |
| `PAY_TOTALS` | 3 | 3 | 3 | 0 | 0 |
| `VAC_OVER` | 2 | 2 | 2 | 0 | 0 |
| **TOTAL** | **41** | **34** | **41** | **0** | **0** |

---

## 3. Alertas por Departamento

| Departamento | Regra Esperada | Risco Esperado | Expectativa | Alertas Gerados | Alertas Alto no Depto |
|---|---|---|---|---|---|
| **Atendimento** | `ABS_OT_UP` | alto | Faltas e horas extras sobem juntas nos últimos 5 meses | 1 | 3 |
| **Atendimento** | `TRIPLE_RISK` | alto | Faltas, horas extras e turnover sobem no mesmo trimestre | 1 | 3 |
| **Comercial** | `ABS_LEADS_TURNOVER` | alto | Absenteísmo sobe e o turnover sobe 2 meses depois | 0 | 0 |
| **Financeiro** | -(Nenhum) | - | Horas extras altas há 8 a 14 meses, já normalizadas: NENHUM alerta atual (teste de falso positivo) | 0 | 0 |
| **Logística** | `OT_CHRONIC` | moderado | Horas extras altas nos últimos 8 meses | 1 | 0 |
| **Projetos Especiais** | -(Nenhum) | - | Só 5 meses de dados: previsões com confiabilidade BAIXA e aviso na tela | 0 | 0 |
| **RH** | -(Nenhum) | - | Estável: NENHUM alerta de risco alto | 0 | 0 |
| **Tecnologia** | -(Nenhum) | - | Estável: NENHUM alerta de risco alto | 0 | 0 |

---

## 4. Distribuição das Obrigações por Status Exibido

| Status Exibido | Quantidade Encontrada | Esperado pelo Seed |
|---|---|---|
| **Atrasado** | 3 | 3 |
| **Em dia** | 4 | 4 |
| **Pendente** | 3 | 3 |
| **Próximo do vencimento** | 3 | 3 |

---

## 5. Quadro de Pessoal: Métricas x Cadastros

| Departamento | Nas Métricas | Nos Cadastros | Defeitos Plantados no Depto | Status |
|---|---|---|---|---|
| Atendimento | 21 | 21 | 5 | ✔ Coerente |
| Comercial | 21 | 19 | 9 | ✔ Coerente |
| Financeiro | 18 | 17 | 4 | ✔ Coerente |
| Logística | 25 | 24 | 6 | ✔ Coerente |
| Projetos Especiais | 10 | 10 | 0 | ✔ Coerente |
| RH | 8 | 8 | 2 | ✔ Coerente |
| Tecnologia | 27 | 27 | 3 | ✔ Coerente |

---

## 6. Lista de Divergências Classificadas

1. **Checklist Pré-envio eSocial (`ESOCIAL_S2200_CHECKLIST`, `ESOCIAL_S2230_CHECKLIST`, `ESOCIAL_S2299_CHECKLIST`)**:
   - **Classificação:** Bug de implementação no código (nomenclatura / mapeamento de regra).
   - **Ação:** Criado mapeamento formal `backend/scripts/seed/ruleCodeMap.js` e ajustada a resolução no serviço `complianceRunService.js`. Todos os 12 defeitos agora são identificados sem falsos negativos.

2. **Afastamentos (`LEAVE_DATES` e `LEAVE_OVERLAP`)**:
   - **Classificação:** Bug de implementação no código (driver SQL / formatação de data ISO).
   - **Ação:** Colunas `StartDate` e `EndDate` convertidas para strings ISO (`YYYY-MM-DD`) e adicionado helper `toDateStr` no validador. Resolvidos 4 falsos negativos e eliminados 8 falsos positivos.

3. **Alerta `ABS_LEADS_TURNOVER` no Departamento Comercial**:
   - **Classificação:** Regra de negócio / Limite / Threshold.
   - **Diagnóstico:** O absenteísmo no Comercial cresce progressivamente ao longo de 5 meses (de 3.10% até 5.89%), sucedendo na elevação do turnover (8.33%, 9.09% e 4.76%). A regra em `riskRulesService.js` avaliava apenas os 3 meses contíguos com `spikeMonth.AbsenceRate >= baselineAbsAvg * 1.3`. A razão mês-a-mês foi de ~1.29x.
   - **Ação:** Pendente alinhamento com o usuário se ajustamos o limiar para 1.25x ou se a janela de base considera a média dos meses pré-alta.
