## PARTE 5F: Responsividade e layout (correção e padronização)

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md. **Somente layout e estilo**: não alterar regras de negócio, endpoints, textos funcionais nem permissões.
> Complementa a seção "Design system" da PARTE5, os tokens de cor da PARTE5C e a convivência com o VLibras da PARTE6. Em conflito sobre **tamanhos e disposição**, vale este documento.
> Reaproveitar os componentes existentes (menu lateral, topbar, cartões, tabelas, diálogos); a ideia é **corrigir a base do layout**, não refazer as telas.

### Problemas observados (prints dos perfis Colaborador e RH)

| # | Problema | Onde aparece |
|---|---|---|
| 1 | **A largura do menu lateral muda conforme o perfil**: cerca de 178 px no colaborador e 258 px no RH, porque ela segue o tamanho dos textos | Menu do colaborador menor que o do RH |
| 2 | **Vão entre o menu e o conteúdo**: o conteúdo e a topbar começam em um deslocamento fixo (cerca de 288 px), que só combina com um menu dessa largura | Vão de ~110 px no colaborador e ~30 px no RH |
| 3 | **A topbar e o conteúdo ultrapassam a largura da janela**: o e-mail e o perfil do usuário aparecem cortados, e os cartões encostam na borda direita, sem margem | Meu Perfil (colaborador) e início do RH |
| 4 | **O selo "RAG" (e "IA") fica colado no texto** do item de menu, sem espaço | "Assistente Trabalhista RAG" |
| 5 | **O botão do VLibras cobre parte de um cartão** | Início do RH, cartão "Compliance Inteligente" |

Pelos sintomas, a causa provável é: menu com largura **automática** + conteúdo com **margem esquerda fixa** + elementos com `width: 100%` somada a essa margem (daí o estouro à direita). O agente deve **confirmar no código** (tarefa 0) antes de alterar.

### Princípios

1. **Uma única fonte de verdade para as larguras**, em variáveis CSS; nenhuma largura de menu ou deslocamento "solto" no código.
2. **O menu tem a mesma largura para todos os perfis** (nunca `auto`, nunca dependente do texto).
3. **O conteúdo ocupa o espaço que sobra** (CSS Grid com `minmax(0, 1fr)`), em vez de depender de margem esquerda fixa.
4. **Nenhuma rolagem horizontal da página** em qualquer largura a partir de 320 px (tabelas largas rolam **dentro** do próprio contêiner).
5. **Mobile primeiro**: o layout base é o de celular; telas maiores acrescentam.
6. Medidas em `rem` (respeitam o aumento de fonte do navegador); espaçamentos em múltiplos de 4 px.

### Variáveis de layout (em um único arquivo de tokens)

| Variável | Valor | Uso |
|---|---|---|
| `--sidebar-width` | `18rem` (288 px) | Menu lateral expandido, igual para **todos** os perfis |
| `--sidebar-rail` | `4.5rem` (72 px) | Menu recolhido (só ícones) em tablet |
| `--topbar-height` | `4rem` | Altura da barra superior |
| `--content-max` | `80rem` (1280 px) | Largura máxima do conteúdo, centralizado |
| `--page-gutter` | `1rem` / `1.5rem` / `2rem` | Margem lateral do conteúdo (celular / tablet / desktop) |
| `--vlibras-gutter` | `3.5rem` | Folga à direita quando o VLibras está ativo (ver abaixo) |

Os 288 px escolhidos coincidem com o deslocamento que o conteúdo já usa, então o vão desaparece, e há espaço de sobra para "Assistente Trabalhista" mais o selo.

### Estrutura do layout (`AppShell`)

```
.app-shell      display: grid; min-height: 100dvh;
                grid-template-columns: var(--sidebar-width) minmax(0, 1fr);   (desktop)
  aside.sidebar     largura = var(--sidebar-width); sticky/fixa na altura da janela; rolagem interna
  div.main-column   min-width: 0; display: flex; flex-direction: column;
    header.topbar       altura fixa; sticky no topo da coluna (não usa left/width calculados)
    main.page-area      flex: 1; overflow-x: hidden na coluna, rolagem vertical normal
      .page             max-width: var(--content-max); margin-inline: auto;
                        padding-inline: var(--page-gutter)
```
Regras: **proibido** `margin-left` fixo no conteúdo, `left: 288px` na topbar, `width: calc(100% - 288px)` e qualquer `width: 100%` somado a margem. `min-width: 0` em todo filho de grid ou flex que contenha texto longo.

### Pontos de quebra

