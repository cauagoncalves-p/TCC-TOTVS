import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 sm:pb-6 border-b border-app-border mb-4 sm:mb-6 gap-3">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-brand-900 tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="mt-1 sm:mt-0 flex items-center flex-wrap gap-2 shrink-0">{action}</div>}
    </div>
  );
};
