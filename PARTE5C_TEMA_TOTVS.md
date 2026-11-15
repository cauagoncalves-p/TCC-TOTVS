## PARTE 5C: Tema visual (cores) inspirado na TOTVS

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md. Somente frontend.
> Complementa a seção "Design system" do `PARTE5_FRONTEND.md`. Onde houver conflito, vale este.

### Objetivo
Aplicar à plataforma um padrão de cores coerente com a identidade da TOTVS (azul-marinho profundo, azul de destaque e neutros claros), de forma **centralizada em tokens**, para que trocar uma cor mude o sistema inteiro.

### Importante: valores a confirmar
Os valores abaixo são uma **proposta aproximada**, não códigos oficiais da marca. As cores exatas devem ser coletadas do site de referência (`totvs.com`, página do TOTVS Backoffice Linha Protheus) com o conta-gotas do navegador:

1. Abrir a página, clicar com o botão direito no elemento (cabeçalho, botão principal, rodapé) e escolher **Inspecionar**.
2. No painel de estilos, clicar na amostra de cor ao lado de `background-color` ou `color` e copiar o valor hexadecimal.
3. Coletar no mínimo: fundo do cabeçalho/rodapé, cor do botão principal, cor de links e de destaques, cor do texto, fundo de seções claras.
4. Atualizar **somente a tabela de tokens** deste documento e o arquivo de tokens do projeto.

É um projeto acadêmico: as cores servem como inspiração visual. Não usar o logotipo oficial como se o sistema fosse um produto da empresa.

### Regras

1. **Nenhuma cor escrita direto em componente.** Toda cor vem de um token (variável CSS ou tema do Tailwind). Meta verificável: nenhum código hexadecimal, `rgb(` ou `hsl(` fora do arquivo de tokens (e do arquivo de cores dos gráficos).
2. **Contraste mínimo WCAG AA:** 4,5:1 para texto normal e 3:1 para texto grande e componentes de interface. Conferir cada combinação de texto e fundo (ferramenta de contraste do navegador ou similar).
3. **Cor nunca é o único sinal.** Risco, prioridade e status continuam com texto e ícone junto da cor.
4. O botão flutuante do VLibras (Parte 6) fica sobre a interface: manter `z-index` e margens para não cobrir ações principais.

### Tokens (valores iniciais aproximados, a confirmar)

**Marca**

| Token | Uso | Valor inicial |
|---|---|---|
| `--brand-950` | Fundo do menu lateral e da barra superior | `#071427` |
| `--brand-900` | Títulos, textos de destaque em fundo claro | `#0B2447` |
| `--brand-700` | Hover de itens do menu, bordas ativas | `#19376D` |
| `--brand-500` | **Cor de ação:** botão primário, links, foco | `#1E6BFF` |
| `--brand-300` | Estados secundários, gráficos de apoio | `#8FB8FF` |
| `--brand-100` | Fundos de destaque suaves, linha selecionada | `#E6F0FF` |
| `--accent-cyan` | Detalhes e realces pontuais | `#12B5E5` |

**Neutros e superfícies**

| Token | Uso | Valor inicial |
|---|---|---|
| `--bg-app` | Fundo geral da aplicação | `#F5F7FB` |
| `--bg-surface` | Cards, tabelas, formulários | `#FFFFFF` |
| `--border` | Bordas e divisores | `#D9DFEA` |
| `--text-primary` | Texto principal | `#111827` |
| `--text-secondary` | Texto de apoio | `#4B5563` |
| `--text-on-brand` | Texto sobre fundos da marca | `#FFFFFF` |
| `--focus-ring` | Contorno de foco visível | `#1E6BFF` |

**Semânticos** (risco, prioridade e status: cada um com fundo suave e texto escuro)

| Token | Significado | Fundo | Texto/ícone |
|---|---|---|---|
| `--risk-high` | Risco alto, erro, atrasado | `#FDECEA` | `#A31515` |
| `--risk-moderate` | Risco moderado, atenção, próximo do vencimento | `#FFF4E0` | `#7A4A00` |
| `--risk-low` | Risco baixo, sucesso, em dia | `#E8F5E9` | `#1B5E20` |
| `--info` | Informação, pendente | `#E3F2FD` | `#0D47A1` |

Os valores semânticos acima já tentam respeitar o contraste AA, mas **devem ser conferidos** depois de definidos os tokens finais.

**Gráficos** (`chartColors`, em um único arquivo, lidos dos tokens): paleta de 6 cores distintas entre si, com tom de azul de marca como primeira série, e **nunca** depender só da cor: linhas com marcadores ou traços diferentes, barras com rótulos e legenda sempre visível. Sugestão: `--brand-500`, `--accent-cyan`, um âmbar, um verde, um roxo e um vermelho (reaproveitando os semânticos).

### Aplicação por área da interface

- **Menu lateral e barra superior:** fundo `--brand-950`, texto `--text-on-brand`, item ativo com fundo `--brand-700` e marcação de `--brand-500`.
- **Botão primário:** fundo `--brand-500`, texto branco; hover um tom mais escuro (derivado de `--brand-700`). Botão secundário: borda `--brand-500`, texto `--brand-900`.
- **Tela de login:** fundo `--brand-950` com cartão `--bg-surface` centralizado.
- **Cards, tabelas e formulários:** `--bg-surface` sobre `--bg-app`, bordas `--border`.
- **Selos** (`RiskBadge`, `PriorityBadge`, `StatusBadge`, `ConfidenceBadge`, `SourceBadge`): fundo e texto dos tokens semânticos, sempre com ícone e texto.
- **Foco por teclado:** anel de 2 px com `--focus-ring` em todo elemento interativo.

### Implementação

1. Localizar o arquivo de tokens do frontend (criado na F0) e substituir pelos tokens desta tabela. Se o projeto usa Tailwind, mapear os tokens no tema (`colors`) apontando para as variáveis CSS.
2. Rodar uma busca por cores escritas direto no código (`#`, `rgb(`, `hsl(`, classes de cor fixas do Tailwind como `bg-blue-600`) e trocar por tokens.
3. Criar `chartColors.ts` e usar nos gráficos do Recharts.
4. Atualizar os selos compartilhados para os tokens semânticos.
5. Conferir contraste de cada combinação usada.
6. Anotar no README onde mudar as cores.

### Critérios de aceite

- Trocar o valor de `--brand-500` no arquivo de tokens muda botões, links e foco em todas as telas.
- Busca por `#` e `rgb(` em `frontend/src`, fora dos arquivos de tokens e de cores de gráficos, não encontra nada.
- Todos os textos e componentes passam em contraste AA (4,5:1 para texto normal; 3:1 para grande e componentes).
- Selos e gráficos continuam compreensíveis em escala de cinza (texto, ícone e formas ajudam).
- Menu, login, tabelas, formulários, selos e gráficos compartilham a mesma paleta.
- O botão do VLibras continua visível e sem cobrir ações importantes.

### Evoluções (fora do escopo)
- Modo escuro com um segundo conjunto de tokens.
- Alto contraste como opção em "Acessibilidade".
