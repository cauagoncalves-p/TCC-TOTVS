# Prompt --- Implementação completa de responsividade em um projeto

Copie o prompt abaixo e forneça-o à IA ou ao agente de programação que
terá acesso ao código do projeto.

------------------------------------------------------------------------

## PROMPT

Atue como um **engenheiro de software front-end sênior, especialista em
UI/UX, acessibilidade e design responsivo**. Sua tarefa é analisar e
implementar a responsividade completa do projeto atual, garantindo que
todas as páginas, componentes e funcionalidades funcionem corretamente
em diferentes tamanhos de tela e dispositivos.

### 1. Objetivo principal

Torne o projeto totalmente responsivo, funcional e consistente em:

-   Celulares pequenos e grandes;
-   Smartphones Android e iPhone;
-   Tablets em orientação retrato e paisagem;
-   Notebooks;
-   Desktops;
-   Monitores ultrawide e telas de alta resolução.

Não faça apenas ajustes visuais superficiais. A experiência deve ser
realmente utilizável em cada tamanho de tela, sem elementos cortados,
sobrepostos, inacessíveis ou com comportamento quebrado.

### 2. Antes de alterar o código: faça uma análise

Primeiro, examine a estrutura e as tecnologias utilizadas no projeto.

1.  Identifique o framework, bibliotecas, sistema de estilos e estrutura
    de componentes.
2.  Mapeie todas as páginas, rotas, layouts e componentes reutilizados.
3.  Identifique problemas de largura, altura, espaçamento, tipografia,
    imagens, tabelas, formulários, menus, modais e navegação.
4.  Procure larguras e alturas fixas que possam causar problemas em
    telas menores.
5.  Verifique elementos com `overflow`, posicionamento absoluto, grids e
    flexboxes que não se adaptam.
6.  Identifique funcionalidades que dependem de hover ou de interações
    pouco adequadas ao toque.
7.  Verifique se existem estilos duplicados, conflitos ou regras
    responsivas inconsistentes.

Apresente um breve diagnóstico e um plano de implementação. Em seguida,
execute as alterações --- não se limite a listar recomendações.

### 3. Estratégia responsiva

Implemente uma abordagem **mobile-first**, sempre que compatível com a
arquitetura existente.

Use breakpoints coerentes com o conteúdo e o layout. Como referência
inicial:

  Categoria              Largura aproximada
  -------------------- --------------------
  Celular pequeno               320--374 px
  Celular                       375--479 px
  Celular grande                480--767 px
  Tablet                       768--1023 px
  Notebook / desktop          1024--1439 px
  Desktop amplo             1440 px ou mais

Essas faixas são referências, não regras rígidas. Ajuste os breakpoints
conforme a necessidade real dos componentes. Não crie breakpoints
desnecessários nem dependa de um único tamanho de aparelho.

### 4. Requisitos obrigatórios de layout

-   Elimine rolagem horizontal indesejada em todas as páginas.
-   Evite larguras fixas que ultrapassem a viewport.
-   Use unidades flexíveis quando apropriado, como `%`, `rem`, `vw`,
    `min()`, `max()` e `clamp()`.
-   Configure containers com largura fluida e limites máximos coerentes.
-   Faça grids e colunas reorganizarem-se de acordo com o espaço
    disponível.
-   Garanta que textos longos quebrem corretamente, sem invadir outros
    elementos.
-   Redimensione imagens e mídias preservando suas proporções.
-   Evite alturas fixas em conteúdos que podem crescer.
-   Respeite as áreas seguras de dispositivos móveis quando necessário,
    usando `env(safe-area-inset-*)`.
-   Preserve a identidade visual, o estilo e a hierarquia do projeto.

### 5. Componentes que precisam ser verificados

Revise todos os componentes existentes, incluindo:

**Navegação** - Navbar, menu lateral, sidebar, breadcrumbs e rodapé. -
Em telas pequenas, transforme menus extensos em navegação adequada para
toque. - Garanta abertura, fechamento e navegação corretos do menu
mobile. - Não deixe menus atrás de outros elementos ou fora da viewport.

**Conteúdo** - Cards, painéis, dashboards, listas, tabelas e seções. -
Ajuste colunas e espaçamentos sem prejudicar a leitura. - Em tabelas
extensas, escolha uma solução adequada: rolagem horizontal localizada,
colunas prioritárias ou apresentação alternativa em cards. Não esconda
informações importantes sem justificativa.

**Formulários** - Inputs, selects, checkboxes, radios, botões e áreas de
texto. - Faça os campos ocuparem a largura disponível quando
necessário. - Evite zoom inesperado em campos de texto no iPhone;
considere tamanho de fonte adequado. - Garanta labels visíveis,
mensagens de erro legíveis e botões fáceis de tocar.

**Interações** - Modais, dropdowns, tooltips, accordions, abas,
carrosséis e notificações. - Garanta que caibam na tela e possam ser
utilizados por toque, teclado e mouse. - Não dependa exclusivamente de
hover. - Permita fechar modais e menus de forma previsível, inclusive em
telas pequenas.

