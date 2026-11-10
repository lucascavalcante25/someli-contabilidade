import { useMemo, useState } from 'react';
import { CheckSquare, Clock, KeyRound } from 'lucide-react';
import PainelCartaoDialog from '@/components/painel/PainelCartaoDialog';
import { useArrastarParaRolar } from '@/hooks/useArrastarParaRolar';
import type { MatrizPainel, OcorrenciaPainel, Segmento } from '@/lib/painelMensal';
import { agruparEmListas, segmentoDe, temAtrasada, type ListaQuadro } from '@/lib/painelQuadro';
import { cn } from '@/lib/utils';

interface PainelQuadroProps {
  matriz: MatrizPainel;
  /** Data de hoje (yyyy-MM-dd) para destacar atrasadas. */
  hoje: string;
  salvando: Set<number>;
  onAlternar: (ocorrencia: OcorrenciaPainel, concluir: boolean) => void;
  contagens?: Record<number, { acessos: number; anotacoes: number }>;
  onAbrirCartao?: () => void;
  /** Competência do painel aberto (yyyy-MM), para o item novo do checklist cair no mês certo. */
  competencia: string;
  /** Um item foi adicionado ao checklist de um cliente: recarregar o painel. */
  onItemAdicionado?: () => void;
  /** Segmento de cada cliente: A fazer e Em andamento ficam separados por segmento, como no Trello. */
  segmentos?: Record<number, Segmento>;
  /**
   * Arrastar o cartão para a lista do outro segmento (ou trocar no cartão aberto) grava o segmento do cliente,
   * valendo para este mês e os próximos. Sem ele (sem permissão de editar cliente), o cartão não arrasta.
   */
  onMoverSegmento?: (clienteId: number, segmento: Segmento) => void;
}

const COR_LISTA: Record<string, string> = {
  'a-fazer': 'bg-slate-400',
  'em-andamento': 'bg-amber-500',
  concluidos: 'bg-emerald-600',
};

