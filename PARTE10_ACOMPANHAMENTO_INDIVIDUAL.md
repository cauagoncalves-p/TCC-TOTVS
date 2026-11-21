## PARTE 10: Acompanhamento individual de colaboradores (índice de atenção)

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md. Implementar **uma fase por vez** (A, B, C).
> Estende a Parte 3 (Inteligência Preditiva). Reaproveitar: `authMiddleware`, perfis, `ComplianceAuditLog`, componentes e tokens de cor, responsividade (PARTE5F) e acessibilidade (Parte 6).
> Banco: `database/012_individual_attention.sql` e, para dados de teste, `database/seed/S08_atencao_individual.sql`.

### Objetivo
Na tela de Inteligência Preditiva, permitir que o **RH** veja os colaboradores **de um departamento ou de toda a empresa**, com nome, setor, faltas, horas extras e outros sinais, e um **índice de atenção** explicável que ajude a **cuidar da retenção** e a **conversar com as equipes antes** de um problema acontecer.

### Mudança de princípio (leia antes de implementar)
Até aqui a Parte 3 trabalhava **só com dados agregados**, e a tela avisa que os indicadores "não devem ser usados como justificativa para ações individuais". Esta parte **introduz uma visão individual**. Isso é uma decisão de produto com risco ético e de privacidade, então ela só é aceitável com os limites abaixo. **Eles fazem parte do requisito**, não são opcionais.

### Limites obrigatórios

1. **Finalidade restrita:** apoio à retenção e ao cuidado com as pessoas. **Nunca** base para demissão, punição, avaliação disciplinar, corte de benefícios ou decisão automática. Aviso fixo e visível em toda tela.
2. **Acesso somente do perfil `rh`.** `gestor` e `colaborador` recebem 403 (o gestor continua com a visão agregada; visão individual por gestor exigiria vínculo gestor-departamento e nova revisão).
3. **Índice de atenção, não "probabilidade de saída".** Nada de "85% de chance de sair" nem "Risco crítico": com dados simulados ou poucos desligamentos isso não é defensável. Usar níveis **Baixa, Moderada e Alta** com o **motivo** de cada ponto.
4. **Explicável e auditável:** regras e pesos transparentes (tela "Como o índice é calculado"), versão do cálculo registrada (`regras-v1`), cada componente com a frase que o justifica.
5. **Dados que NÃO entram** no cálculo, na tela, nos logs nem nas tabelas: motivo de ausência (atestado, doença), qualquer dado de saúde, **afastamentos legais** (maternidade, paternidade, INSS), idade, gênero, estado civil, raça, religião, filiação sindical, **valores de salário**, e **pesquisa de clima anônima** (F16), que **nunca** pode ser ligada a pessoas.
6. **Meses com afastamento são ignorados** no cálculo, e a pessoa **não é penalizada** por eles.
7. **Fora do índice:** aprendizes (nível "Não aplicável"), desligados e quem tem menos de 90 dias de casa ou poucos meses de dados (nível "Dados insuficientes").
8. **Acesso registrado:** abrir o detalhe de uma pessoa grava no `ComplianceAuditLog` (quem, quando, qual colaborador), sem copiar os dados. A tela avisa "Este acesso é registrado".
9. **Sem exportação** da lista individual nesta versão.
10. **Revisão humana sempre:** o índice sugere uma conversa; quem decide é uma pessoa.

### Premissas a registrar no projeto (documentação do TCC)
Finalidade e base legal a serem definidas por quem responde pela LGPD na organização; **Relatório de Impacto à Proteção de Dados (RIPD)** recomendado para esse tratamento; **transparência** com os colaboradores (aviso de que existe acompanhamento de sinais de carga e ausência); **retenção** dos históricos (ex.: 12 meses, depois eliminar); canal para o colaborador questionar dados incorretos; verificação periódica de **vieses** (por exemplo, se algum grupo ou setor é sinalizado de forma desproporcional). Em um sistema real, o motor deve ser **validado com dados reais de saídas** antes de qualquer uso.

