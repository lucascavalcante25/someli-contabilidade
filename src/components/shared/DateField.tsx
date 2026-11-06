import { useMemo, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Info } from 'lucide-react';
import type { DayContentProps } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ajusteDiaUtil, type MapaFeriados } from '@/lib/feriados';
import { cn } from '@/lib/utils';

interface DateFieldProps {
  /** Valor em yyyy-MM-dd */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Com feriados: marca no calendário (nome ao passar o mouse e legenda) e avisa o ajuste do vencimento. */
  feriados?: MapaFeriados;
  /** Regra do vencimento em dia não útil: Pessoal antecipa, demais prorrogam; 'misto' quando há dos dois. */
  antecipa?: boolean | 'misto';
}

const brasil = (isoData: string) => format(parseISO(isoData), 'dd/MM/yyyy');

/** Campo de data com calendário do sistema (substitui input type=date nativo). */
export default function DateField({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  className,
  disabled,
  feriados,
  antecipa = false,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseISO(value) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;
  const [mesVisivel, setMesVisivel] = useState<Date>(selected ?? new Date());

  const datasFeriado = useMemo(() => Object.keys(feriados ?? {}).map((d) => parseISO(d)), [feriados]);
  const legenda = useMemo(() => {
    const prefixo = format(mesVisivel, 'yyyy-MM');
    return Object.entries(feriados ?? {})
      .filter(([d]) => d.startsWith(prefixo))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, nome]) => `${format(parseISO(d), 'dd/MM')} — ${nome}`);
  }, [feriados, mesVisivel]);

  const ajuste = feriados && value && selected ? ajusteDiaUtil(value, antecipa === true, feriados) : null;
  const antecipado = feriados && value && selected && antecipa === 'misto' ? ajusteDiaUtil(value, true, feriados) : null;

  const DiaComFeriado = ({ date }: DayContentProps) => {
    const nome = feriados?.[format(date, 'yyyy-MM-dd')];
    return nome ? <span title={nome}>{date.getDate()}</span> : <>{date.getDate()}</>;
  };

  return (
    <div className={cn('w-full', className)}>
      <Popover
        open={open}
        onOpenChange={(aberto) => {
          if (aberto) setMesVisivel(selected ?? new Date());
          setOpen(aberto);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-[42px] w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm outline-none transition-all',
              'hover:border-muted-foreground/35 focus-visible:ring-2 focus-visible:ring-ring/20',
              'disabled:cursor-not-allowed disabled:opacity-60',
              !selected && 'text-muted-foreground'
            )}
          >
            <span className="truncate tabular-nums">
              {selected ? format(selected, 'dd/MM/yyyy') : placeholder}
            </span>
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[300] rounded-xl border-border shadow-lg" align="start">
          <Calendar
            mode="single"
            selected={selected}
            month={mesVisivel}
            onMonthChange={setMesVisivel}
            onSelect={(day) => {
              if (day) {
                onChange(format(day, 'yyyy-MM-dd'));
                setOpen(false);
              }
            }}
            locale={ptBR}
            initialFocus
            className="rounded-xl"
            {...(feriados
              ? {
                  modifiers: { feriado: datasFeriado },
                  modifiersClassNames: { feriado: 'text-destructive font-semibold underline decoration-dotted' },
                  components: { DayContent: DiaComFeriado },
                }
              : {})}
          />
          {feriados && legenda.length > 0 && (
            <ul className="max-w-[280px] space-y-0.5 border-t border-border px-3 py-2 text-[11px] text-destructive">
              {legenda.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Limpar
            </button>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:opacity-80"
              onClick={() => {
                onChange(format(new Date(), 'yyyy-MM-dd'));
                setOpen(false);
              }}
            >
              Hoje
            </button>
          </div>
        </PopoverContent>
      </Popover>
      {ajuste?.motivo && (
        <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
          <Info size={12} className="mt-px shrink-0" />
          <span>
            {antecipado
              ? `${ajuste.motivo}: ao salvar, as do Pessoal antecipam para ${brasil(antecipado.data)} e as demais prorrogam para ${brasil(ajuste.data)}.`
              : `${ajuste.motivo}: ao salvar, ${antecipa ? 'antecipa' : 'prorroga'} para ${brasil(ajuste.data)}.`}
          </span>
        </p>
      )}
    </div>
  );
}
