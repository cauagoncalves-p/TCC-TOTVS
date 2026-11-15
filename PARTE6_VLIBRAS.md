## PARTE 6: Tradutor de Libras (VLibras) no frontend

> Seguir as "Regras para o agente" do topo do ARCHITECTURE.md. Somente frontend.
> Antes de implementar, conferir o snippet de instalação **atual** na documentação oficial do VLibras (portal do governo, `vlibras.gov.br`) e seguir o que ela disser caso difira deste documento.

### Objetivo
Tornar o TOTVS RH Inteligente acessível a pessoas surdas, com o **VLibras**, widget oficial do governo federal que traduz textos em português para a Língua Brasileira de Sinais (Libras) por meio de um avatar 3D. Reforça o tema de **inclusão digital** do TCC.

### Como o VLibras funciona (resumo)
- É um **script externo**, servido por `https://vlibras.gov.br/app`, que cria um botão flutuante de acessibilidade e um avatar que traduz o texto da página.
- Instalação oficial: carregar `https://vlibras.gov.br/app/vlibras-plugin.js`, ter na página a marcação do widget (`<div vw>` com o botão de acesso e o contêiner do plugin) e iniciar com `new window.VLibras.Widget('https://vlibras.gov.br/app')`.
- A marcação deve ser filha direta do `<body>` para o CSS da aplicação não interferir.
- Existem pacotes de terceiros (por exemplo, wrappers para React), mas **não oficiais**. Decisão: **não instalar wrapper**; implementar um componente próprio, pequeno, com o script oficial.

### Decisões

1. **Componente próprio** `VLibrasWidget`, montado **uma vez na raiz do app** (fora das rotas), para aparecer no login e em todas as telas internas sem reinicializar ao navegar.
2. **Ligado por padrão**, com opção de desativar em "Acessibilidade" (preferência salva em `localStorage`, chave `a11y.vlibras`, valores `on`/`off`). Padrão inicial via `VITE_VLIBRAS_DEFAULT` (`on`).
3. **Ativar/desativar recarrega a página.** O widget do governo não oferece desmontagem limpa; recarregar evita widget duplicado ou quebrado.
4. **Falha silenciosa.** Sem internet ou com o serviço do governo fora do ar, o sistema funciona normalmente; o widget simplesmente não aparece (sem erro na tela).
5. **Carregamento tardio.** O script só é inserido depois do app estar interativo, para não atrasar o login.
6. **Instância única.** Guarda global (`window.__vlibrasStarted`) para não duplicar o widget no modo de desenvolvimento do React (StrictMode executa efeitos duas vezes).

### Componente (referência)

```tsx
// src/components/accessibility/VLibrasWidget.tsx
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => unknown }
    __vlibrasStarted?: boolean
  }
}

const WIDGET_URL = 'https://vlibras.gov.br/app'
// "vw" não é atributo conhecido de <div> no TSX: aplicar via spread.
const vwRoot = { vw: '' } as Record<string, string>

export function VLibrasWidget({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || window.__vlibrasStarted) return
    window.__vlibrasStarted = true
    const script = document.createElement('script')
    script.src = `${WIDGET_URL}/vlibras-plugin.js`
    script.async = true
    script.onload = () => {
      try { new window.VLibras!.Widget(WIDGET_URL) }
      catch { window.__vlibrasStarted = false }
    }
    script.onerror = () => { window.__vlibrasStarted = false }
    document.body.appendChild(script)
  }, [enabled])

  if (!enabled) return null
  return createPortal(
    <div {...vwRoot} className="enabled">
      <div vw-access-button="" className="active" />
      <div vw-plugin-wrapper="">
        <div className="vw-plugin-top-wrapper" />
      </div>
    </div>,
    document.body
  )
}
```

O agente deve conferir se a marcação e as classes batem com a documentação oficial atual.

### Preferência e menu de Acessibilidade

