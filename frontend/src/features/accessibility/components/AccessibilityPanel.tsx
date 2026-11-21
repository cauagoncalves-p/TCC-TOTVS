// frontend/src/features/accessibility/components/AccessibilityPanel.tsx
import React from 'react';
import { X, ShieldAlert, Accessibility, Sun, Moon, Laptop } from 'lucide-react';
import { useAccessibilityPrefs } from '../hooks/useAccessibilityPrefs';
import { useTheme } from '../../theme/useTheme';
import { cn } from '../../../lib/utils';

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({ isOpen, onClose }) => {
  const { vlibrasEnabled, setVlibrasEnabled } = useAccessibilityPrefs();
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-panel-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md bg-bg-elevated rounded-2xl shadow-2xl border border-border-subtle overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent-primary/10 text-accent-primary">
              <Accessibility className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="a11y-panel-title" className="text-base font-semibold text-text-primary">
                Acessibilidade e Preferências
              </h3>
              <p className="text-xs text-text-secondary">Recursos visuais, inclusão e apoio à navegação</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-subtle transition-colors"
            aria-label="Fechar painel de acessibilidade"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Opção Fundo Claro / Fundo Escuro */}
          <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface space-y-3">
            <div>
              <span className="font-semibold text-sm text-text-primary block">
                Tema de Cores (Fundo Claro / Fundo Escuro)
              </span>
              <span className="text-[11px] text-text-secondary block mt-0.5">
                Escolha o modo de contraste e iluminação de sua preferência.
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Claro */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                  theme === 'light'
                    ? 'bg-bg-elevated border-accent-primary text-accent-primary shadow-xs ring-2 ring-accent-primary/20'
                    : 'bg-bg-subtle border-border-subtle text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                )}
                aria-pressed={theme === 'light'}
              >
                <Sun className={cn('w-4 h-4', theme === 'light' ? 'text-amber-500' : 'text-text-muted')} />
                <span>Claro</span>
              </button>

              {/* Escuro */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                  theme === 'dark'
                    ? 'bg-bg-primary border-accent-secondary text-accent-secondary shadow-xs ring-2 ring-accent-secondary/20'
                    : 'bg-bg-subtle border-border-subtle text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                )}
                aria-pressed={theme === 'dark'}
              >
                <Moon className={cn('w-4 h-4', theme === 'dark' ? 'text-accent-secondary' : 'text-text-muted')} />
                <span>Escuro</span>
              </button>

              {/* Sistema */}
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                  theme === 'system'
                    ? 'bg-bg-elevated border-accent-primary text-accent-primary shadow-xs ring-2 ring-accent-primary/20'
                    : 'bg-bg-subtle border-border-subtle text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                )}
                aria-pressed={theme === 'system'}
              >
                <Laptop className={cn('w-4 h-4', theme === 'system' ? 'text-accent-primary' : 'text-text-muted')} />
                <span>Sistema</span>
              </button>
            </div>
          </div>

          {/* Opção VLibras com Interruptor */}
          <div className="p-4 rounded-xl border border-border-subtle bg-bg-surface space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm text-text-primary block">
                  Tradutor de Libras (VLibras)
                </span>
                <span className="text-[11px] text-text-secondary block mt-0.5">
                  Widget oficial do Governo Federal para tradução de textos em Português para Libras via avatar 3D.
                </span>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={vlibrasEnabled}
                onClick={() => setVlibrasEnabled(!vlibrasEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-accent-secondary focus:ring-offset-2 ${
                  vlibrasEnabled ? 'bg-accent-secondary' : 'bg-border-strong'
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

            <p className="text-[11px] text-text-muted italic">
              * Ao alterar a preferência de Libras, a página será recarregada automaticamente para carregar o avatar oficial.
            </p>
          </div>

          {/* Aviso de Privacidade e LGPD */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-500">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
              <span>Aviso de Privacidade e Dados (LGPD)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
              O VLibras é um serviço público externo mantido pelo Governo Federal. Ao utilizá-lo, o texto que você selecionar ou solicitar para tradução é enviado aos servidores do serviço governamental para processamento do avatar 3D.
            </p>
            <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-400 font-medium pt-1 border-t border-amber-500/20">
              Neste ambiente acadêmico de demonstração (TCC), todos os dados de colaboradores são estritamente fictícios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
