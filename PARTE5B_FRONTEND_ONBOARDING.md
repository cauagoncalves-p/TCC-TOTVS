## PARTE 5B: Frontend do Onboarding (IA + preenchimento manual)

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md. Somente frontend.
> **Substitui a F2** do `PARTE5_FRONTEND.md`. Reaproveitar a base já existente (layout, guardas de perfil, `FileDropzone`, `DataTable`, badges, `ConfirmDialog`, `Toast`, `DisclaimerBanner`).
> O formato real de cada resposta da API vale o que estiver em `docs/API_CONTRACT.md` (gerado do código). Se divergir deste documento, vale o contrato; registrar a divergência.

### Objetivo
Tela de cadastro de novos colaboradores com **duas formas de entrada** que desembocam **no mesmo formulário de revisão**:
1. **Enviar documento(s)**: a IA lê o PDF e preenche o cadastro;
2. **Preencher manualmente**: o analista digita direto.
Também é possível **combinar** (começar manual e anexar PDF depois, ou corrigir à mão um caso vindo de PDF).

### Princípios

1. **Um formulário só.** O mesmo componente `CaseForm` serve para caso manual (abre vazio) e caso por PDF (abre pré-preenchido).
2. **Rascunho sempre pode ser salvo**; só **Aprovar** exige cadastro completo e sem erro.
3. **O backend é a autoridade da validação.** O frontend mostra o que a API devolve (`POST /api/onboarding/validate` e respostas de `PUT`/`POST`). No cliente, só máscaras e marcação de "obrigatório".
4. **Transparência sobre a origem de cada valor** (IA, editado ou digitado).
5. **IA indisponível não trava o trabalho**: erro de IA oferece ir para o preenchimento manual.
6. Perfil `rh` apenas (guarda de rota + item de menu; o backend valida de novo).

### Rotas

| Rota | Tela |
|---|---|
| `/onboarding` | Lista de casos |
| `/onboarding/novo/documento` | Envio de documento (IA) |
| `/onboarding/novo/manual` | Formulário manual (caso ainda não salvo) |
| `/onboarding/:id` | Revisão e edição do caso (abas Cadastro, Perfil profissional, Documentos) |

### Endpoints usados

`GET /api/onboarding`, `GET /api/onboarding/:id`, `POST /api/onboarding/upload`, `POST /api/onboarding` (manual), `POST /api/onboarding/validate`, `PUT /api/onboarding/:id`, `POST /api/onboarding/:id/documents`, `DELETE /api/onboarding/:id/documents/:docId`, `GET /api/onboarding/document-types`, `POST /api/onboarding/:id/approve`, `POST /api/onboarding/:id/reject`.

### Organização do código

```
features/onboarding/
  api.ts            chamadas HTTP
  hooks.ts          TanStack Query (listar, detalhe, criar manual, upload, adicionar/remover documento,
                    salvar, aprovar, rejeitar) + useValidateCadastro (debounce)
  types.ts          tipos (gerados a partir do API_CONTRACT)
  utils/            máscaras, proveniência dos campos, mapeamento de ocorrências por campo
  components/       CaseForm, PersonalSection, AddressSection, ContractSection, ProfileEditor,
                    DocumentsPanel, IssuesPanel, FieldProvenanceChip, ConflictHint,
                    GenericFieldsMapper, ApproveDialog, RejectDialog, CredentialsDialog
pages/onboarding/   OnboardingListPage, NewDocumentPage, NewManualPage, CaseDetailPage
```

Formulários com **React Hook Form** (adicionar à stack). Sem biblioteca de validação no cliente além de formato e obrigatoriedade.

---

## Telas

### 1. Lista de casos (`/onboarding`)
- Cabeçalho com dois botões principais lado a lado: **"Enviar documento (IA)"** e **"Preencher manualmente"**.
- Tabela: nome (ou "Sem nome"), selo de **origem** (PDF ou Manual), selo de **status** (pendente de revisão, aprovado, rejeitado), quantidade de pendências e erros, data, ação "Abrir".
- Filtros: status e origem; busca por nome. CPF **mascarado** na lista.
- Estado vazio: mensagem e os dois botões. Estados de carregando e erro com "Tentar de novo".

### 2. Envio de documento (`/onboarding/novo/documento`)
- `FileDropzone` (PDF, até 5 MB; valida tipo e tamanho antes de enviar).
- Campo opcional **"Tipo do documento"**: "Detectar automaticamente" (padrão) ou um tipo vindo de `GET /api/onboarding/document-types` (informar o tipo economiza uma chamada de IA).
- Durante o envio: estado "Lendo o documento com IA..." (pode levar de alguns segundos a cerca de um minuto), com `aria-live="polite"` e botão **Cancelar**.
- Sucesso: vai para `/onboarding/:id`.
- Erros:

