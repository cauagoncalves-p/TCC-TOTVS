# Correção da interface do Assistente de IA — preservar a visualização completa do chat

## Objetivo

Corrigir a área do Assistente de IA para que imagens, ilustrações, avatares ou elementos visuais associados à IA **não ocupem a tela inteira nem cubram a conversa**.

O usuário precisa conseguir visualizar o chat como um todo: mensagens, respostas, sugestões e campo de digitação. A interface deve priorizar a conversa, especialmente em dispositivos móveis.

Use a captura de tela fornecida como referência do problema e analise a implementação atual antes de alterar o código.

## Instrução para implementação

Atue como um desenvolvedor front-end sênior, com experiência em interfaces conversacionais, responsividade e UX mobile. Inspecione os componentes, estilos e estrutura da tela do Assistente de IA e implemente a correção diretamente no projeto.

### 1. Não deixe imagens dominarem a conversa

- Identifique imagens, fundos, ilustrações, banners, avatares ou elementos visuais que estejam ocupando uma área excessiva da interface.
- Não use uma imagem como camada de tela cheia sobre o chat.
- Se a imagem for apenas decorativa, reduza-a para um elemento discreto ou remova-a quando estiver prejudicando a leitura.
- Se a imagem for necessária ao contexto, mantenha-a em tamanho controlado, dentro do fluxo do conteúdo, sem cobrir mensagens ou controles.
- Evite `position: fixed` ou `position: absolute` em imagens e camadas decorativas quando isso provocar sobreposição da conversa.
- Não aplique `background-size: cover` em uma imagem que acabe tomando toda a área útil do chat.
- Preserve a proporção da imagem com `object-fit: contain` quando o conteúdo visual precisar aparecer por inteiro.

### 2. Priorize a área de conversa

A hierarquia visual deve ser:

1. Cabeçalho compacto do assistente;
2. Área de mensagens, com o máximo de espaço útil possível;
3. Sugestões de perguntas, quando existirem, sem bloquear a conversa;
4. Campo de digitação e botão de envio, sempre acessíveis.

A área de mensagens deve ser o elemento principal da tela. Não permita que banners, imagens, cartões informativos ou cabeçalhos altos reduzam desnecessariamente o espaço disponível para ler a conversa.

### 3. Comportamento correto do chat

- Organize a interface em coluna, ocupando a altura disponível da tela.
- Faça somente a área de mensagens rolar verticalmente, quando possível.
- Mantenha o campo de digitação acessível na parte inferior do chat, sem cobrir a última mensagem.
- Reserve espaço suficiente para que a última mensagem possa ser visualizada acima do campo de digitação.
- Ao enviar uma mensagem, mantenha o comportamento de rolagem até a mensagem mais recente, sem impedir que o usuário consulte mensagens anteriores.
- Não deixe o cabeçalho, o campo de digitação ou elementos flutuantes cobrirem o conteúdo.
- Se houver sugestões de perguntas, permita que sejam acessadas sem ocupar uma altura exagerada.

### 4. Responsividade mobile

Em celulares:

- Utilize a altura real disponível da viewport, considerando as barras do navegador e as áreas seguras do aparelho.
- Prefira unidades modernas como `dvh` quando compatíveis, com fallback apropriado.
- Considere `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)` quando necessário.
- Evite alturas fixas que cortem a conversa em telas pequenas.
- Garanta que o teclado virtual não esconda o campo de digitação nem impeça a leitura das mensagens.
- Não gere rolagem horizontal.
- Não permita que imagens ou cartões empurrem o campo de mensagem para fora da tela.
- Teste em telas estreitas, incluindo larguras próximas de 320 px, 360 px, 375 px, 390 px e 430 px.

Em tablets e desktops, mantenha a conversa centralizada e com largura confortável para leitura, sem esticar as mensagens por toda a tela.

### 5. Preserve funcionalidades e identidade visual

- Não remova funcionalidades existentes do assistente.
- Preserve envio de mensagens, respostas, histórico, sugestões, estados de carregamento e tratamento de erros.
- Não altere regras de negócio, integrações ou chamadas de API.
- Preserve cores, tipografia, ícones e identidade visual do projeto, salvo ajustes estritamente necessários à legibilidade.
- Não substitua o chat por uma imagem estática ou por uma versão apenas ilustrativa.

### 6. Critérios de aceite

Considere a correção concluída somente quando:

- A imagem ou ilustração não cobrir a área da conversa.
- O usuário conseguir visualizar as mensagens sem obstruções.
- O histórico puder ser percorrido verticalmente.
- O campo de digitação e o botão de envio permanecerem acessíveis.
- A última mensagem não ficar escondida atrás do campo de digitação.
- O layout funcionar em celulares, tablets e desktops.
- Não houver sobreposição, corte de conteúdo ou rolagem horizontal indesejada.
- Todas as funcionalidades do assistente continuarem operacionais.

### 7. Validação

Depois de implementar:

1. Abra a tela real do Assistente de IA.
2. Teste com uma conversa curta e outra longa.
3. Teste mensagens extensas, respostas com listas e conteúdo que ocupe várias linhas.
4. Teste com e sem sugestões de perguntas.
5. Teste o teclado virtual em dispositivos móveis ou emulação equivalente.
6. Verifique diferentes larguras e alturas de viewport.
7. Corrija os problemas encontrados e repita os testes.

Não declare testes como aprovados se não tiverem sido executados.

## Resultado esperado

A tela deve continuar apresentando a identidade visual do Assistente de IA, mas a conversa precisa ser o foco principal. Imagens e elementos decorativos devem ser discretos e nunca encobrir o chat.

**Implemente a correção diretamente no projeto. Não se limite a explicar o que deveria ser feito. Ao finalizar, informe resumidamente os arquivos alterados e os testes efetivamente realizados.**
