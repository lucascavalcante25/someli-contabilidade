import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useValoresVisibilidade } from '@/contexts/ValoresVisibilidadeContext';

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

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function labelPagamento(status: Status, mesesPendentes?: number): string {
  const meses = Math.max(0, mesesPendentes ?? 0);

  if (status === 'em_dia') return 'Em dia';
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

export type PaymentStatusBadgeProps = {
  status: Status;
  mesesPendentes?: number;
  mesesPendentesDetalhe?: string[];
  valorPendente?: number;
  ativo?: boolean;
  label?: string;
};

export default function StatusBadge({
  status,
  mesesPendentes,
  mesesPendentesDetalhe,
  valorPendente,
  ativo = true,
  label,
}: PaymentStatusBadgeProps) {
  const { mascarar } = useValoresVisibilidade();
  const meses = Math.max(0, mesesPendentes ?? 0);
  const valor = Number(valorPendente ?? 0);
  const valorFmt = mascarar(formatCurrency(valor));

  let text = label;
  let className = (config[status] || config.pendente).className;

  if (!label) {
    if (ativo === false) {
      if (meses <= 0 || valor <= 0) {
        text = 'Inativo / Em dia';
        className = 'bg-muted text-muted-foreground';
      } else {
        text = `Inativo / Inadimplente ${valorFmt}`;
        className = 'bg-destructive/10 text-destructive';
      }
    } else {
      text = labelPagamento(status, mesesPendentes);
      className = (config[status] || config.pendente).className;
    }
  }

  const badge = (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium max-w-full truncate', className)}>
      {text}
    </span>
  );

  const showTooltip = meses > 1 && (mesesPendentesDetalhe?.length || valor > 0);
  if (!showTooltip) return badge;

  const mesesTxt = (mesesPendentesDetalhe && mesesPendentesDetalhe.length > 0)
    ? (mesesPendentesDetalhe.length === 1
        ? mesesPendentesDetalhe[0]
        : `${mesesPendentesDetalhe.slice(0, -1).join(', ')} e ${mesesPendentesDetalhe[mesesPendentesDetalhe.length - 1]}`)
    : `${meses} meses`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="max-w-full inline-flex">
          {badge}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="z-[80] max-w-sm overflow-visible whitespace-normal break-words px-3 py-2 text-xs leading-relaxed"
      >
        <div className="space-y-1">
          <p className="font-medium">Pendente: {mesesTxt}</p>
          <p>Valor total: {valorFmt}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