---

## Dados

Script `database/012_individual_attention.sql`:
- `EmployeeMonthlyAttendance`: por colaborador e mês, **dias úteis, dias de ausência e horas extras** (sem motivo).
- `EmployeeCareerEvents`: **tipo e data** de admissão, reajuste, promoção e mudança de cargo (sem valores de salário).
- `RetentionRiskSnapshots`: histórico do índice por colaborador e mês (pontuação, nível, qualidade dos dados, JSON com os componentes e versão).
- `RetentionFollowUps`: ações de acompanhamento registradas pelo RH (conversa, revisão de carga etc.).

Origem dos dados no mundo real: ponto eletrônico e folha, via importação (F09) ou integração com o ERP. No projeto, o `S08` cria 12 meses de dados de teste, coerentes com os departamentos.

## Cálculo do índice (`regras-v1`, valores iniciais, ajustáveis em `config/retentionScore.js`)

**Janela:** últimos 3 meses fechados (M-1 a M-3) e os 3 anteriores (M-4 a M-6). Meses sem registro (afastamento ou antes da admissão) **não contam**. As comparações usam a **mediana do próprio departamento** no mesmo período.

| Componente | Máx. | Como pontua |
|---|---|---|
| **Sobrecarga** | 40 | Média de horas extras dos 3 meses ÷ mediana do departamento. Razão 1 = 0 ponto; razão 2 ou mais = 40 pontos (linear) |
| **Ausências** | 40 | **25 pts** pelo nível (faltas dos 3 meses ÷ mediana do departamento; razão 1 = 0, razão 3 ou mais = 25) + **15 pts** pelo crescimento (faltas dos 3 meses em relação aos 3 anteriores, limitado a 100%) |
| **Estagnação** | 20 | Meses desde a última movimentação de carreira (reajuste, promoção ou mudança de cargo): até 12 meses = 0; 30 meses ou mais = 20 (linear) |

**Níveis:** menos de 35 = **Baixa**; de 35 a 64 = **Moderada**; 65 ou mais = **Alta**.
**Qualidade dos dados:** `completo` (3 meses válidos em ambas as janelas), `parcial` (menos meses, mas pelo menos 3 no total), `insuficiente` (menos de 3 meses válidos ou menos de 90 dias de casa).
**Contexto, sem pontuar:** saldo de férias, tempo de casa e turnover recente do departamento.

Cada componente devolve **pontos, máximo e uma frase** (ex.: "Horas extras: média de 26 h nos últimos 3 meses; mediana do departamento: 12 h"). **Não usar modelo de aprendizado de máquina** aqui: com poucos desligamentos e dados simulados ele não seria confiável; as regras explicáveis são a escolha honesta, e isso deve constar na tela e na apresentação.

## Endpoints (todos `rh`)

| Método e rota | Função |
|---|---|
| `GET /api/retention/employees?scope=company\|department&departmentId=&level=&q=&sort=&page=` | Lista paginada (25 por página) com os campos abaixo e o índice |
| `GET /api/retention/summary?scope=&departmentId=` | Contagem por nível (alta, moderada, baixa, dados insuficientes, não aplicável) |
| `GET /api/retention/employees/:id` | Detalhe: componentes do índice, séries de 12 meses, carreira, férias e acompanhamentos. **Registra o acesso na auditoria** |
| `POST /api/retention/recalculate` | Calcula e grava os `RetentionRiskSnapshots` do último mês fechado |
| `GET /api/retention/config` | Pesos, limites e versão do cálculo (tela de transparência) |
| `POST /api/retention/employees/:id/follow-ups` `{ actionType, note }` e a leitura no detalhe | Registra ação de acompanhamento (Fase C) |

