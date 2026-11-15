import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-text-primary mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 text-xs bg-app-surface border rounded-lg shadow-2xs placeholder-text-secondary/60 focus:outline-hidden focus:ring-2 transition-colors',
            error
              ? 'border-risk-high text-risk-high focus:border-risk-high focus:ring-risk-high/30'
              : 'border-app-border text-text-primary focus:border-brand-500 focus:ring-brand-500/20',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-risk-high font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-text-secondary">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
