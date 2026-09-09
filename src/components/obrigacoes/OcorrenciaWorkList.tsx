import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import AppSelect from '@/components/shared/AppSelect';
import HintTooltip from '@/components/shared/HintTooltip';
import { isHttpUrl, setorMeta } from '@/lib/setorStyles';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

export interface OcorrenciaItem {
  id: number;
  clienteId: number;
  clienteNome?: string;
  obrigacaoNome?: string;
  urlPortal?: string | null;
  setor?: string;
  competencia?: string;
  dataVencimento?: string;
  status?: string;
}

const STATUS_OPTIONS = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'AGUARDANDO_CLIENTE', label: 'Aguardando cliente' },
  { value: 'CONCLUIDA', label: 'Concluída' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'ATRASADA', label: 'Atrasada' },
  { value: 'NAO_APLICAVEL', label: 'N/A' },
];

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split('-');
  return y && m && day ? `${day}/${m}/${y}` : iso;
}

function formatCompetencia(comp?: string) {
  if (!comp || !/^\d{4}-\d{2}$/.test(comp)) return comp || '—';
  const [y, m] = comp.split('-');
  return `${m}/${y}`;
}

function isAtrasada(item: OcorrenciaItem) {
  if (item.status === 'ATRASADA') return true;
  if (!item.dataVencimento) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(item.dataVencimento.slice(0, 10) + 'T12:00:00');
  return venc < hoje && !['CONCLUIDA', 'ENTREGUE', 'NAO_APLICAVEL'].includes(item.status || '');
}

type Filtro = 'urgentes' | 'proximas' | 'todas';

interface Props {
  atrasadas?: OcorrenciaItem[];
  proximas?: OcorrenciaItem[];
  onUpdated?: () => void;
  /** Modo simples (só uma lista), usado na ficha do cliente */
  items?: OcorrenciaItem[];
  emptyMessage?: string;
  showCliente?: boolean;
}