Campos da lista: nome, matrícula, departamento, cargo, **tempo de casa**, **faltas no último mês fechado** e **nos últimos 3 meses**, **horas extras (média de 3 meses)**, **meses desde a última movimentação**, **saldo de férias (dias)**, **índice, nível e qualidade dos dados**, **até 3 sinais principais** e a **tendência** (compara com os 3 meses anteriores). **Nunca** salário, CPF, idade ou dados de saúde.

Regras de backend: camadas controller, `retentionService` (cálculo), repositories; queries parametrizadas; mensagens de erro genéricas; o cálculo usa **somente** as tabelas da Parte 10 mais `Employees` (cargo, departamento, admissão, tipo de contrato) e `Leaves` (apenas para **excluir meses**, sem usar o tipo de afastamento no resultado); busca por nome com limite de tamanho; limite de requisições na lista.

---

## Frontend (aba "Colaboradores" dentro de Inteligência, apenas `rh`)

Rota `/inteligencia/colaboradores`. Visível só para `rh`; as demais rotas e o menu seguem como estão.

### Lista
- **Aviso fixo** no topo: "Uso restrito ao RH. Apoio à retenção e ao cuidado com as equipes. Não usar como base para demissão, punição ou avaliação disciplinar." e "Os acessos a esta tela são registrados."
- **Escopo:** seletor **Toda a empresa** ou **Departamento** (lista dos departamentos); filtro por **nível**, busca por **nome ou matrícula** e opção **"Somente com sinais"**.
- **Cartões de resumo:** colaboradores analisados, atenção **Alta**, **Moderada**, **Dados insuficientes** (cada um filtra a lista ao clicar).
- **Tabela** (cartões no celular, conforme a PARTE5F): Nome, Matrícula, Departamento, Cargo, Tempo de casa, **Faltas (último mês | 3 meses)**, **Horas extras (média)**, **Última movimentação** ("há 26 meses"), **Saldo de férias**, **Índice** (barra + número + **nível com texto e ícone**) e **sinais** (até 3 etiquetas, ex.: "Horas extras acima do setor", "Faltas em alta", "Sem movimentação há 2 anos"). Ordenação por índice (padrão), faltas, horas extras, nome e tempo sem movimentação.
- Aprendizes e quem tem poucos dados aparecem com "Não aplicável" ou "Dados insuficientes" (sem barra).
- Estados de carregando, vazio e erro; paginação de 25; **sem botão de exportar**.

### Detalhe (painel lateral ao clicar na linha)
- Cabeçalho: nome, matrícula, departamento, cargo, tempo de casa; aviso "Este acesso é registrado".
- **Índice e nível** com a frase "Indicador de apoio, não é uma previsão de saída".
- **Composição do índice:** 3 barras (Sobrecarga, Ausências, Estagnação) com pontos, máximo e a **frase explicativa** de cada uma.
- **Gráficos de 12 meses:** faltas e horas extras da pessoa **comparadas com a mediana do departamento** (com resumo em texto para acessibilidade e VLibras).
- **Carreira:** linha do tempo (admissão, reajustes, promoções), **sem valores**.
- **Férias:** saldo e período.
- Caixa **"O que não é considerado"**: motivos de ausência, saúde, afastamentos legais, idade, gênero, salário e pesquisa de clima.
- **Plano de acompanhamento (Fase C):** sugestões de apoio (conversa individual, revisar carga e distribuição de tarefas, entender as causas com abordagem de apoio, avaliar plano de desenvolvimento), **registro** da ação feita (tipo + nota de até 500 caracteres, com aviso para **não incluir dados de saúde**) e histórico de acompanhamentos. **Sem botão de disparar alerta automático** a outro sistema.
- Link "Como o índice é calculado" (página com pesos, limites, versão e as limitações).

### Acessibilidade e responsividade
Selo de nível sempre com **texto e ícone**; tabela em cartões no celular; painel em tela cheia no celular; tokens de cor da Parte 5C; foco e `Esc` ao fechar o painel; textos simples (sem "Risco crítico").

