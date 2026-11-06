import { Checkbox } from '@/components/ui/checkbox';
import HintTooltip from '@/components/shared/HintTooltip';
import { cn } from '@/lib/utils';
import { useArrastarParaRolar } from '@/hooks/useArrastarParaRolar';
import { estaFeita, NAO_APLICAVEL, type MatrizPainel, type OcorrenciaPainel } from '@/lib/painelMensal';

interface PainelMensalTabelaProps {
  matriz: MatrizPainel;
  /** Data de hoje (yyyy-MM-dd) para destacar atrasadas. */
  hoje: string;
  salvando: Set<number>;
  onAlternar: (ocorrencia: OcorrenciaPainel, concluir: boolean) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

function quandoFeito(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function descricao(o: OcorrenciaPainel, clienteNome: string, hoje: string): string {
  const titulo = `${o.obrigacaoNome} · ${clienteNome}`;
  const venc = o.dataVencimento ? ` · vence ${o.dataVencimento.slice(8, 10)}/${o.dataVencimento.slice(5, 7)}` : '';
  if (estaFeita(o)) {
    return `${titulo}: feito por ${o.concluidaPorNome ?? 'alguém'} em ${quandoFeito(o.concluidaEm)}`;
  }
  const atrasada = o.dataVencimento && o.dataVencimento < hoje ? ' · atrasada' : '';
  return `${titulo}: pendente${venc}${atrasada}`;
}

/** Grade cliente × atividade da competência. Uma caixa por atividade; nada é "desmarcado" na virada do mês. */
export default function PainelMensalTabela({ matriz, hoje, salvando, onAlternar }: PainelMensalTabelaProps) {
  // Arrastar com o mouse em qualquer ponto rola para os lados; altura limitada deixa a barra sempre visível
  const arrastar = useArrastarParaRolar<HTMLDivElement>();
  return (
    <div
      {...arrastar}
      className="max-w-full max-h-[calc(100vh-280px)] min-h-[320px] overflow-auto cursor-arrastar select-none"
      title="Arraste para os lados para ver todas as atividades"
    >
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="label-text sticky left-0 top-0 z-30 bg-muted px-3 py-2.5 text-left min-w-[150px]">Cliente</th>
            <th className="label-text sticky top-0 z-20 bg-muted px-2 py-2.5 text-center">Feito</th>
            {matriz.colunas.map((c) => (
              <th key={c} className="label-text sticky top-0 z-20 bg-muted px-2 py-2.5 text-center align-bottom min-w-[84px] max-w-[110px]">
                <span className="block whitespace-normal leading-tight">{c}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matriz.linhas.map((l) => (
            <tr key={l.clienteId} className="hover:bg-muted/30">
              <td className="sticky left-0 z-10 border-t border-border bg-card px-3 py-2 font-medium max-w-[180px]">
                <span className="block truncate">{l.clienteNome}</span>
              </td>
              <td className="border-t border-border px-2 py-2 text-center tabular-nums">
                <span className={cn('text-xs font-semibold', l.total > 0 && l.feitas === l.total ? 'text-emerald-600' : 'text-muted-foreground')}>
                  {l.feitas}/{l.total}
                </span>
              </td>
              {matriz.colunas.map((c) => {
                const o = l.celulas[c];
                if (!o) {
                  return <td key={c} className="border-t border-border px-2 py-2 text-center text-muted-foreground/40">—</td>;
                }
                if (o.status === NAO_APLICAVEL) {
                  return <td key={c} className="border-t border-border px-2 py-2 text-center text-[10px] text-muted-foreground">N/A</td>;
                }
                const feita = estaFeita(o);
                const texto = descricao(o, l.clienteNome, hoje);
                const atrasada = !feita && !!o.dataVencimento && o.dataVencimento < hoje;
                return (
                  <td key={c} className={cn('border-t border-border px-2 py-2 text-center', atrasada && 'bg-destructive/5')}>
                    <HintTooltip content={texto}>
                      <span className="inline-flex">
                        <Checkbox
                          checked={feita}
                          disabled={salvando.has(o.id)}
                          onCheckedChange={() => onAlternar(o, !feita)}
                          aria-label={texto}
                          className={cn(
                            'h-5 w-5 rounded-md data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600',
                            atrasada && 'border-destructive'
                          )}
                        />
                      </span>
                    </HintTooltip>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
