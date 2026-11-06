import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import AppSelect from '@/components/shared/AppSelect';
import FichaClienteAcessos from '@/components/clientes/FichaClienteAcessos';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PainelMensalTabela from '@/components/painel/PainelMensalTabela';
import { carregarContagens, CHAVE_CONTAGENS, type FichaContagem } from '@/lib/acessos';
import { correspondeBusca } from '@/lib/buscaClientes';
import {
  alterarConclusao,
  carregarPainel,
  carregarSegmentos,
  competenciaDeTrabalho,
  deslocarCompetencia,
  estaFeita,
  montarMatriz,
  rotuloCompetencia,
  type OcorrenciaPainel,
  type Segmento,
} from '@/lib/painelMensal';

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

const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function PainelMensal() {
  const [competencia, setCompetencia] = useState(competenciaDeTrabalho());
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaPainel[]>([]);
  const [segmentos, setSegmentos] = useState<Record<number, Segmento>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<Set<number>>(new Set());
  const [busca, setBusca] = useState('');
  const [setor, setSetor] = useState('');
  const [segmento, setSegmento] = useState('');
  const [soPendentes, setSoPendentes] = useState(false);
  const [ficha, setFicha] = useState<{ clienteId: number; clienteNome: string } | null>(null);
  const queryClient = useQueryClient();
  const contagensQuery = useQuery({
    queryKey: CHAVE_CONTAGENS,
    queryFn: () => carregarContagens().catch(() => [] as FichaContagem[]),
  });
  const contagens = useMemo(() => {
    const mapa: Record<number, FichaContagem> = {};
    for (const item of contagensQuery.data ?? []) mapa[item.clienteId] = item;
    return mapa;
  }, [contagensQuery.data]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [lista, segs] = await Promise.all([carregarPainel(competencia), carregarSegmentos().catch(() => ({}))]);
      setOcorrencias(lista);
      setSegmentos(segs);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar o painel');
    } finally {
      setCarregando(false);
    }
  }, [competencia]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const matriz = useMemo(() => {
    const filtradas = ocorrencias.filter(
      (o) =>
        (!setor || o.setor === setor) &&
        (!segmento || segmentos[o.clienteId] === segmento) &&
        correspondeBusca({ razaoSocial: o.clienteNome, nomeFantasia: o.clienteNomeFantasia ?? undefined, cnpj: '' }, busca)
    );
    const m = montarMatriz(filtradas);
    return soPendentes ? { ...m, linhas: m.linhas.filter((l) => l.feitas < l.total) } : m;
  }, [ocorrencias, setor, segmento, segmentos, busca, soPendentes]);

  const alternar = async (o: OcorrenciaPainel, concluir: boolean) => {
    const anterior = o;
    setOcorrencias((lista) => lista.map((x) => (x.id === o.id ? { ...x, status: concluir ? 'CONCLUIDA' : 'PENDENTE' } : x)));
    setSalvando((s) => new Set(s).add(o.id));
    try {
      const atualizada = await alterarConclusao(o.id, concluir);
      setOcorrencias((lista) => lista.map((x) => (x.id === o.id ? { ...x, ...atualizada } : x)));
    } catch (e) {
      setOcorrencias((lista) => lista.map((x) => (x.id === o.id ? anterior : x)));
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando((s) => {
        const n = new Set(s);
        n.delete(o.id);
        return n;
      });
    }
  };

  const percentual = matriz.total ? Math.round((matriz.feitas / matriz.total) * 100) : 0;
  const atrasadas = ocorrencias.filter((o) => !estaFeita(o) && o.status !== 'NAO_APLICAVEL' && o.dataVencimento < hojeIso()).length;

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Painel do mês</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atividades de cada cliente na competência. Cada mês começa desmarcado; os anteriores ficam no histórico.
          </p>
        </div>
      </div>

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
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente..."
              className="w-full rounded-md border border-input bg-card py-2 pl-8 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
          </div>
          <AppSelect value={setor} onChange={setSetor} allowEmpty placeholder="Todos os setores" options={SETORES} />
          <AppSelect value={segmento} onChange={setSegmento} allowEmpty placeholder="Todos os segmentos" options={SEGMENTOS} />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={soPendentes} onCheckedChange={(v) => setSoPendentes(v === true)} />
            Só clientes com pendência
          </label>
        </div>
      </div>

      <div className="card-surface overflow-hidden max-w-full min-w-0">
        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 size={18} className="animate-spin" /> Carregando o painel...
          </div>
        ) : erro ? (
          <div className="space-y-3 py-12 text-center">
            <p className="text-sm text-destructive">{erro}</p>
            <button type="button" onClick={() => void carregar()} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-muted">
              Tentar de novo
            </button>
          </div>
        ) : matriz.linhas.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {ocorrencias.length === 0
              ? `Nenhuma atividade na competência ${rotuloCompetencia(competencia)}.`
              : 'Nenhum cliente com esses filtros.'}
          </p>
        ) : (
          <PainelMensalTabela
            matriz={matriz}
            hoje={hojeIso()}
            salvando={salvando}
            onAlternar={(o, c) => void alternar(o, c)}
            contagens={contagens}
            onAbrirFicha={(linha) => {
              void queryClient.invalidateQueries({ queryKey: CHAVE_CONTAGENS });
              setFicha(linha);
            }}
          />
        )}
      </div>
      <Dialog open={ficha != null} onOpenChange={(aberto) => { if (!aberto) setFicha(null); }}>
        <DialogContent className="flex max-h-[min(92vh,780px)] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-3 overflow-hidden p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>Ficha do cliente</DialogTitle>
            <DialogDescription className="truncate">{ficha?.clienteNome}</DialogDescription>
          </DialogHeader>
          {ficha && (
            <FichaClienteAcessos key={ficha.clienteId} clienteId={ficha.clienteId} clienteNome={ficha.clienteNome} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
