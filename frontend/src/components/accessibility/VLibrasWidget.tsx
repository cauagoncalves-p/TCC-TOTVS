// frontend/src/components/accessibility/VLibrasWidget.tsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

declare global {
  interface Window {
    VLibras?: {
      Widget: new (configOrUrl: string | Record<string, any>) => unknown;
    };
    __vlibrasStarted?: boolean;
  }
}

const WIDGET_URL = 'https://vlibras.gov.br/app';

// "vw", "vw-access-button" e "vw-plugin-wrapper" são atributos HTML personalizados do VLibras
const vwRoot = { vw: '' } as Record<string, string>;
const vwAccessButton = { 'vw-access-button': '' } as Record<string, string>;
const vwPluginWrapper = { 'vw-plugin-wrapper': '' } as Record<string, string>;

export interface VLibrasWidgetProps {
  enabled: boolean;
}

export const VLibrasWidget: React.FC<VLibrasWidgetProps> = ({ enabled }) => {
  useEffect(() => {
    // Se estiver desativado ou já inicializado nesta sessão/aba, não carrega novamente
    if (!enabled || window.__vlibrasStarted) return;
    window.__vlibrasStarted = true;

    // Carregamento assíncrono do script oficial do governo
    const script = document.createElement('script');
    script.src = `${WIDGET_URL}/vlibras-plugin.js`;
    script.async = true;

    script.onload = () => {
      try {
        if (window.VLibras?.Widget) {
          new window.VLibras.Widget(WIDGET_URL);
        }
      } catch {
        // Falha silenciosa: sem internet ou com o serviço fora do ar,
        // o app segue funcionando normalmente sem quebrar a interface
        window.__vlibrasStarted = false;
      }
    };

    script.onerror = () => {
      // Falha silenciosa caso o script não possa ser baixado (ex: offline ou CSP)
      window.__vlibrasStarted = false;
    };

    document.body.appendChild(script);
  }, [enabled]);

  if (!enabled) return null;

  // Renderiza a estrutura oficial do widget diretamente como filha de <body>
  return createPortal(
    <div {...vwRoot} className="enabled">
      <div {...vwAccessButton} className="active" />
      <div {...vwPluginWrapper}>
        <div className="vw-plugin-top-wrapper" />
      </div>
    </div>,
    document.body
  );
};

export default VLibrasWidget;
