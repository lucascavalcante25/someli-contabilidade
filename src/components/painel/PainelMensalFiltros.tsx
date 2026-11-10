import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import AppSelect from '@/components/shared/AppSelect';
import { Checkbox } from '@/components/ui/checkbox';
import type { PainelMensalEstado } from '@/hooks/usePainelMensal';
import { deslocarCompetencia, rotuloCompetencia } from '@/lib/painelMensal';

const SETORES = [
  { value: '', label: 'Todos os setores' },
  { value: 'FISCAL', label: 'Fiscal' },
  { value: 'DEPARTAMENTO_PESSOAL', label: 'Pessoal' },
  { value: 'CONTABIL', label: 'Contábil' },
  { value: 'SOCIETARIO', label: 'Societário' },
];
const SEGMENTOS = [
  { value: '', label: 'Todos os segmentos' },
  { value: 'SERVICOS', label: 'Serviços' },
  { value: 'COMERCIO_INDUSTRIA', label: 'Comércio e Indústria' },
];

/** Competência, andamento e filtros do Painel do mês (iguais no V1 e no V2). */
export function PainelMensalFiltros({ painel }: { painel: PainelMensalEstado }) {
  const { competencia, setCompetencia, matriz, percentual, atrasadas } = painel;
  return (
    <div className="card-surface p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Mês anterior" onClick={() => setCompetencia((c) => deslocarCompetencia(c, -1))}
            className="rounded-md border border-input p-2 hover:bg-muted">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[150px] text-center text-sm font-semibold">Competência {rotuloCompetencia(competencia)}</span>
          <button type="button" aria-label="Próximo mês" onClick={() => setCompetencia((c) => deslocarCompetencia(c, 1))}
            className="rounded-md border border-input p-2 hover:bg-muted">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{matriz.feitas}</span> de {matriz.total} feitas ({percentual}%)
          {atrasadas > 0 && <span className="ml-2 font-medium text-destructive">· {atrasadas} atrasada(s)</span>}
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-emerald-600 transition-all" style={{ width: `${percentual}%` }} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={painel.busca} onChange={(e) => painel.setBusca(e.target.value)} placeholder="Buscar cliente..."
            className="w-full rounded-md border border-input bg-card py-2 pl-8 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
        </div>
        <AppSelect value={painel.setor} onChange={painel.setSetor} allowEmpty placeholder="Todos os setores" options={SETORES} />
        <AppSelect value={painel.segmento} onChange={painel.setSegmento} allowEmpty placeholder="Todos os segmentos" options={SEGMENTOS} />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={painel.soPendentes} onCheckedChange={(v) => painel.setSoPendentes(v === true)} />
          Só clientes com pendência
        </label>
      </div>
    </div>
  );
}

/** Carregando, erro (com tentar de novo) e vazio; quando há dados, mostra o conteúdo. */
export function PainelMensalEstados({ painel, children }: { painel: PainelMensalEstado; children: React.ReactNode }) {
  if (painel.carregando) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 size={18} className="animate-spin" /> Carregando o painel...
      </div>
    );
  }
  if (painel.erro) {
    return (
      <div className="space-y-3 py-12 text-center">
        <p className="text-sm text-destructive">{painel.erro}</p>
        <button type="button" onClick={() => void painel.carregar()} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted">
          Tentar de novo
        </button>
      </div>
    );
  }
  if (painel.matriz.linhas.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {painel.ocorrencias.length === 0
          ? `Nenhuma atividade na competência ${rotuloCompetencia(painel.competencia)}.`
          : 'Nenhum cliente com esses filtros.'}
      </p>
    );
  }
  return <>{children}</>;
}
