import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/data/mockData';
import { cn } from '@/lib/utils';

export interface ResumoFinanceiroMes {
  receitaTotal: number;
  receitaRecebida: number;
  receitaPendente: number;
  despesaTotal: number;
  saldo: number;
}

interface DashboardFinanceiroProps {
  resumo: ResumoFinanceiroMes | null;
  grafico: { mes: string; receita: number; despesa: number }[];
  mascarar: (valor: string) => string;
}

/** Financeiro do mês (só para quem vê o financeiro): quatro números e Receita × Despesa no ano. */
export default function DashboardFinanceiro({ resumo, grafico, mascarar }: DashboardFinanceiroProps) {
  const numeros = resumo
    ? [
        { rotulo: 'Receita do mês', valor: resumo.receitaTotal, cor: '' },
        { rotulo: 'Recebido', valor: resumo.receitaRecebida, cor: 'text-emerald-700 dark:text-emerald-400' },
        { rotulo: 'Em aberto', valor: resumo.receitaPendente, cor: resumo.receitaPendente > 0 ? 'text-amber-700 dark:text-amber-400' : '' },
        { rotulo: 'Saldo', valor: resumo.saldo, cor: resumo.saldo < 0 ? 'text-destructive' : '' },
      ]
    : [];

  return (
    <section aria-label="Financeiro do mês" className="card-surface p-4 sm:p-5">
      <h2 className="text-sm font-semibold">Financeiro do mês</h2>
      {!resumo ? (
        <p className="mt-3 text-sm text-muted-foreground">Não foi possível carregar o financeiro.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {numeros.map((n) => (
            <div key={n.rotulo} className="min-w-0 rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">{n.rotulo}</p>
              <p className={cn('mt-1 truncate text-lg font-semibold tabular-nums', n.cor)}>{mascarar(formatCurrency(n.valor))}</p>
            </div>
          ))}
        </div>
      )}
      {grafico.length > 0 && (
        <div className="mt-5 min-w-0">
          <p className="mb-2 text-xs text-muted-foreground">Receita × Despesa no ano</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={grafico} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={48}
                tickFormatter={(v: number) => mascarar(v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip formatter={(v: number) => mascarar(formatCurrency(v))} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="despesa" name="Despesa" fill="hsl(var(--muted-foreground) / 0.45)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
