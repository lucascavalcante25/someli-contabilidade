import { cn } from '@/lib/utils';

type Status = 'em_dia' | 'pendente' | 'atrasado' | 'ativo' | 'inativo';

const config: Record<Status, { label: string; className: string }> = {
  em_dia: { label: 'Em dia', className: 'bg-success/10 text-success' },
  pendente: { label: 'Pendente', className: 'bg-warning/10 text-warning' },
  atrasado: { label: 'Atrasado', className: 'bg-destructive/10 text-destructive' },
  ativo: { label: 'Ativo', className: 'bg-success/10 text-success' },
  inativo: { label: 'Inativo', className: 'bg-muted text-muted-foreground' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const c = config[status] || config.pendente;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', c.className)}>
      {c.label}
    </span>
  );
}
