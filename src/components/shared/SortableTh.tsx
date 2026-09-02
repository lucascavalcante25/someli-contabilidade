import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortRule<K extends string = string> = { key: K; dir: 'asc' | 'desc' };

interface SortableThProps<K extends string> {
  label: string;
  sortKey: K;
  sortRules: SortRule<K>[];
  onSort: (key: K, multi: boolean) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export default function SortableTh<K extends string>({
  label,
  sortKey,
  sortRules,
  onSort,
  align = 'left',
  className = '',
}: SortableThProps<K>) {
  const idx = sortRules.findIndex((r) => r.key === sortKey);
  const active = idx >= 0;
  const dir = active ? sortRules[idx].dir : null;
  const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  const textAlign = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <th className={`label-text px-3 sm:px-4 py-2.5 ${textAlign} whitespace-nowrap ${className}`}>
      <button
        type="button"
        onClick={(e) => onSort(sortKey, e.shiftKey)}
        className={`inline-flex items-center gap-1.5 max-w-full group transition-colors ${alignClass} ${
          active ? 'text-foreground' : 'text-inherit hover:text-foreground'
        }`}
        title="Clique para ordenar · Shift+clique para combinar"
      >
        <span className="truncate">{label}</span>
        {active ? (
          <span className="inline-flex items-center gap-0.5 shrink-0 text-primary">
            {dir === 'asc' ? <ArrowUp size={13} strokeWidth={2.5} /> : <ArrowDown size={13} strokeWidth={2.5} />}
            {sortRules.length > 1 ? (
              <span className="text-[9px] font-bold tabular-nums">{idx + 1}</span>
            ) : null}
          </span>
        ) : (
          <ArrowUpDown size={13} strokeWidth={2.25} className="opacity-55 group-hover:opacity-100 shrink-0 text-primary" />
        )}
      </button>
    </th>
  );
}