| Situação | Mensagem sugerida |
|---|---|
| Arquivo não é PDF ou passou do limite | "Envie um PDF de até 5 MB." |
| 422 (documento não interpretado ou páginas demais) | Exibir a mensagem da API e oferecer "Preencher manualmente" |
| 502 / IA indisponível | "A leitura por IA está indisponível agora. Você pode preencher manualmente." + botão para `/onboarding/novo/manual` |
| 403 | "Você não tem permissão para esta ação." |
| 401 | Interceptor volta ao login |

### 3. Preenchimento manual (`/onboarding/novo/manual`)
- `CaseForm` vazio; campos obrigatórios marcados.
- Validação em tempo real (ver abaixo), sem criar nada no banco.
- **Salvar rascunho**: `POST /api/onboarding` (aceita dados parciais) e vai para `/onboarding/:id`.
- Botão secundário "Voltar" com confirmação se houver alterações não salvas.

### 4. Revisão do caso (`/onboarding/:id`)

**Cabeçalho:** nome, selos de origem e status, quem criou e quando.
**Coluna principal (abas):** Cadastro, Perfil profissional, Documentos.
**Painel lateral fixo "Situação do cadastro" (`IssuesPanel`):**
- **Faltam preencher** (pendências obrigatórias, ex.: "CPF, data de admissão, cargo, departamento");
- **Erros** (valor inválido);
- **Avisos** (não confirmado no documento, conflito entre documentos).
Clicar em um item leva o foco ao campo correspondente.
**Ações:** **Salvar rascunho**, **Aprovar** (desabilitado enquanto houver erro ou pendência obrigatória, com explicação do motivo ao passar o mouse ou focar), **Rejeitar**.

**Aba Cadastro**, em três seções:
- Dados pessoais: nome completo, CPF, RG, nascimento, e-mail (será o login), telefone.
- Endereço: CEP, logradouro, cidade, UF.
- Contrato: cargo, departamento, data de admissão, salário base.

Cada campo mostra:
- **Estado:** erro (vermelho, ícone e texto), pendente (âmbar, "Obrigatório"), aviso (azul/âmbar com a mensagem), ok.
- **Origem do valor** (`FieldProvenanceChip`): "IA" (veio do documento e não foi mexido), "Editado" (a IA preencheu e o analista alterou) ou "Digitado" (só existe no que o analista escreveu). Calculado comparando a versão extraída com a revisada.
- **Conflito** (`ConflictHint`): quando documentos divergem, mostra "Ficha: X. Currículo: Y" com botão **"Usar este valor"** para cada fonte.

O aviso **"Dados extraídos por IA. Revise antes de aprovar."** aparece **só quando há campos vindos de documento**, não em casos 100% manuais.

Máscaras e formatos: CPF `000.000.000-00`, CEP `00000-000`, telefone `(00) 00000-0000`, salário em reais, datas com seletor de data (valor enviado em formato ISO). Enviar CPF e CEP **só com dígitos**.

**Aba Perfil profissional** (opcional): editor de listas com "Adicionar" e "Remover" por item:
- Formação (curso, instituição, nível, início, fim, em andamento);
- Experiência (cargo, empresa, início, fim, atual, atividades);
- Habilidades e certificações (campo de etiquetas);
- Idiomas (idioma e nível); Projetos (nome, tecnologias, descrição).
Datas com seletor de mês. Estado vazio: "O perfil profissional é opcional. Envie um currículo ou preencha manualmente."

**Aba Documentos:**
- Lista de documentos do caso: nome do arquivo, **tipo** (selo, com "IA" ou "Analista" como origem do tipo), forma de leitura (leitura direta do PDF ou por texto), páginas e data.
- **Adicionar documento** (`FileDropzone` + tipo opcional): ao concluir, o caso é recarregado com a fusão refeita; o que o analista digitou **não é sobrescrito**, divergências viram conflito.
- **Remover documento** com confirmação ("Só o documento é removido; o que você digitou continua"). Para corrigir um tipo detectado errado: remover e reenviar informando o tipo.
- Documento do tipo **"outro"**: `GenericFieldsMapper` lista os pares `campo: valor` extraídos; para cada um, seletor **"Usar no campo..."** (campos do cadastro) e botão "Aplicar" (grava via `PUT`) ou "Ignorar". Nada é aplicado sozinho.

### 5. Aprovar e rejeitar
- **Aprovar:** `ApproveDialog` resume nome, CPF mascarado, e-mail (login), cargo, departamento e admissão; confirmação explícita. Em caso de sucesso, `CredentialsDialog` mostra **matrícula**, **e-mail de acesso** e a **senha temporária, exibida uma única vez**, com botão copiar e aviso "Anote agora, ela não será mostrada de novo".
- **Rejeitar:** `RejectDialog` com motivo obrigatório (até 300 caracteres).
- **409** (caso já processado): "Este caso já foi processado por outra pessoa." e recarrega o caso.
- Caso `aprovado` ou `rejeitado`: formulário em **somente leitura**, faixa com status, quem e quando, matrícula ou motivo.