| Largura | Menu lateral | Topbar | Conteúdo |
|---|---|---|---|
| **< 640 px** (celular) | **Gaveta** (drawer) aberta por botão de menu na topbar; sobreposição escura; fecha ao navegar, ao tocar fora e com `Esc`; foco preso dentro enquanto aberta | Botão de menu, título curto (com reticências), avatar; e-mail e "Sair" ficam **dentro** do menu do usuário | `--page-gutter` de 1rem; 1 coluna; tabelas viram **cartões** |
| **640 a 1023 px** (tablet) | **Recolhido** (`--sidebar-rail`), só ícones com dica (`tooltip`); botão para expandir como sobreposição | Completa, com e-mail do usuário truncado | `--page-gutter` de 1.5rem; grades em 2 colunas |
| **≥ 1024 px** (desktop) | **Fixo e expandido** (`--sidebar-width`) | Completa | `--page-gutter` de 2rem; grades em até 3 colunas |
| **≥ 1536 px** | Igual ao desktop | Igual | Conteúdo **centralizado** com `--content-max` |

### Menu lateral: item e selos

Estrutura de cada item (o selo nunca encosta no texto):

```
<a  class="flex items-center gap-3 px-3 py-2.5 rounded-lg min-w-0">
  <Ícone   class="shrink-0" />
  <span    class="min-w-0 flex-1 truncate">Assistente Trabalhista</span>
  <Selo    class="shrink-0 ml-2">RAG</Selo>
</a>
```
- Espaço mínimo de **8 px entre o texto e o selo** (`gap` ou `ml-2`), selo com `padding: 2px 8px`, `font-size: .6875rem`, caixa alta, **sem quebra de linha** e sem encolher (`shrink-0`).
- O texto usa reticências quando faltar espaço, com o **nome completo** em `title`/dica e lido por leitores de tela.
- O selo tem texto acessível ("RAG: consulta com documentos"; "IA: usa inteligência artificial").
- Menu recolhido (tablet): o selo vira um **ponto** no canto do ícone, com dica; o texto vai para a dica.
- O bloco "Perfil de acesso", os itens e o rodapé usam a mesma largura interna; o rodapé permanece fixo no fim.

### Topbar

- Altura fixa; conteúdo em `flex` com `gap`; o título tem `min-w-0` e `truncate`.
- **Nunca ultrapassa a janela.** O usuário aparece como avatar + e-mail truncado (`max-width` com reticências) e a dica com o e-mail completo; em celular só o avatar, e o menu dele abre com e-mail, perfil e **Sair**.
- Ícones de acessibilidade e notificações mantêm área de toque de **44 px** em celular.

### Conteúdo por tela

| Elemento | Comportamento |
|---|---|
| **Grade de cartões** (início do RH, módulos) | `display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr))`: 3 colunas no desktop, 2 no tablet, 1 no celular; **nenhum cartão encosta nas bordas** |
| **Cabeçalho de página** (título e botão de ação) | `flex-wrap`; no celular o botão vai para baixo do título, em largura total |
| **Chat do colaborador** | Altura `calc(100dvh - var(--topbar-height) - margens)`; lista de mensagens com rolagem própria; campo de envio fixo no fim, respeitando `env(safe-area-inset-bottom)`; sugestões em coluna única no celular |
| **Meu Perfil** | Cartões de dados em 2 colunas no desktop e 1 no celular; o cartão de e-mail ocupa a largura toda |
| **Tabelas** (fila de chamados, inconsistências, documentos, usuários) | Contêiner com `overflow-x: auto` e primeira coluna fixa quando útil; **abaixo de 768 px, listas principais viram cartões** com os mesmos dados e ações |
| **Formulários** | 1 coluna abaixo de 768 px, 2 colunas acima; rótulos sempre visíveis; botões principais em largura total no celular |
| **Gráficos (Recharts)** | `ResponsiveContainer` com altura mínima; menos rótulos no eixo em telas pequenas; resumo em texto sempre presente (acessibilidade e VLibras) |
| **Diálogos e painéis laterais** | Celular: tela cheia (ou 90 % da altura em `dvh`) com rolagem interna; desktop: painel com largura de 26 a 30 rem; rodapé de ações fixo |
| **Imagens e ícones** | `max-width: 100%`; nada com largura fixa maior que o contêiner |

### VLibras e elementos flutuantes

- O botão do VLibras fica fixo na lateral direita e **não pode cobrir conteúdo interativo**. Quando o VLibras estiver ativo, o contêiner da página recebe uma classe no `html` (por exemplo `vlibras-on`) que soma `--vlibras-gutter` ao padding direito em larguras abaixo de 1536 px. Acima disso o conteúdo centralizado já deixa folga.
- Campos de envio (chat, resposta de chamado) e botões de ação **ficam fora** dessa faixa da direita.
- Menus e painéis (gaveta, diálogos, notificações) devem aparecer **acima** do botão do VLibras (ordem de camadas definida em variáveis `--z-*`) ou deixar espaço para ele; nunca ficar escondidos por ele.

