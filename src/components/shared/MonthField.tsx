import { useState } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface MonthFieldProps {
  /** Valor em yyyy-MM */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

function mesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

/** Seletor de mês e ano no visual do sistema (substitui input type=month nativo). */
export default function MonthField({
  value,
  onChange,
  placeholder = 'Selecione o mês',
  className,
  disabled,
  ariaLabel,
}: MonthFieldProps) {
  const [open, setOpen] = useState(false);
  const [anoValor, mesValor] = value ? value.split('-').map(Number) : [undefined, undefined];
  const [ano, setAno] = useState(anoValor ?? new Date().getFullYear());
  const rotulo = anoValor && mesValor ? `${MESES[mesValor - 1]} de ${anoValor}` : placeholder;

  const escolher = (novo: string) => {
    onChange(novo);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(aberto) => {
        setOpen(aberto);
        if (aberto) setAno(anoValor ?? new Date().getFullYear());
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ? `${ariaLabel}: ${rotulo}` : undefined}
          className={cn(
            'flex h-[42px] w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm outline-none transition-all',
            'hover:border-muted-foreground/35 focus-visible:ring-2 focus-visible:ring-ring/20',
            'disabled:cursor-not-allowed disabled:opacity-60',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{rotulo}</span>
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 z-[300] rounded-xl border-border shadow-lg" align="start">
        <div className="flex items-center justify-between px-3 py-2">
          <button
            type="button"
            aria-label="Ano anterior"
            onClick={() => setAno((a) => a - 1)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold tabular-nums">{ano}</span>
          <button
            type="button"
            aria-label="Próximo ano"
            onClick={() => setAno((a) => a + 1)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 px-3 pb-3">
          {MESES.map((mes, indice) => {
            const selecionado = ano === anoValor && indice + 1 === mesValor;
            return (
              <button
                key={mes}
                type="button"
                aria-label={mes}
                aria-pressed={selecionado}
                onClick={() => escolher(`${ano}-${String(indice + 1).padStart(2, '0')}`)}
                className={cn(
                  'rounded-md px-2 py-2 text-xs font-medium transition-colors',
                  selecionado ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10'
                )}
              >
                {mes.slice(0, 3)}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => escolher('')}
          >
            Limpar
          </button>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:opacity-80"
            onClick={() => escolher(mesAtual())}
          >
            Este mês
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
