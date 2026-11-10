import { AlertCircle, ArrowRight, CalendarClock, CalendarDays, Hourglass, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { andamentoDoMes, resumoDeHoje } from '@/lib/dashboardResumo';
import { rotuloCompetencia, type OcorrenciaPainel } from '@/lib/painelMensal';
import { cn } from '@/lib/utils';

interface DashboardOperacaoProps {
  /** Atividades da competência de trabalho (as mesmas do Painel do mês). */
  ocorrencias: OcorrenciaPainel[];
  competencia: string;
  hoje: string;
  carregando: boolean;
  erro: string | null;
  onTentarDeNovo: () => void;
}

/**
 * "Hoje" e "Andamento do mês": substituem Meu Trabalho, Visão gerencial e a Fila de trabalho.
 * Devolve os dois cartões soltos para a página pôr na mesma linha que Inadimplentes.
 */
export default function DashboardOperacao({ ocorrencias, competencia, hoje, carregando, erro, onTentarDeNovo }: DashboardOperacaoProps) {
  const navigate = useNavigate();
  const abrirPainel = () => navigate('/painel-mensal');

  if (carregando) {
    return (
      <div className="card-surface flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground lg:col-span-2">
        <Loader2 size={16} className="animate-spin" /> Carregando as atividades do mês...
      </div>
    );
  }
  if (erro) {
    return (
      <div className="card-surface space-y-3 p-6 text-center lg:col-span-2">
        <p className="text-sm text-destructive">{erro}</p>
        <button type="button" onClick={onTentarDeNovo} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted">
          Tentar de novo
        </button>
      </div>
    );
  }

  const r = resumoDeHoje(ocorrencias, hoje);
  const a = andamentoDoMes(ocorrencias);
  const numeros = [
    { rotulo: 'Atrasadas', valor: r.atrasadas, icone: AlertCircle, destaque: r.atrasadas > 0 ? 'text-destructive' : '' },
    { rotulo: 'Vencem hoje', valor: r.vencemHoje, icone: CalendarClock, destaque: r.vencemHoje > 0 ? 'text-amber-600 dark:text-amber-400' : '' },
    { rotulo: 'Próximos 7 dias', valor: r.proximos7Dias, icone: CalendarDays, destaque: '' },
    { rotulo: 'Aguardando cliente', valor: r.aguardandoCliente, icone: Hourglass, destaque: '' },
  ];

  return (
    <>
      <section aria-label="Hoje" className="card-surface min-w-0 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Hoje</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          {numeros.map(({ rotulo, valor, icone: Icone, destaque }) => (
            <button
              key={rotulo}
              type="button"
              onClick={abrirPainel}
              aria-label={`${rotulo}: ${valor}. Abrir Painel do mês`}
              className="group rounded-lg border border-border/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icone size={13} aria-hidden /> {rotulo}
              </span>
              <span className={cn('mt-1 block text-2xl font-semibold tabular-nums', destaque)}>{valor}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Andamento do mês" className="card-surface flex min-w-0 flex-col p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Andamento do mês</h2>
          <span className="text-xs text-muted-foreground">{rotuloCompetencia(competencia)}</span>
        </div>
        <p className="mt-3 text-sm">
          <span className="text-2xl font-semibold tabular-nums">{a.percentual}%</span>
          <span className="ml-2 text-muted-foreground">{a.feitas} de {a.total} feitas</span>
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-emerald-600 transition-all" style={{ width: `${a.percentual}%` }} />
        </div>
        {a.setores.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {a.setores.map((s) => (
              <li key={s.setor} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {s.rotulo} <span className="font-medium tabular-nums text-foreground">{s.percentual}%</span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={abrirPainel}
          className="mt-auto inline-flex items-center gap-1 self-start pt-4 text-sm font-medium text-primary hover:underline"
        >
          Abrir Painel do mês <ArrowRight size={14} />
        </button>
      </section>
    </>
  );
}