**Mídia** - Imagens, vídeos, ícones, gráficos e ilustrações. - Preserve
proporções e evite cortes indevidos. - Garanta que gráficos e
visualizações permaneçam legíveis em telas menores.

### 6. Usabilidade e acessibilidade

-   Mantenha contraste adequado e hierarquia visual clara.
-   Use áreas de toque confortáveis --- como referência, aproximadamente
    44 × 44 px para controles importantes.
-   Não dependa apenas de cores para transmitir informações.
-   Preserve foco visível para navegação por teclado.
-   Use elementos semânticos e atributos acessíveis, como `aria-label`,
    quando necessário.
-   Garanta que a ordem de leitura e navegação faça sentido.
-   Respeite preferências de movimento reduzido
    (`prefers-reduced-motion`).
-   Não remova funcionalidades para simplificar a versão mobile.

### 7. Funcionalidade em todos os dispositivos

A responsividade não pode quebrar o funcionamento do sistema.

Verifique e corrija, quando necessário:

-   Links, botões e ações;
-   Navegação entre páginas e rotas;
-   Menus e submenus;
-   Formulários e validações;
-   Filtros, pesquisas e ordenações;
-   Paginação;
-   Modais e confirmações;
-   Uploads e downloads;
-   Gráficos e tabelas;
-   Estados de carregamento, vazio e erro;
-   Componentes que recebem dados de APIs.

Não substitua funcionalidades reais por elementos apenas visuais. Não
remova recursos, dados ou regras de negócio para fazer o layout caber na
tela. Preserve integrações, contratos de API e comportamentos
existentes.

### 8. Compatibilidade e qualidade técnica

-   Respeite os padrões e convenções já utilizados no projeto.
-   Reaproveite componentes e estilos sempre que possível.
-   Evite adicionar bibliotecas sem necessidade.
-   Não faça uma reescrita completa quando ajustes localizados forem
    suficientes.
-   Evite `!important` como solução padrão.
-   Não duplique regras CSS para corrigir sintomas sem entender a causa.
-   Mantenha o código organizado, reutilizável e fácil de manter.
-   Verifique compatibilidade com navegadores modernos de desktop e
    dispositivos móveis.

### 9. Testes obrigatórios

Depois da implementação, teste todas as páginas e componentes nos
seguintes tamanhos de viewport, no mínimo:

-   320 × 568;
-   360 × 800;
-   375 × 812;
-   390 × 844;
-   414 × 896;
-   768 × 1024;
-   1024 × 768;
-   1280 × 720;
-   1366 × 768;
-   1440 × 900;
-   1920 × 1080.

Teste também orientações retrato e paisagem em dispositivos móveis e
tablets.

Em cada tamanho, verifique:

1.  Se existe rolagem horizontal inesperada;
2.  Se textos, imagens e componentes estão dentro da viewport;
3.  Se menus, botões e formulários funcionam;
4.  Se não há sobreposição ou conteúdo escondido;
5.  Se o espaçamento e a tipografia continuam legíveis;
6.  Se todas as funcionalidades continuam operacionais.

Use as ferramentas de teste disponíveis no ambiente, como navegador,
emulação de dispositivos, testes automatizados e inspeção do console. Se
algum teste não puder ser executado, informe claramente essa limitação
--- não declare que foi aprovado sem verificar.

### 10. Critérios de conclusão

Considere o trabalho concluído somente quando:

-   Todas as páginas e rotas tiverem sido revisadas;
-   Os principais componentes funcionarem em telas pequenas, médias e
    grandes;
-   Não houver overflow horizontal indesejado;
-   Não existirem elementos cortados ou sobrepostos;
-   Menus, formulários, botões e interações funcionarem por toque e
    mouse;
-   A identidade visual original tiver sido preservada;
-   Nenhuma funcionalidade existente tiver sido removida ou prejudicada;
-   Os testes realizados e eventuais limitações estiverem documentados.

### 11. Entrega final

Ao terminar:

1.  Implemente as alterações diretamente nos arquivos do projeto.
2.  Informe quais páginas e componentes foram modificados.
3.  Explique resumidamente as principais decisões responsivas.
4.  Liste os tamanhos de tela e dispositivos efetivamente testados.
5.  Informe os problemas encontrados que foram corrigidos.
6.  Liste pendências ou limitações que ainda existirem.
7.  Apresente os resultados dos testes, sem inventar aprovações.

**Orientação final:** trabalhe com atenção em todo o projeto, não apenas
na página inicial. Analise cada rota e cada componente reutilizado.
Priorize uma experiência consistente, acessível e funcional em qualquer
tamanho de tela, preservando o funcionamento e a identidade visual do
sistema. Não finalize após fazer apenas ajustes básicos de CSS: valide o
resultado e corrija os problemas encontrados.

------------------------------------------------------------------------

## Como utilizar

1.  Abra o projeto no ambiente de desenvolvimento ou no agente de
    programação.
2.  Anexe ou cole este prompt.
3.  Permita que o agente analise os arquivos e execute as alterações.
4.  Solicite que ele apresente o diagnóstico antes de implementar e o
    relatório de testes ao concluir.
5.  Revise manualmente os fluxos mais importantes do sistema em
    dispositivos reais, se possível.
