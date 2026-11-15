import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'outline';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-app-surface border border-app-border shadow-xs rounded-xl',
    flat: 'bg-app-bg border border-app-border/60 rounded-xl',
    outline: 'bg-transparent border border-app-border rounded-xl'
  };

  return (
    <div className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('p-6 pb-4', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => (
  <h3 className={cn('text-base font-semibold text-brand-900', className)} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('p-6 pt-0', className)} {...props}>
    {children}
  </div>
);
