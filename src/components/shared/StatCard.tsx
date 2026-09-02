import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: 'primary' | 'success' | 'destructive' | 'warning';
  subtitle?: string;
}

export default function StatCard({ label, value, icon: Icon, accent = 'primary', subtitle }: StatCardProps) {
  const borderClass = {
    primary: 'stat-border-primary',
    success: 'stat-border-success',
    destructive: 'stat-border-destructive',
    warning: 'stat-border-warning',
  }[accent];

  return (
    <div className={cn('card-surface card-surface-hover p-4 sm:p-5 min-w-0', borderClass)}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="label-text truncate">{label}</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight tabular-nums break-all sm:break-normal">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-lg bg-muted p-2 shrink-0">
          <Icon size={18} className="text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
