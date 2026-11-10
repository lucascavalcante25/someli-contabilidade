import { useRef, useState } from 'react';
import { CheckCircle2, Loader2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/data/mockData';
import { desmarcarPagamento, marcarPagamento } from '@/lib/pagamentos';
import { Permissoes } from '@/lib/permissions';
import { cn } from '@/lib/utils';

export interface ClienteInadimplente {
  id: number;
  razaoSocial: string;
  mesesPendentes?: number;
  valorPendente?: number;
  honorario?: number;
  /** "yyyy-MM" */
  mesesAbertos?: string[];
}

interface InadimplenciaDialogProps {
  cliente: ClienteInadimplente;
  mascarar: (valor: string) => string;
  /** houveMudanca: algum mês foi marcado/desmarcado (recarregar Dashboard e Financeiro). */
  onFechar: (houveMudanca: boolean) => void;
  onVerFicha: (clienteId: number) => void;
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const rotulo = (anoMes: string) => {
  const [a, m] = anoMes.split('-').map(Number);
  return `${MESES[m - 1]}/${a}`;
};

/**
 * Meses em aberto do cliente, para dar baixa ali mesmo: grava o mesmo pagamento da tela Financeiro,
 * então some da inadimplência e do "Em aberto" do Financeiro.
 */
export default function InadimplenciaDialog({ cliente, mascarar, onFechar, onVerFicha }: InadimplenciaDialogProps) {
  const { can } = useAuth();
  const podeLancar = can(Permissoes.FINANCEIRO_LANCAR);
  const podeDesfazer = can('FINANCEIRO_EDITAR');
  const meses = cliente.mesesAbertos ?? [];
  const [pagos, setPagos] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState<string | null>(null);
  const mudou = useRef(false);

  const honorario = cliente.honorario ?? (cliente.valorPendente && cliente.mesesPendentes ? cliente.valorPendente / cliente.mesesPendentes : 0);
  const emAberto = honorario * (meses.length - pagos.size);
  // Sem permissão de ver valores o backend não manda honorário nem valor: mostra só os meses
  const temValor = cliente.honorario != null || cliente.valorPendente != null;

  const alterar = async (anoMes: string, pagar: boolean) => {
    const [ano, mes] = anoMes.split('-').map(Number);
    setSalvando(anoMes);
    try {
      await (pagar ? marcarPagamento : desmarcarPagamento)(cliente.id, mes, ano);
      mudou.current = true;
      setPagos((p) => {
        const n = new Set(p);
        if (pagar) n.add(anoMes);
        else n.delete(anoMes);
        return n;
      });
      toast.success(pagar ? `${rotulo(anoMes)} marcado como pago` : `Pagamento de ${rotulo(anoMes)} desfeito`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar o pagamento');
    } finally {
      setSalvando(null);
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => { if (!aberto) onFechar(mudou.current); }}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-3 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="pr-6 break-words">{cliente.razaoSocial}</DialogTitle>
          <DialogDescription className="tabular-nums">
            {temValor
              ? `Em aberto: ${mascarar(formatCurrency(emAberto))} · ${meses.length - pagos.size} mês(es)`
              : `${meses.length - pagos.size} mês(es) em aberto`}
          </DialogDescription>
        </DialogHeader>

        {meses.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Nenhum mês em aberto.</p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {meses.map((m) => {
              const pago = pagos.has(m);
              return (
                <li key={m} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className={cn('text-sm', pago && 'text-muted-foreground line-through')}>{rotulo(m)}</p>
                    {temValor && <p className="text-xs tabular-nums text-muted-foreground">{mascarar(formatCurrency(honorario))}</p>}
                  </div>
                  {pago ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={14} /> Pago
                      </span>
                      {podeDesfazer && (
                        <button type="button" disabled={salvando != null} onClick={() => void alterar(m, false)}
                          aria-label={`Desfazer pagamento de ${rotulo(m)}`} title="Desfazer"
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
                          <Undo2 size={14} />
                        </button>
                      )}
                    </div>
                  ) : podeLancar ? (
                    <button type="button" disabled={salvando != null} onClick={() => void alterar(m, true)}
                      aria-label={`Marcar ${rotulo(m)} como pago`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-50">
                      {salvando === m ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Marcar pago
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {!podeLancar && meses.length > 0 && (
          <p className="text-xs text-muted-foreground">Você não tem permissão para lançar pagamentos; peça a quem cuida do financeiro.</p>
        )}
        <p className="text-xs text-muted-foreground">O pagamento marcado aqui é o mesmo da tela Financeiro.</p>
        <button type="button" onClick={() => onVerFicha(cliente.id)}
          className="self-start text-sm font-medium text-primary hover:underline">
          Ver ficha do cliente
        </button>
      </DialogContent>
    </Dialog>
  );
}
