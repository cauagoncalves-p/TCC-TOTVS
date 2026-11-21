import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';

export const AppLayout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Fechar gaveta ao pressionar Esc
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Fechar gaveta ao redimensionar para desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsMobileSidebarOpen(false);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  return (
    // AppShell: grid definido em index.css via classe .app-shell
    // Mobile: 1 coluna; Desktop (≥1024px): sidebar-width + 1fr
    <div className="app-shell bg-app-bg text-text-primary">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Coluna principal: topbar sticky + área de conteúdo */}
      <div className="main-column">
        <TopNavbar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        <main className="page-area animate-in fade-in duration-200">
          {/* page-content aplica max-width, margin-inline: auto e padding via CSS */}
          <div className="page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
