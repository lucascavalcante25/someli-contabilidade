import { cn } from '@/lib/utils';

type Status = 'em_dia' | 'pendente' | 'atrasado' | 'ativo' | 'inativo' | 'nao_iniciado' | 'futura' | 'proximo_vencimento';

const config: Record<Status, { label: string; className: string }> = {
  em_dia: { label: 'Em dia', className: 'bg-success/10 text-success' },
  pendente: { label: 'Pendente', className: 'bg-warning/10 text-warning' },
  proximo_vencimento: { label: 'Próximo do vencimento', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  atrasado: { label: 'Atrasado', className: 'bg-destructive/10 text-destructive' },
  ativo: { label: 'Ativo', className: 'bg-success/10 text-success' },
  inativo: { label: 'Inativo', className: 'bg-muted text-muted-foreground' },
  nao_iniciado: { label: 'Não iniciado', className: 'bg-muted/80 text-muted-foreground' },
  futura: { label: 'Futura', className: 'bg-primary/10 text-primary' },
};

function labelPagamento(status: Status, mesesPendentes?: number): string {
  const meses = Math.max(0, mesesPendentes ?? 0);

  if (status === 'em_dia') {
    return 'Em dia';
  }

  if (status === 'pendente') {
    if (meses <= 1) return 'Pendente este mês';
    return `Pendente há ${meses} meses`;
  }

  if (status === 'atrasado') {
    if (meses <= 0) return 'Atrasado';
    if (meses === 1) return 'Atrasado este mês';
    return `Atrasado há ${meses} meses`;
  }

  return (config[status] || config.pendente).label;
}

export default function StatusBadge({
  status,
  mesesPendentes,
  label,
}: {
  status: Status;
  /** Quantidade de meses sem pagamento (honorário). Usado em status de cliente. */
  mesesPendentes?: number;
  /** Sobrescreve o texto do badge. */
  label?: string;
}) {
  const c = config[status] || config.pendente;
  const text = label ?? (mesesPendentes != null || status === 'pendente' || status === 'atrasado' || status === 'em_dia'
    ? labelPagamento(status, mesesPendentes)
    : c.label);

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', c.className)}>
      {text}
    </span>
  );
}