export default function OcorrenciaWorkList({
  atrasadas = [],
  proximas = [],
  items,
  emptyMessage = 'Nenhuma ocorrência.',
  showCliente = true,
  onUpdated,
}: Props) {
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [eventosId, setEventosId] = useState<number | null>(null);
  const [eventos, setEventos] = useState<any[]>([]);

  const modoPainel = items == null;
  const listaAtrasadas = modoPainel ? atrasadas : (items || []).filter(isAtrasada);
  const listaProximas = modoPainel ? proximas : (items || []).filter((i) => !isAtrasada(i));

  const [filtroManual, setFiltroManual] = useState<Filtro | null>(null);
  const filtro: Filtro =
    filtroManual ?? (listaAtrasadas.length > 0 ? 'urgentes' : 'proximas');

  const lista = useMemo(() => {
    if (!modoPainel) return items || [];
    if (filtro === 'urgentes') return listaAtrasadas;
    if (filtro === 'proximas') return listaProximas;
    return [...listaAtrasadas, ...listaProximas];
  }, [modoPainel, filtro, items, atrasadas, proximas, listaAtrasadas, listaProximas]);

  const atualizarStatus = async (id: number, status: string) => {
    setBusyId(id);
    try {
      const res = await apiFetch(`${API_BASE_URL}/ocorrencias/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Falha ao atualizar status');
      }
      toast.success('Status atualizado');
      onUpdated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar');
    } finally {
      setBusyId(null);
    }
  };

  const carregarEventos = async (id: number) => {
    if (eventosId === id) {
      setEventosId(null);
      setEventos([]);
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE_URL}/ocorrencias/${id}/eventos`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Falha ao carregar histórico');
      setEventos(await res.json());
      setEventosId(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro no histórico');
    }
  };

  const emptyText =
    filtro === 'urgentes'
      ? 'Nenhuma obrigação atrasada ou urgente na sua alçada.'
      : filtro === 'proximas'
        ? 'Nenhuma obrigação próxima nos próximos dias.'
        : emptyMessage;

  return (
    <div className="space-y-3">
      {modoPainel && (
        <div
          className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1"
          role="tablist"
          aria-label="Filtro de obrigações"
        >
          {(
            [
              { id: 'urgentes' as const, label: 'Urgentes', count: listaAtrasadas.length },
              { id: 'proximas' as const, label: 'Próximas', count: listaProximas.length },
              { id: 'todas' as const, label: 'Todas', count: listaAtrasadas.length + listaProximas.length },
            ]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={filtro === opt.id}
              onClick={() => setFiltroManual(opt.id)}
              className={cn(
                'rounded-md px-2 py-2 text-xs sm:text-sm font-medium transition-colors min-h-[40px]',
                filtro === opt.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
              <span className="ml-1 tabular-nums text-muted-foreground">({opt.count})</span>
            </button>
          ))}
        </div>
      )}

      {!lista.length ? (
        <p className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul
          className={cn(
            modoPainel
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
              : 'space-y-2'
          )}
          data-testid={modoPainel ? 'fila-grid' : 'fila-lista'}
        >
          {lista.map((o) => {
            const urgente = isAtrasada(o);
            const setor = setorMeta(o.setor);
            const portalOk = isHttpUrl(o.urlPortal);
            return (
              <li
                key={o.id}
                className={cn(
                  'flex flex-col rounded-lg border bg-background p-3 min-w-0',
                  urgente ? 'border-destructive/30 bg-destructive/[0.03]' : 'border-border/70'
                )}
              >
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate max-w-full">
                    {o.obrigacaoNome || 'Obrigação'}
                  </p>
                  {urgente && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                      Urgente
                    </span>
                  )}
                  {setor && (
                    <HintTooltip content={`Setor responsável: ${setor.label}`}>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                          setor.className
                        )}
                      >
                        {setor.label}
                      </span>
                    </HintTooltip>
                  )}
                  {portalOk && (
                    <HintTooltip content={`Abrir portal de ${o.obrigacaoNome || 'obrigação'}`}>
                      <a
                        href={o.urlPortal!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10"
                      >
                        <ExternalLink size={11} aria-hidden />
                        Portal
                      </a>
                    </HintTooltip>
                  )}
                </div>

                {showCliente && (
                  <HintTooltip content="Abrir ficha do cliente">
                    <button
                      type="button"
                      className="mt-2 block w-full truncate text-left text-sm font-medium text-primary underline-offset-2 hover:underline"
                      onClick={() => navigate(`/clientes/${o.clienteId}`)}
                    >
                      {o.clienteNome || `Cliente #${o.clienteId}`}
                    </button>
                  </HintTooltip>
                )}

                <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  <p>
                    Venc. <strong className="font-medium text-foreground">{formatDate(o.dataVencimento)}</strong>
                  </p>
                  <p>
                    Comp. <strong className="font-medium text-foreground">{formatCompetencia(o.competencia)}</strong>
                  </p>
                </div>

                <div className="mt-auto pt-3 space-y-1.5">
                  <HintTooltip content="Altere o andamento desta obrigação">
                    <div className="w-full">
                      <AppSelect
                        value={o.status || 'PENDENTE'}
                        onChange={(v) => void atualizarStatus(o.id, v)}
                        options={STATUS_OPTIONS}
                        disabled={busyId === o.id}
                        triggerClassName="h-9 w-full text-xs"
                      />
                    </div>
                  </HintTooltip>
                  <button
                    type="button"
                    className="w-full min-h-[32px] text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    onClick={() => void carregarEventos(o.id)}
                  >
                    {eventosId === o.id ? 'Ocultar histórico' : 'Ver histórico'}
                  </button>
                </div>

                {eventosId === o.id && (
                  <ul className="mt-2 max-h-28 overflow-y-auto space-y-1 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                    {eventos.length === 0 && <li>Sem eventos registrados.</li>}
                    {eventos.map((ev) => (
                      <li key={ev.id}>
                        {ev.createdAt?.slice?.(0, 16)?.replace('T', ' ') || ''} — {ev.mensagem || ev.tipoEvento}
                        {ev.usuarioNome ? ` (${ev.usuarioNome})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
