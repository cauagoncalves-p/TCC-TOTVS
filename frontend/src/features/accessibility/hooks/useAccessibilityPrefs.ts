// frontend/src/features/accessibility/hooks/useAccessibilityPrefs.ts
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'a11y.vlibras';

export function useAccessibilityPrefs() {
  const getDefaultPreference = (): boolean => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === 'on';
      }
      // Valor padrão definido via env ou 'on' por padrão
      const envDefault = import.meta.env.VITE_VLIBRAS_DEFAULT;
      return envDefault !== 'off';
    } catch {
      return true;
    }
  };

  const [vlibrasEnabled, setVlibrasEnabledState] = useState<boolean>(getDefaultPreference);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setVlibrasEnabledState(e.newValue === 'on');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Ativa ou desativa o VLibras.
   * Conforme especificação da PARTE 6 (Decisão 3), recarrega a página após salvar
   * para evitar instâncias duplicadas ou corrompidas do widget do governo.
   */
  const setVlibrasEnabled = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch (e) {
      console.warn('Não foi possível gravar a preferência no localStorage:', e);
    }
    setVlibrasEnabledState(enabled);
    // Recarrega a página para inicializar/desmontar com segurança
    window.location.reload();
  }, []);

  return {
    vlibrasEnabled,
    setVlibrasEnabled
  };
}