### Acessibilidade e conforto
- Alvos de toque de pelo menos 44 px em telas touch; foco visível em todos os elementos; `Esc` fecha gaveta, diálogos e painéis, devolvendo o foco ao botão de origem.
- A interface continua utilizável com **zoom de 200 %** e com a fonte do navegador aumentada (sem texto cortado nem sobreposto).
- Respeitar `prefers-reduced-motion` nas transições da gaveta e do menu.
- Orientação horizontal em celular sem quebrar o layout.

---

## Verificação automática (script de checagem)

Criar `frontend/scripts/responsive-check.mjs` (Playwright como dependência de desenvolvimento) que:

1. Entra com os usuários do seed (`colab.0001`, `rh.seed`, `gestor.seed`; credenciais por variáveis de ambiente, **nunca no código**).
2. Para cada perfil, visita as rotas principais (início, chat ou perfil do colaborador; onboarding, inteligência, compliance, base de conhecimento, chamados e usuários do RH, conforme existirem).
3. Para cada largura de **320, 360, 390, 768, 1024, 1280, 1440, 1920 e 2560 px**, confere:
   - **sem rolagem horizontal** (`documentElement.scrollWidth <= innerWidth`);
   - **largura do menu igual entre os perfis** (a partir de 1024 px) e igual a `--sidebar-width`;
   - **sem vão**: a borda direita do menu coincide com a borda esquerda da coluna principal;
   - **topbar inteira dentro da janela** (borda direita do último elemento ≤ largura da janela);
   - **selo sem sobreposição** com o texto do item (as caixas de selo e texto não se cruzam) e com folga mínima de 8 px;
   - nenhum elemento interativo (link, botão, campo) coberto pelo botão do VLibras;
   - ausência de erros no console relacionados a layout.
4. Salva **capturas de tela** por perfil, rota e largura em `docs/responsive/` e gera `docs/responsive-report.md` com aprovado ou reprovado e a lista de falhas (rota, largura, regra violada).
5. Não envia dados reais, não grava dados e não registra senhas ou tokens.

---

## Ordem de implementação

0. **Diagnóstico** (somente leitura): localizar no código a largura do menu (`auto`/conteúdo), o deslocamento fixo do conteúdo (`ml-72`, `left`, `calc`), os `width: 100%` que estouram, o estilo do selo e do VLibras; relatar causa e arquivo em poucas linhas, **antes de alterar**.
1. Variáveis de layout, `AppShell` em grade, menu com largura única e topbar sem deslocamentos fixos.
2. Item de menu com selos corrigidos (menu expandido e recolhido) e dicas.
3. Pontos de quebra: gaveta no celular e menu recolhido no tablet; topbar compacta.
4. Contêiner de página (`.page`), grades de cartões, cabeçalhos, chat, perfil, formulários e diálogos responsivos.
5. Tabelas com rolagem interna e versão em cartões abaixo de 768 px nas listas principais.
6. Folga do VLibras e ordem de camadas.
7. Script de verificação e relatório; capturas **antes e depois** do menu e de duas telas por perfil.

## Critérios de aceite (as reclamações originais)

- **Não há vão** entre o menu e a topbar/conteúdo em **nenhum perfil** e em nenhuma largura.
- O menu do colaborador, do gestor e do RH tem **a mesma largura** (288 px no desktop).
- O selo **RAG** (e **IA**) tem espaço mínimo de 8 px do texto e **não sobrepõe** o rótulo; texto longo usa reticências com dica.
- A topbar e o conteúdo **nunca ultrapassam a janela**; o e-mail do usuário não aparece cortado sem reticências; os cartões têm margem à direita.
- Sem rolagem horizontal da página de 320 a 2560 px.
- Menu em gaveta no celular, recolhido no tablet e fixo no desktop, com foco e `Esc` funcionando.
- O botão do VLibras não cobre cartões, campos de envio nem botões.
- Listas principais viram cartões no celular; formulários em 1 coluna no celular.
- Chat com altura correta (sem corte pela barra do navegador no celular) e campo de envio sempre visível.
- Zoom de 200 % sem texto cortado.
- O `responsive-check` passa para os três perfis e o relatório mostra **capturas antes e depois**.
- Nenhuma alteração em regras de negócio, endpoints ou permissões.

## Fora do escopo
Redesenho visual das telas, modo escuro, aplicativo móvel nativo, suporte a navegadores antigos sem CSS Grid.
