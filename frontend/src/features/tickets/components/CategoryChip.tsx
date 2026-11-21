import React from 'react';
import { TicketCategory } from '../types';
import { formatTicketCategory } from '../labels';
import { cn } from '../../../lib/utils';

interface CategoryChipProps {
  category: TicketCategory;
  className?: string;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({ category, className }) => {
  const label = formatTicketCategory(category);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200',
        className
      )}
    >
      {label}
    </span>
  );
};
