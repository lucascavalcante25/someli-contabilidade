import { Eye, EyeOff } from 'lucide-react';
import { useValoresVisibilidade } from '@/contexts/ValoresVisibilidadeContext';
import { cn } from '@/lib/utils';

interface ToggleValoresButtonProps {
  className?: string;
  /** compact = só ícone (ex.: no StatCard) */
  compact?: boolean;
}

export default function ToggleValoresButton({ className, compact = false }: ToggleValoresButtonProps) {
  const { visiveis, toggle } = useValoresVisibilidade();

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
        compact ? 'p-1.5' : 'px-2.5 py-1.5 text-xs font-medium',
        className
      )}
      title={visiveis ? 'Ocultar valores' : 'Mostrar valores'}
      aria-label={visiveis ? 'Ocultar valores' : 'Mostrar valores'}
    >
      {visiveis ? <Eye size={compact ? 16 : 15} /> : <EyeOff size={compact ? 16 : 15} />}
      {!compact && <span>{visiveis ? 'Ocultar valores' : 'Mostrar valores'}</span>}
    </button>
  );
}