- Hook `useAccessibilityPrefs()` lê e grava `a11y.vlibras` (`localStorage` guarda apenas a preferência, nunca dado pessoal).
- Item **"Acessibilidade"** na barra superior (ícone de acessibilidade), disponível também na tela de login. Abre um painel com:
  - interruptor **"Tradutor de Libras (VLibras)"** (ao mudar, recarrega a página);
  - texto curto: "O VLibras é um serviço do governo federal. Ao usá-lo, o texto que você pedir para traduzir é enviado ao serviço do governo."
- O botão flutuante do próprio VLibras continua sendo o acesso principal para quem usa Libras.

### Privacidade e LGPD

- O widget é um **serviço de terceiros (governo)**: o navegador carrega o script externo e o texto que o usuário aciona para tradução é enviado a esse serviço.
- Telas com dados pessoais (CPF, holerite, cadastros) podem exibir esse texto. Na demonstração, **só há dados fictícios**. Para um ambiente real, a decisão de uso nessas telas deve ser avaliada por quem responde pela LGPD na organização.
- Registrar essa observação no README e na tela de Acessibilidade.
- Se o projeto adotar **Content-Security-Policy**, liberar o domínio `vlibras.gov.br` (e os subdomínios que o widget usar; conferir no console do navegador) para scripts, requisições, imagens e estilos.

### Acessibilidade do conteúdo (para o tradutor funcionar bem)

O VLibras traduz **texto do DOM**. Para melhorar o resultado:
1. `<html lang="pt-BR">` no `index.html`.
2. Todo texto da interface real (nada de texto dentro de imagem).
3. **Gráficos** (Recharts): oferecer um resumo em texto ao lado ou abaixo (ex.: "Absenteísmo de Atendimento subiu de 4% para 7% em 5 meses") e/ou tabela alternativa, pois o texto interno de gráficos SVG traduz mal.
4. **Linguagem simples**: frases curtas, evitar siglas sem explicação (DP, eSocial, RAG, turnover). Usar dica (tooltip) ou glossário. Para muitas pessoas surdas, o português é segunda língua e a Libras é a primeira.
5. Selos de status com **texto e ícone**, nunca só cor.
6. Manter HTML semântico, foco visível e navegação por teclado.

O VLibras é um **complemento**, não substitui as boas práticas de acessibilidade web.

### Posição e conflitos visuais

- O botão flutuante fica, por padrão, no canto direito da tela. Garantir que **não cubra** o botão de enviar do chat, os toasts nem o rodapé de formulários (ajustar margens da página ou o `z-index` dos elementos da aplicação).
- Se versões recentes do widget aceitarem opções de posição, avatar e opacidade, usar o que a documentação oficial indicar; caso contrário, ajustar por CSS.

### Ordem de implementação

1. Conferir o snippet atual na documentação oficial.
2. Criar `VLibrasWidget` e `useAccessibilityPrefs`; montar na raiz do app.
3. Painel "Acessibilidade" na barra superior e na tela de login, com o aviso de privacidade.
4. Ajustar `index.html` (`lang="pt-BR"`), conferir `z-index` e posição do botão nas telas com chat e formulários.
5. Resumos em texto para os gráficos das telas de Inteligência e Compliance.
6. Atualizar o README (o que é o VLibras, privacidade, como desativar).

### Critérios de aceite

- O botão do VLibras aparece no **login** e nas telas internas, e o avatar traduz um texto selecionado da página.
- Navegar entre telas **não duplica** o widget; recarregar a página também não.
- Em modo de desenvolvimento (StrictMode) só existe **um** widget.
- Desativar em "Acessibilidade" recarrega a página sem o widget; ativar traz de volta.
- Sem internet (ou com o domínio bloqueado), o sistema funciona normalmente e nenhuma tela quebra.
- O botão do VLibras não cobre o envio do chat, os toasts nem os botões principais de formulário.
- Cada gráfico tem resumo em texto.
- Aviso de privacidade visível no painel de Acessibilidade; README atualizado.

### Evoluções (fora do escopo)
- Conteúdos de vídeo com intérprete de Libras para as telas de ajuda.
- Glossário de termos de RH em Libras.
- Revisão de acessibilidade completa (WCAG) com ferramentas automáticas e teste com pessoas usuárias.
