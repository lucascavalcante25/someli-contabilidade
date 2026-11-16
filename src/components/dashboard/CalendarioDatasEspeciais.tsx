import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarHeart, ChevronLeft, ChevronRight } from 'lucide-react';
import EventoDataEspecial from '@/components/dashboard/EventoDataEspecial';
import { COR_TIPO, ROTULO_TIPO } from '@/components/dashboard/datasEspeciaisCores';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDatasEspeciais } from '@/hooks/useDatasEspeciais';
import { montarCalendario, type DiaCalendario, type TipoDataEspecial } from '@/lib/datasEspeciais';
import { cn } from '@/lib/utils';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const TIPOS: TipoDataEspecial[] = ['ANIVERSARIO_RESPONSAVEL', 'DIA_PROFISSAO', 'ANIVERSARIO_EMPRESA'];

/** Cor de fundo do dia: a do tipo, ou neutra quando há mais de um tipo no mesmo dia. */
function fundoDoDia(dia: DiaCalendario): string {
  const tipos = new Set(dia.eventos.map((e) => e.tipo));
  if (tipos.size > 1) return 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100';
  if (tipos.has('ANIVERSARIO_RESPONSAVEL')) return 'bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-100';
  if (tipos.has('DIA_PROFISSAO')) return 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100';
  return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100';
}

/**
 * Calendário do mês no canto do Dashboard (ideia do Lucas): dias com aniversário ou dia de profissão
 * ficam coloridos; passar o mouse ou clicar abre o balão com quem comemora e o atalho de parabéns.
 */
export default function CalendarioDatasEspeciais({ hoje = new Date(), className }: { hoje?: Date; className?: string }) {
  const [mesAtual, setMesAtual] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 });
  const [aberto, setAberto] = useState<string | null>(null);
  const fechar = useRef<number | undefined>(undefined);
  const consulta = useDatasEspeciais(mesAtual.ano, mesAtual.mes);
  const eventos = useMemo(() => consulta.data ?? [], [consulta.data]);
  const semanas = useMemo(() => montarCalendario(mesAtual.ano, mesAtual.mes, eventos), [mesAtual, eventos]);
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  useEffect(() => () => window.clearTimeout(fechar.current), []);

  const mudarMes = (delta: number) => {
    setAberto(null);
    setMesAtual(({ ano, mes }) => {
      const d = new Date(ano, mes - 1 + delta, 1);
      return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
    });
  };
  const abrirAoPassar = (iso: string) => {
    window.clearTimeout(fechar.current);
    setAberto(iso);
  };
  const fecharAoSair = () => {
    window.clearTimeout(fechar.current);
    fechar.current = window.setTimeout(() => setAberto(null), 200);
  };

  return (
    <section aria-label="Calendário de datas especiais" className={cn('card-surface min-w-0 p-4 sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          <CalendarHeart className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="truncate">{`${MESES[mesAtual.mes - 1]} ${mesAtual.ano}`}</span>
        </h2>
        <div className="flex shrink-0 items-center">
          <button type="button" aria-label="Mês anterior" onClick={() => mudarMes(-1)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Próximo mês" onClick={() => mudarMes(1)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div role="grid" aria-label={`Dias de ${MESES[mesAtual.mes - 1]}`} className="mt-2 grid grid-cols-7 gap-0.5 text-center text-xs">
        {SEMANA.map((d, i) => (
          <span key={`${d}-${i}`} className="py-0.5 text-[10px] font-medium text-muted-foreground" aria-hidden>{d}</span>
        ))}
        {semanas.flat().map((dia, i) => {
          if (!dia) return <span key={`vazio-${i}`} />;
          const ehHoje = dia.iso === hojeIso;
          const base = cn(
            'flex h-7 w-full items-center justify-center rounded-md tabular-nums',
            ehHoje && 'ring-1 ring-primary font-semibold',
          );
          if (!dia.eventos.length) {
            return <span key={dia.iso} className={cn(base, 'text-muted-foreground')}>{dia.dia}</span>;
          }
          const total = dia.eventos.length;
          return (
            <Popover key={dia.iso} open={aberto === dia.iso} onOpenChange={(abrir) => setAberto(abrir ? dia.iso : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`${dia.dia} de ${MESES[mesAtual.mes - 1].toLowerCase()}: ${total} ${total === 1 ? 'data especial' : 'datas especiais'}`}
                  onMouseEnter={() => abrirAoPassar(dia.iso)}
                  onMouseLeave={fecharAoSair}
                  className={cn(base, fundoDoDia(dia), 'relative font-semibold transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
                >
                  {dia.dia}
                  <span className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5" aria-hidden>
                    {[...new Set(dia.eventos.map((e) => e.tipo))].map((t) => (
                      <span key={t} className={cn('h-1 w-1 rounded-full', COR_TIPO[t].ponto)} />
                    ))}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[min(20rem,calc(100vw-2rem))] p-3"
                onMouseEnter={() => window.clearTimeout(fechar.current)}
                onMouseLeave={fecharAoSair}
              >
                <p className="text-xs font-semibold text-muted-foreground">
                  {`${String(dia.dia).padStart(2, '0')}/${String(mesAtual.mes).padStart(2, '0')}`}
                </p>
                <ul className="divide-y divide-border">
                  {dia.eventos.map((e) => <EventoDataEspecial key={`${e.tipo}-${e.profissao ?? ''}-${e.clienteId ?? 'geral'}`} evento={e} />)}
                </ul>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>

      {consulta.isLoading && <p className="mt-2 text-xs text-muted-foreground">Carregando datas…</p>}
      {consulta.isError && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-destructive">
          <span>{consulta.error instanceof Error ? consulta.error.message : 'Não foi possível carregar as datas.'}</span>
          <button type="button" onClick={() => void consulta.refetch()} className="rounded border border-border px-2 py-0.5 text-foreground hover:bg-muted">
            Tentar de novo
          </button>
        </div>
      )}
      {consulta.isSuccess && eventos.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Nenhuma data especial neste mês.
        </p>
      )}
      {eventos.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground" aria-label="Legenda">
          {TIPOS.map((t) => (
            <li key={t} className="flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-full', COR_TIPO[t].ponto)} aria-hidden />
              {ROTULO_TIPO[t]}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
