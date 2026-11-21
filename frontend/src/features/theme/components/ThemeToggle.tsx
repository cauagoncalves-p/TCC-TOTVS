// frontend/src/features/theme/components/ThemeToggle.tsx
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../useTheme';
import { cn } from '../../../lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative p-2 rounded-lg transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center',
        'text-slate-300 hover:text-white hover:bg-brand-700/50',
        'focus:outline-hidden focus:ring-2 focus:ring-cyan-400 focus:ring-offset-1 focus:ring-offset-brand-950',
        'group cursor-pointer select-none',
        className
      )}
      title={isDark ? 'Alternar para Modo Claro (fundo claro)' : 'Alternar para Modo Escuro (fundo escuro)'}
      aria-label={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center overflow-hidden">
        {/* Ícone de Sol (ativo no modo escuro para convidar a ir para o claro) */}
        <Sun
          className={cn(
            'w-4 h-4 text-amber-300 transition-all duration-300 transform absolute',
            isDark
              ? 'opacity-100 rotate-0 scale-100 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
              : 'opacity-0 -rotate-90 scale-50'
          )}
          aria-hidden="true"
        />

        {/* Ícone de Lua (ativo no modo claro para convidar a ir para o escuro) */}
        <Moon
          className={cn(
            'w-4 h-4 text-slate-200 transition-all duration-300 transform absolute group-hover:text-cyan-300',
            !isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 rotate-90 scale-50'
          )}
          aria-hidden="true"
        />
      </div>
    </button>
  );
};
