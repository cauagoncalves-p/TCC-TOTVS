import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}) => {
  // Cores semânticas mapeadas estritamente via tokens do Tailwind/CSS sem hex direto
  const variantStyles = {
    default: 'bg-brand-100 text-brand-900 border-brand-300',
    success: 'bg-risk-low-bg text-risk-low border-current/20',
    warning: 'bg-risk-moderate-bg text-risk-moderate border-current/20',
    danger: 'bg-risk-high-bg text-risk-high border-current/20',
    info: 'bg-info-bg text-info border-current/20',
    neutral: 'bg-slate-100 text-text-secondary border-app-border'
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border shadow-2xs select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
