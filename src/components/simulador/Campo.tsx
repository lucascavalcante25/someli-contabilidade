import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const classeInput =
  'w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all';

interface CampoProps {
  rotulo: string;
  ajuda?: string;
  children: ReactNode;
  className?: string;
}

/** Rótulo + controle + ajuda curta, no padrão dos formulários do sistema. */
export default function Campo({ rotulo, ajuda, children, className }: CampoProps) {
  return (
    <label className={cn('block min-w-0 space-y-1', className)}>
      <span className="text-xs font-medium text-muted-foreground">{rotulo}</span>
      {children}
      {ajuda && <span className="block text-[11px] leading-snug text-muted-foreground">{ajuda}</span>}
    </label>
  );
}
