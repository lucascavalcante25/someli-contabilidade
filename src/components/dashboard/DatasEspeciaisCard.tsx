import { useMemo } from 'react';
import { Cake } from 'lucide-react';
import EventoDataEspecial from '@/components/dashboard/EventoDataEspecial';
import { useDatasEspeciais } from '@/hooks/useDatasEspeciais';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Lista "Datas especiais" (sugestão do Claude): hoje e os próximos 7 dias, com o atalho de parabéns.
 * Busca o mês atual e o seguinte para não perder a virada do mês.
 */
export default function DatasEspeciaisCard({ hoje = new Date(), className }: { hoje?: Date; className?: string }) {
  const proximo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const atual = useDatasEspeciais(hoje.getFullYear(), hoje.getMonth() + 1);
  const seguinte = useDatasEspeciais(proximo.getFullYear(), proximo.getMonth() + 1);
  const inicio = iso(hoje);
  const fim = iso(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7));

  const eventos = useMemo(
    () => [...(atual.data ?? []), ...(seguinte.data ?? [])].filter((e) => e.data >= inicio && e.data <= fim),
    [atual.data, seguinte.data, inicio, fim],
  );
  const carregando = atual.isLoading || seguinte.isLoading;
  const erro = atual.error ?? seguinte.error;

  return (
    <section aria-label="Datas especiais" className={`card-surface min-w-0 p-4 sm:p-5 ${className ?? ''}`}>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Cake className="h-4 w-4 text-pink-600" aria-hidden />
        Datas especiais
        <span className="text-xs font-normal text-muted-foreground">hoje e próximos 7 dias</span>
      </h2>
      {carregando ? (
        <p className="mt-3 text-sm text-muted-foreground">Carregando…</p>
      ) : erro ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-destructive">
          <span>{erro instanceof Error ? erro.message : 'Não foi possível carregar as datas.'}</span>
          <button type="button" className="rounded border border-border px-2 py-0.5 text-xs text-foreground hover:bg-muted"
            onClick={() => { void atual.refetch(); void seguinte.refetch(); }}>
            Tentar de novo
          </button>
        </div>
      ) : eventos.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma data especial nos próximos 7 dias.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {eventos.map((e) => <EventoDataEspecial key={`${e.data}-${e.tipo}-${e.clienteId}`} evento={e} mostrarData />)}
        </ul>
      )}
    </section>
  );
}
