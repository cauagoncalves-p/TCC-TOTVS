## PARTE 2C: Onboarding com preenchimento manual

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md.
> Complementa `PARTE2_ONBOARDING.md` e `PARTE2B_ONBOARDING_UNIVERSAL.md`. Onde houver conflito, vale este.

### Objetivo
O PDF com IA continua sendo o caminho **rápido** para automatizar o cadastro, mas **deixa de ser obrigatório**. O analista de DP pode:

1. **Enviar documento(s)**: a IA extrai e preenche (Partes 2 e 2B);
2. **Preencher manualmente**: digita os dados direto no formulário;
3. **Combinar**: começar manualmente e depois anexar um PDF para completar (ou corrigir à mão um caso criado por PDF).

Os três caminhos usam **o mesmo caso, as mesmas validações e a mesma aprovação**. Só muda a origem dos dados.

### Princípios

1. **Uma única regra de validação.** Manual ou por PDF, o cadastro passa pelos mesmos validadores (CPF, e-mail, datas, UF, CEP, duplicidade). Não existe "atalho" sem validação.
2. **Rascunho permitido.** Um caso manual pode ser salvo **incompleto**; campos obrigatórios ausentes aparecem como `pendente` e só bloqueiam a **aprovação**, nunca o salvamento.
3. **Aprovação continua humana e obrigatória** para criar `User` e `Employee`, qualquer que seja a origem.
4. **Rastreabilidade:** cada caso registra a origem (`pdf` ou `manual`) e, quando houver, quais documentos contribuíram. O que a IA leu (`ExtractedJson`) fica separado do que o analista digitou ou corrigiu (`ReviewedJson`).

### Modelo de dados

Script: `database/006_onboarding_manual.sql`.
- `OnboardingCases.SourceFileName` passa a aceitar `NULL`.
- Nova coluna `OnboardingCases.Origin` (`pdf` ou `manual`), padrão `pdf`.
- Caso manual: `ExtractedJson` = `{ "cadastro": {}, "perfil": {} }` (a IA não leu nada); os dados digitados vão em `ReviewedJson`, no formato `{ "cadastro": {...}, "perfil": {...} }`.
- `perfil` (formação, experiência, habilidades, idiomas) é **opcional** no manual.

### Endpoints (todos `rh`)

| Método e rota | Função |
|---|---|
| `POST /api/onboarding` | **Novo.** Cria um caso manual com `{ cadastro, perfil? }`. Aceita dados parciais. Retorna o caso com as ocorrências (`erro`, `pendente`, `aviso`) |
| `POST /api/onboarding/validate` | **Novo.** Valida `{ cadastro }` **sem gravar nada**, para feedback em tempo real no formulário. Mesmo motor de validação do restante |
| `POST /api/onboarding/:id/documents` | Já existe (2B): permite anexar um PDF a um caso manual. A fusão considera o que o analista digitou como **prioridade máxima** (valor digitado não é sobrescrito pela IA; divergência vira `FIELD_CONFLICT`) |
| `PUT /api/onboarding/:id` | Vale para qualquer origem: edita `ReviewedJson` e revalida |
| `approve` / `reject` | Sem mudança |

`POST /api/onboarding/upload` continua criando casos com `Origin = 'pdf'`.

### Regras de fusão com dados digitados

Ordem de prioridade para cada campo do cadastro: **valor digitado/corrigido pelo analista** > `ficha_admissao` > `documento_identidade` > `comprovante_residencia` > `curriculo` > `outro`.
Quando um documento novo traz valor diferente do digitado, o valor do analista permanece e a divergência é sinalizada para conferência.

### Frontend (ajuste na F2 da Parte 5)

- Tela de Onboarding com **duas entradas lado a lado**: "Enviar documento (IA)" e "Preencher manualmente".
- O formulário de cadastro é **o mesmo** da tela de revisão: no manual ele abre vazio; no PDF abre pré-preenchido.
- Validação em tempo real (`POST /api/onboarding/validate`) com debounce, destacando campo inválido ou pendente.
- Botões **Salvar rascunho** (sempre permitido) e **Aprovar** (só sem erro nem pendência obrigatória).
- Dentro de um caso, botão **Adicionar documento** para completar com IA.
- Selo de origem na lista de casos ("PDF" ou "Manual").
- O aviso "Dados extraídos por IA. Revise antes de aprovar." aparece **apenas** em campos vindos de documento.

### Segurança e LGPD

1. Só `rh`; mesmas validações e transação de aprovação.
2. Entrada manual é validada no backend (o frontend não é autoridade); textos com limite de tamanho; queries parametrizadas.
3. CPF mascarado em listas e logs; completo só no formulário.
4. Dados fictícios na demonstração.

### Ordem de implementação (tarefas para o agente)

1. Rodar `006_onboarding_manual.sql`.
2. Extrair o motor de validação para um serviço único reutilizado por upload, manual e `validate` (se já estiver assim, apenas confirmar).
3. `POST /api/onboarding` (caso manual com dados parciais) e `POST /api/onboarding/validate`.
4. Ajustar a fusão para dar prioridade ao valor digitado e gerar `FIELD_CONFLICT` quando um documento divergir.
5. Ajustar listagem e detalhe para expor `Origin` e aceitar `SourceFileName` nulo.
6. Testes manuais (critérios abaixo). Frontend na F2.

### Critérios de aceite

- Criar caso manual **completo e válido**, aprovar e ver `User` e `Employee` criados (matrícula nova), sem nenhum PDF.
- Criar caso manual **incompleto** salva como rascunho; `approve` é bloqueado e lista os campos pendentes; depois de completar via `PUT`, aprova.
- CPF inválido ou e-mail já existente digitados à mão geram a **mesma ocorrência** que viriam de um PDF.
- `POST /api/onboarding/validate` retorna as ocorrências e **não cria registro** nenhum.
- Anexar um PDF a um caso manual preenche só o que estava vazio; valor divergente do digitado vira `FIELD_CONFLICT` e o digitado é mantido.
- Caso criado por PDF pode ser corrigido à mão (`PUT`) e aprovado normalmente.
- `colaborador` recebe 403; aprovar o mesmo caso duas vezes retorna 409.
- Casos antigos continuam abrindo (`Origin = 'pdf'`).
