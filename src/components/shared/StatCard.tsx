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
    <div className={cn('card-surface card-surface-hover p-5', borderClass)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="label-text">{label}</p>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-lg bg-muted p-2.5">
          <Icon size={18} className="text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
