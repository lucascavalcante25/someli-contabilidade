import { useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateFieldProps {
  /** Valor em yyyy-MM-dd */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/** Campo de data com calendário do sistema (substitui input type=date nativo). */
export default function DateField({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  className,
  disabled,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseISO(value) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-[42px] w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm outline-none transition-all',
            'hover:border-muted-foreground/35 focus-visible:ring-2 focus-visible:ring-ring/20',
            'disabled:cursor-not-allowed disabled:opacity-60',
            !selected && 'text-muted-foreground',
            className
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
          onSelect={(day) => {
            if (day) {
              onChange(format(day, 'yyyy-MM-dd'));
              setOpen(false);
            }
          }}
          locale={ptBR}
          initialFocus
          className="rounded-xl"
        />
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
  );
}
