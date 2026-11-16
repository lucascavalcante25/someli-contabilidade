import { ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { andamentoDoMes } from '@/lib/dashboardResumo';
import { rotuloCompetencia, type OcorrenciaPainel } from '@/lib/painelMensal';

interface DashboardOperacaoProps {
  /** Atividades da competência de trabalho (as mesmas do Painel do mês). */
  ocorrencias: OcorrenciaPainel[];
  competencia: string;
  carregando: boolean;
  erro: string | null;
  onTentarDeNovo: () => void;
}

/**
 * "Andamento do mês" (mesmos dados do Painel do mês). O card "Hoje" saiu a pedido do Lucas:
 * a linha agora é Andamento, Inadimplentes e o calendário de datas especiais.
 */
export default function DashboardOperacao({ ocorrencias, competencia, carregando, erro, onTentarDeNovo }: DashboardOperacaoProps) {
  const navigate = useNavigate();
  const abrirPainel = () => navigate('/painel-mensal');

  if (carregando) {
    return (
      <div className="card-surface flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Carregando as atividades do mês...
      </div>
    );
  }
  if (erro) {
    return (
      <div className="card-surface space-y-3 p-6 text-center">
        <p className="text-sm text-destructive">{erro}</p>
        <button type="button" onClick={onTentarDeNovo} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted">
          Tentar de novo
        </button>
      </div>
    );
  }

  const a = andamentoDoMes(ocorrencias);

  return (
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
  );
}
