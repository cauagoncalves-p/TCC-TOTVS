// frontend/src/features/accessibility/components/AccessibilityPanel.tsx
import React from 'react';
import { X, ShieldAlert, Accessibility, Check } from 'lucide-react';
import { useAccessibilityPrefs } from '../hooks/useAccessibilityPrefs';
import { Button } from '../../../components/ui/Button';

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ isOpen, onClose }) => {
  const { vlibrasEnabled, setVlibrasEnabled } = useAccessibilityPrefs();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-panel-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Accessibility className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="a11y-panel-title" className="text-base font-semibold text-slate-900">
                Preferências de Acessibilidade
              </h3>
              <p className="text-xs text-slate-500">Recursos de inclusão e apoio à navegação</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
            aria-label="Fechar painel de acessibilidade"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Opção VLibras com Interruptor */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm text-slate-900 block">
                  Tradutor de Libras (VLibras)
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Widget oficial do Governo Federal para tradução de textos em Português para Libras via avatar 3D.
                </span>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={vlibrasEnabled}
                onClick={() => setVlibrasEnabled(!vlibrasEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  vlibrasEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
                aria-label="Ativar ou desativar tradutor de Libras"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    vlibrasEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              * Ao alterar esta preferência, a página será recarregada automaticamente para aplicar a configuração.
            </p>
          </div>

          {/* Aviso de Privacidade e LGPD */}
          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-950 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
              <span>Aviso de Privacidade e Dados (LGPD)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900">
              O VLibras é um serviço público externo mantido pelo Governo Federal. Ao utilizá-lo, o texto que você selecionar ou solicitar para tradução é enviado aos servidores do serviço governamental para processamento do avatar 3D.
            </p>
            <p className="text-[11px] leading-relaxed text-amber-900 font-medium pt-1 border-t border-amber-200/60">
              Neste ambiente acadêmico de demonstração (TCC), todos os dados de colaboradores são estritamente fictícios.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end">
          <Button type="button" variant="primary" size="sm" onClick={onClose} className="text-xs">
            <span>Concluir</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