/** Painel V2: quadro como o Trello. Cada cliente é um cartão; o cartão muda de lista conforme o checklist anda. */
export default function PainelQuadro({ matriz, hoje, salvando, onAlternar, contagens, onAbrirCartao, competencia, onItemAdicionado, segmentos = {}, onMoverSegmento }: PainelQuadroProps) {
  const [abertoId, setAbertoId] = useState<number | null>(null);
  const listas = useMemo(() => agruparEmListas(matriz.linhas, segmentos), [matriz.linhas, segmentos]);
  // Sempre a linha atual da matriz: o cartão aberto reflete na hora o que foi marcado
  const aberto = abertoId == null ? null : matriz.linhas.find((l) => l.clienteId === abertoId) ?? null;
  const arrastar = useArrastarParaRolar<HTMLDivElement>();
  const [alvoId, setAlvoId] = useState<string | null>(null);
  const podeMover = !!onMoverSegmento;

  const aceitaSoltar = (lista: ListaQuadro) => podeMover && lista.segmento != null;
  const soltar = (lista: ListaQuadro, e: React.DragEvent) => {
    e.preventDefault();
    setAlvoId(null);
    const clienteId = Number(e.dataTransfer.getData('text/plain'));
    if (!clienteId || !lista.segmento || !onMoverSegmento) return;
    if (segmentoDe(clienteId, segmentos) === lista.segmento && segmentos[clienteId]) return;
    onMoverSegmento(clienteId, lista.segmento);
  };

  return (
    <>
      <div
        {...arrastar}
        className="flex max-w-full snap-x gap-3 overflow-x-auto overscroll-x-contain p-3 cursor-arrastar sm:snap-none"
        title={podeMover ? 'Arraste o cartão para a lista do outro segmento; arraste o fundo para os lados' : 'Arraste para os lados para ver as outras listas'}
      >
        {listas.map((lista) => (
          <section
            key={lista.id}
            aria-label={`Lista ${lista.titulo}`}
            onDragOver={(e) => {
              if (!aceitaSoltar(lista)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (alvoId !== lista.id) setAlvoId(lista.id);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAlvoId((a) => (a === lista.id ? null : a));
            }}
            onDrop={(e) => { if (aceitaSoltar(lista)) soltar(lista, e); }}
            className={cn(
              'flex max-h-[calc(100vh-300px)] min-h-[200px] w-[280px] shrink-0 snap-start flex-col rounded-xl bg-muted/60 transition-colors sm:w-[300px]',
              alvoId === lista.id && 'bg-primary/10 ring-2 ring-primary/40',
            )}
          >
            <header className="flex items-center gap-2 px-3 pb-2 pt-3">
              <span className={cn('h-2.5 w-2.5 rounded-full', COR_LISTA[lista.etapa])} aria-hidden />
              <h2 className="min-w-0 text-sm font-semibold leading-tight">
                {lista.titulo.split(' · ')[0]}
                {lista.titulo.includes(' · ') && (
                  <span className="block truncate text-xs font-normal text-muted-foreground">{lista.titulo.split(' · ')[1]}</span>
                )}
              </h2>
              <span className="ml-auto rounded-full bg-card px-2 text-xs tabular-nums text-muted-foreground">{lista.cartoes.length}</span>
            </header>
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-3">
              {lista.cartoes.length === 0 && (
                <li className="px-2 py-6 text-center text-xs text-muted-foreground">Nenhum cliente aqui.</li>
              )}
              {lista.cartoes.map((l) => {
                const contagem = contagens?.[l.clienteId];
                const temFicha = !!contagem && (contagem.acessos > 0 || contagem.anotacoes > 0);
                const atrasada = temAtrasada(l, hoje);
                const completo = l.total > 0 && l.feitas === l.total;
                const pct = l.total ? Math.round((l.feitas / l.total) * 100) : 100;
                return (
                  <li
                    key={l.clienteId}
                    draggable={podeMover || undefined}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(l.clienteId));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setAlvoId(null)}
                    className={cn(podeMover && 'cursor-grab active:cursor-grabbing')}
                  >
                    <button
                      type="button"
                      aria-label={`Abrir cartão de ${l.clienteNome}, ${l.feitas} de ${l.total} feitas`}
                      onClick={() => {
                        onAbrirCartao?.();
                        setAbertoId(l.clienteId);
                      }}
                      className="w-full rounded-lg border border-border/60 bg-card p-3 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <p className="break-words text-sm font-medium leading-snug">{l.clienteNome}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs tabular-nums',
                            completo ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <CheckSquare size={12} aria-hidden />
                          {l.feitas}/{l.total}
                        </span>
                        {atrasada && (
                          <span className="inline-flex items-center gap-1 rounded bg-destructive px-1.5 py-0.5 text-xs text-destructive-foreground">
                            <Clock size={12} aria-hidden />
                            Atrasada
                          </span>
                        )}
                        {temFicha && <KeyRound size={13} className="text-primary" aria-label="Tem acessos ou anotações" />}
                        {!segmentos[l.clienteId] && (
                          <span className="rounded border border-dashed border-muted-foreground/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            Segmento a confirmar
                          </span>
                        )}
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                        <div className={cn('h-full', completo ? 'bg-emerald-600' : 'bg-primary')} style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <PainelCartaoDialog
        linha={aberto}
        colunas={matriz.colunas}
        competencia={competencia}
        hoje={hoje}
        salvando={salvando}
        onAlternar={onAlternar}
        onItemAdicionado={() => onItemAdicionado?.()}
        segmento={aberto ? segmentoDe(aberto.clienteId, segmentos) : null}
        segmentoDefinido={aberto ? !!segmentos[aberto.clienteId] : false}
        onMoverSegmento={onMoverSegmento}
        onFechar={() => setAbertoId(null)}
      />
    </>
  );
}