### Validação em tempo real

- Ao editar o Cadastro, chamar `POST /api/onboarding/validate` com **debounce de cerca de 600 ms**.
- Descartar respostas atrasadas (cancelar a requisição anterior com `AbortController` ou comparar um contador), para não exibir resultado de um estado antigo.
- A validação **não grava nada**. O indicador "Validando..." é discreto.
- Ocorrências são mapeadas por `field` para os campos e agrupadas no `IssuesPanel`. Ocorrência sem `field` (geral) aparece no painel.
- Ao salvar (`PUT` ou `POST`), as ocorrências devolvidas pelo backend substituem as da validação.

### Textos principais (PT-BR, linguagem simples)

| Situação | Texto |
|---|---|
| Aviso de IA | "Dados extraídos por IA. Revise antes de aprovar." |
| Pendências | "Faltam preencher: …" |
| Campo não confirmado | "Não encontramos este valor no documento. Confira." |
| Conflito | "Os documentos mostram valores diferentes. Escolha um." |
| Rascunho salvo | "Rascunho salvo." |
| Aprovação bloqueada | "Para aprovar, corrija os erros e preencha os campos obrigatórios." |

### Acessibilidade (ver também `PARTE6_VLIBRAS.md`)

- Todo campo com `label` visível; erro ligado ao campo por `aria-describedby`; resumo de erros no topo ao tentar aprovar, com foco nele.
- Selos e estados sempre com **texto e ícone**, nunca só cor.
- Dropzone utilizável por teclado (botão "Escolher arquivo").
- Mensagens de progresso e de resultado em região `aria-live`.
- Linguagem simples e sem siglas soltas (explicar "DP" e "CPF" quando necessário).

### Segurança e LGPD no frontend

1. CPF mascarado em lista, painel e logs; completo só dentro do formulário.
2. Nunca `console.log` de dados do cadastro, do documento ou de credenciais.
3. A senha temporária fica **só em memória**, no `CredentialsDialog`; não vai para `localStorage`, URL nem cache do TanStack Query depois de fechar o diálogo.
4. Nunca renderizar HTML vindo da IA ou dos documentos (apenas texto).
5. Ao sair da tela com alterações não salvas, pedir confirmação.

---

## Ordem de implementação

**F2a: Manual e revisão**
1. Tipos e `api.ts` a partir do `API_CONTRACT.md`; máscaras e utilitários.
2. Lista de casos (filtros, selos, estados).
3. `CaseForm` com Cadastro, `IssuesPanel` e validação em tempo real.
4. Tela manual: salvar rascunho, abrir `/onboarding/:id`, editar com `PUT`.
5. Aprovar (com `CredentialsDialog`) e rejeitar; modo somente leitura.

**F2b: IA, documentos e perfil**
6. Envio de documento com tipo opcional, estados de progresso e erros (incluindo o atalho para o manual).
7. Proveniência dos campos, conflitos e aviso de IA.
8. Aba Documentos (adicionar, remover) e `GenericFieldsMapper` para o tipo "outro".
9. Aba Perfil profissional (editor de listas).

## Critérios de aceite

**F2a**
- Criar caso manual completo e válido, aprovar e ver a matrícula e a senha temporária (uma vez); sem nenhum PDF.
- Caso manual incompleto salva como rascunho; "Aprovar" fica desabilitado com os campos pendentes listados; ao completar, habilita.
- CPF inválido ou e-mail repetido digitados aparecem no campo e no painel, vindos do backend.
- Digitar rápido não gera resultados desatualizados na tela; a validação não cria registros.
- Caso aprovado ou rejeitado abre somente leitura; aprovar de novo (409) mostra a mensagem correta.
- Lista com filtros de status e origem e CPF mascarado.

**F2b**
- Enviar a ficha completa preenche o formulário, com campos marcados "IA" e o aviso de IA; a incompleta mostra pendências e CPF inválido.
- Enviar o currículo preenche nome, e-mail e telefone, lista CPF, admissão, cargo e departamento como pendentes e popula o Perfil profissional.
- Editar um campo vindo da IA muda o selo para "Editado".
- Anexar documento a um caso manual não sobrescreve o digitado; divergência mostra o conflito com "Usar este valor".
- Documento "outro" mostra os pares e permite mapear para os campos do cadastro.
- Falha da IA (502) oferece ir para o preenchimento manual sem perder o trabalho.
- Tudo funciona por teclado, sem informação só por cor; senha temporária não persiste após fechar o diálogo.
