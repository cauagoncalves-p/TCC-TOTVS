// frontend/src/features/theme/useTheme.ts
import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'totvs-theme';
const THEME_EVENT = 'totvs-theme-change';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function getStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'light';
}

function applyThemeToDocument(theme: ThemeMode) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    root.setAttribute('data-theme', 'light');
  }

  return resolved;
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    return theme === 'system' ? getSystemTheme() : theme;
  });

  // Aplica o tema e notifica outros listeners
  const setTheme = useCallback((newTheme: ThemeMode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Falha ao salvar tema no localStorage:', e);
    }

    setThemeState(newTheme);
    const resolved = applyThemeToDocument(newTheme);
    setResolvedTheme(resolved);

    // Dispara evento para sincronizar todos os componentes na mesma página
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: newTheme }));
  }, []);

  const toggleTheme = useCallback(() => {
    // Se estiver escuro, vai para claro; se estiver claro (ou system claro), vai para escuro
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  // Efeito inicial e escuta de eventos de tema
  useEffect(() => {
    const initialResolved = applyThemeToDocument(theme);
    setResolvedTheme(initialResolved);

    // Escuta mudanças de preferência do sistema operacional
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (getStoredTheme() === 'system') {
        const sys = getSystemTheme();
        applyThemeToDocument('system');
        setResolvedTheme(sys);
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    // Escuta evento customizado de troca de tema (entre componentes)
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>;
      if (customEvent.detail) {
        setThemeState(customEvent.detail);
        const res = applyThemeToDocument(customEvent.detail);
        setResolvedTheme(res);
      }
    };
    window.addEventListener(THEME_EVENT, handleThemeChange);

    // Escuta mudanças em outras abas (storage event)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const newTheme = e.newValue as ThemeMode;
        setThemeState(newTheme);
        const res = applyThemeToDocument(newTheme);
        setResolvedTheme(res);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener(THEME_EVENT, handleThemeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [theme]);

  return {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setTheme,
    toggleTheme
  };
}
