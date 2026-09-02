import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const EMPTY = '__empty__';

interface AppSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  /** Permite valor vazio (ex.: "Não informado") — use option com value="" */
  allowEmpty?: boolean;
}

/** Select Radix no visual do sistema (lista arredondada, sem caixa nativa do browser). */
export default function AppSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione',
  className,
  triggerClassName,
  disabled,
  allowEmpty = false,
}: AppSelectProps) {
  const normalized = value === '' && allowEmpty ? EMPTY : value;
  const items = options.map((o) =>
    o.value === '' && allowEmpty ? { ...o, value: EMPTY } : o
  );

  return (
    <Select
      value={normalized || undefined}
      onValueChange={(v) => onChange(v === EMPTY ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-[42px] w-full rounded-md border-input bg-background text-sm focus:ring-2 focus:ring-ring/20 focus:ring-offset-0',
          triggerClassName,
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="z-[300] rounded-lg border-border shadow-lg" position="popper">
        {items.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            disabled={o.disabled}
            className="rounded-md cursor-pointer focus:bg-primary/10 focus:text-foreground"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