### Segurança no frontend
Nada de dados da pessoa em `console.log`, `localStorage` ou URL (a busca por nome não vai para o endereço); notas de acompanhamento exibidas como texto puro; perfis tratados também no cliente, mas o backend é a autoridade.

---

## Dados de teste (`S08`) e gabarito

O `S08` cria 12 meses de frequência para os colaboradores do seed, seguindo os cenários dos departamentos, mais a carreira. Ele grava o **gabarito em `SeedExpectedAttention`**:
- **8 pessoas "em atenção"** (3 em Atendimento, 2 em Comercial, 2 em Logística, 1 em Tecnologia), com faltas e horas extras subindo nos últimos 4 meses e sem movimentação de carreira: esperado nível **Alta**;
- **aprendizes** ativos: esperado **Não aplicável**;
- **admitidos há menos de 90 dias** (por exemplo, parte de Projetos Especiais): esperado **Dados insuficientes**.

O `S08` também **recalcula o agregado dos departamentos** com a soma dos registros individuais e **apaga alertas e previsões** (gerar de novo na plataforma).

---

## Ordem de implementação

**Fase A: dados e lista**
1. Aplicar `012_individual_attention.sql` e `seed/S08_atencao_individual.sql`.
2. `retentionService` com o cálculo `regras-v1` (`config/retentionScore.js`), repositories e rotas `employees`, `summary` e `config`; auditoria de acesso.
3. Frontend: aba Colaboradores com avisos, escopo, filtros, cartões de resumo e tabela.

**Fase B: detalhe e transparência**
4. Rota `employees/:id` com componentes, séries, carreira e férias; `recalculate` e snapshots.
5. Painel de detalhe, gráficos comparativos, caixa "O que não é considerado" e página "Como o índice é calculado".

**Fase C: acompanhamento**
6. `RetentionFollowUps`: registrar e listar ações, com o aviso de dados de saúde.

## Critérios de aceite

**Fase A**
- `rh` vê a lista; `gestor` e `colaborador` recebem 403 (e a aba não aparece para eles).
- "Toda a empresa" mostra todos os colaboradores ativos; escolher um departamento mostra só os dele; os cartões de resumo batem com a lista.
- A lista mostra nome, setor, **faltas** e **horas extras**, tempo de casa, última movimentação, saldo de férias, índice, nível e sinais; **nenhum** salário, CPF, idade ou dado de saúde.
- As **8 pessoas do gabarito** aparecem com nível **Alta** (se algum divergir, o agente classifica a causa e pergunta antes de alterar pesos ou o gabarito); aprendizes aparecem como **Não aplicável** e admitidos há menos de 90 dias como **Dados insuficientes**.
- Meses de afastamento não entram no cálculo; desligados não aparecem.
- Não existe exportação da lista.

**Fase B**
- Abrir uma pessoa grava o acesso no `ComplianceAuditLog` (sem os dados) e mostra a composição do índice com as frases; o gráfico compara a pessoa com a mediana do departamento.
- A página "Como o índice é calculado" mostra pesos, limites, versão e limitações.
- Recalcular grava um snapshot por colaborador e mês, sem duplicar.

**Fase C**
- O RH registra e vê ações de acompanhamento; a nota tem limite de 500 caracteres e o aviso sobre dados de saúde; não há disparo automático para outros sistemas.

**Geral**
- Nenhuma tabela, resposta de API, tela ou log contém motivo de ausência, saúde, valores de salário, idade, gênero ou dados de clima.
- Todas as telas mostram o aviso de uso restrito; responsivas e acessíveis.

## Fora do escopo
Modelo de aprendizado de máquina individual, "probabilidade de saída", simulador "e se" por pessoa, visão individual para gestor, exportação da lista, integração automática com outros sistemas (por exemplo, disparo de alerta ao Fluig), uso de dados de desempenho ou de clima por pessoa.
