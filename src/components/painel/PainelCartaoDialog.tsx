import { useState } from 'react';
import { CheckSquare, Clock, Hourglass, KeyRound, StickyNote } from 'lucide-react';
import { AcessosLista, AnotacoesLista } from '@/components/clientes/FichaClienteAcessos';
import AdicionarItemChecklist from '@/components/painel/AdicionarItemChecklist';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { AGUARDANDO_CLIENTE, estaFeita, NAO_APLICAVEL, rotuloCompetencia, type LinhaPainel, type OcorrenciaPainel, type Segmento } from '@/lib/painelMensal';
import { estaAtrasada, itensDoCartao, ORDEM_SEGMENTOS, ROTULO_SEGMENTO } from '@/lib/painelQuadro';
import { Permissoes } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface PainelCartaoDialogProps {
  linha: LinhaPainel | null;
  colunas: string[];
  /** Competência do painel aberto (yyyy-MM). */
  competencia: string;
  hoje: string;
  salvando: Set<number>;
  onAlternar: (ocorrencia: OcorrenciaPainel, concluir: boolean) => void;
  /** Um item foi adicionado ao checklist: recarregar o painel. */
  onItemAdicionado: () => void;
  onFechar: () => void;
  /** Segmento em que o cartão está (o padrão Serviços quando o cliente ainda não tem). */
  segmento?: Segmento | null;
  segmentoDefinido?: boolean;
  /** Troca o segmento do cliente (vale para os próximos meses). Sem ele, a escolha não aparece. */
  onMoverSegmento?: (clienteId: number, segmento: Segmento) => void;
  /** Marca/desmarca "aguardando cliente" (antes só na Fila de trabalho do Dashboard). */
  onAguardarCliente?: (ocorrencia: OcorrenciaPainel, aguardar: boolean) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
function quando(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Secao({ icone, titulo, acao, children }: { icone: React.ReactNode; titulo: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">{icone}{titulo}</h3>
        {acao}
      </div>
      {children}
    </section>
  );
}

/**
 * Cartão aberto, como no Trello: um modal só, que cresce para baixo, com o checklist do mês,
 * os acessos e as anotações do cliente (os mesmos do cadastro e do Painel V1).
 */
export default function PainelCartaoDialog({
  linha, colunas, competencia, hoje, salvando, onAlternar, onItemAdicionado, onFechar, segmento, segmentoDefinido, onMoverSegmento, onAguardarCliente,
}: PainelCartaoDialogProps) {
  const { can } = useAuth();
  const [ocultarMarcados, setOcultarMarcados] = useState(false);
  const itens = linha ? itensDoCartao(linha, colunas) : [];
  const percentual = linha && linha.total ? Math.round((linha.feitas / linha.total) * 100) : 0;
  const visiveis = ocultarMarcados ? itens.filter((o) => !estaFeita(o)) : itens;

  return (
    <Dialog open={linha != null} onOpenChange={(aberto) => { if (!aberto) { setOcultarMarcados(false); onFechar(); } }}>
      <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-3 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle className="pr-6 break-words">{linha?.clienteNome}</DialogTitle>
          <DialogDescription>Atividades da competência {rotuloCompetencia(competencia)}</DialogDescription>
          {linha && onMoverSegmento && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Segmento{segmentoDefinido ? '' : ' (a confirmar)'}:</span>
              <div role="radiogroup" aria-label="Segmento do cliente" className="inline-flex rounded-md bg-muted p-0.5">
                {ORDEM_SEGMENTOS.map((seg) => {
                  const marcado = !!segmentoDefinido && segmento === seg;
                  return (
                    <button
                      key={seg}
                      type="button"
                      role="radio"
                      aria-checked={marcado}
                      onClick={() => { if (!marcado) onMoverSegmento(linha.clienteId, seg); }}
                      className={cn(
                        'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                        marcado ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {ROTULO_SEGMENTO[seg]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogHeader>
        {linha && (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden pr-1">
            <Secao
              icone={<CheckSquare size={16} className="text-muted-foreground" />}
              titulo="Checklist do mês"
              acao={
                <button
                  type="button"
                  onClick={() => setOcultarMarcados((v) => !v)}
                  className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/70"
                >
                  {ocultarMarcados ? 'Mostrar itens marcados' : 'Ocultar itens marcados'}
                </button>
              }
            >
              <div className="flex items-center gap-2">
                <span className="w-9 text-xs tabular-nums text-muted-foreground">{percentual}%</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full transition-all', percentual === 100 ? 'bg-emerald-600' : 'bg-primary')}
                    style={{ width: `${percentual}%` }}
                  />
                </div>
              </div>
              <ul className="space-y-1">
                {visiveis.length === 0 && (
                  <li className="py-4 text-center text-sm text-muted-foreground">
                    {itens.length === 0 ? 'Nenhuma atividade neste mês.' : 'Tudo marcado neste mês.'}
                  </li>
                )}
                {visiveis.map((o) => {
                  const feita = estaFeita(o);
                  const naoAplica = o.status === NAO_APLICAVEL;
                  const atrasada = estaAtrasada(o, hoje);
                  return (
                    <li key={o.id} className={cn('flex items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/40', atrasada && 'bg-destructive/5')}>
                      {naoAplica ? (
                        <span className="mt-0.5 h-5 w-5 shrink-0 rounded-md border border-dashed border-muted-foreground/40" aria-hidden />
                      ) : (
                        <Checkbox
                          checked={feita}
                          disabled={salvando.has(o.id)}
                          onCheckedChange={() => onAlternar(o, !feita)}
                          aria-label={`${o.obrigacaoNome}${feita ? ' (feito)' : ''}`}
                          className={cn(
                            'mt-0.5 h-5 w-5 shrink-0 rounded-md data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600',
                            atrasada && 'border-destructive',
                          )}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={cn('break-words text-sm', feita && 'text-muted-foreground line-through', naoAplica && 'text-muted-foreground')}>
                          {o.obrigacaoNome}
                        </p>
                        <p className={cn('text-xs text-muted-foreground', atrasada && 'font-medium text-destructive')}>
                          {naoAplica
                            ? 'Não se aplica'
                            : feita
                              ? `Feito por ${o.concluidaPorNome ?? 'alguém'}${o.concluidaEm ? ` em ${quando(o.concluidaEm)}` : ''}`
                              : o.dataVencimento
                                ? <span className="inline-flex items-center gap-1"><Clock size={11} />{atrasada ? 'Atrasada · venceu' : 'Vence'} {diaMes(o.dataVencimento)}</span>
                                : 'Pendente'}
                        </p>
                        {o.status === AGUARDANDO_CLIENTE && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            <Hourglass size={11} aria-hidden /> Aguardando cliente
                          </span>
                        )}
                      </div>
                      {!feita && !naoAplica && onAguardarCliente && (
                        <button
                          type="button"
                          disabled={salvando.has(o.id)}
                          onClick={() => onAguardarCliente(o, o.status !== AGUARDANDO_CLIENTE)}
                          aria-label={`${o.obrigacaoNome}: ${o.status === AGUARDANDO_CLIENTE ? 'tirar de aguardando cliente' : 'marcar aguardando cliente'}`}
                          title={o.status === AGUARDANDO_CLIENTE ? 'Tirar de aguardando cliente' : 'Aguardando o cliente (documento, informação...)'}
                          className={cn(
                            'shrink-0 rounded-md p-1.5 transition-colors hover:bg-muted disabled:opacity-50',
                            o.status === AGUARDANDO_CLIENTE ? 'text-amber-600' : 'text-muted-foreground/60 hover:text-foreground',
                          )}
                        >
                          <Hourglass size={15} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <AdicionarItemChecklist
                key={linha.clienteId}
                clienteId={linha.clienteId}
                competencia={competencia}
                jaNoChecklist={itens.map((o) => o.obrigacaoNome)}
                onAdicionado={onItemAdicionado}
              />
            </Secao>
            {can(Permissoes.CLIENTE_ACESSOS_VER) && (
              <Secao icone={<KeyRound size={16} className="text-muted-foreground" />} titulo="Acessos">
                <AcessosLista clienteId={linha.clienteId} />
              </Secao>
            )}
            <Secao icone={<StickyNote size={16} className="text-muted-foreground" />} titulo="Anotações">
              <AnotacoesLista clienteId={linha.clienteId} />
            </Secao>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
