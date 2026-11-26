import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AppSelect from '@/components/shared/AppSelect';
import Campo, { classeInput } from './Campo';
import {
  CHAVE_CENARIOS_RTC,
  ErroSimulador,
  REGIME_LABEL,
  excluirCenario,
  listarCenarios,
  listarClientesParaSimulacao,
  salvarCenario,
  type CenarioRtc,
  type RegimeRtc,
} from '@/lib/simuladorRtc';

interface Props {
  regime: RegimeRtc;
  /** Monta a operação atual do formulário; null quando o formulário está incompleto. */
  operacaoAtual: () => unknown;
  onAbrir: (cenario: CenarioRtc) => void;
}

export default function CenariosCliente({ regime, operacaoAtual, onAbrir }: Props) {
  const queryClient = useQueryClient();
  const [clienteId, setClienteId] = useState('');
  const [nome, setNome] = useState('');
  const [observacao, setObservacao] = useState('');
  const id = Number(clienteId) || 0;

  const clientes = useQuery({ queryKey: ['simulador-rtc', 'clientes'], queryFn: listarClientesParaSimulacao, staleTime: 5 * 60_000 });
  const cenarios = useQuery({ queryKey: CHAVE_CENARIOS_RTC(id), queryFn: () => listarCenarios(id), enabled: id > 0 });

  const salvar = useMutation({
    mutationFn: () => salvarCenario(id, { nome: nome.trim(), regime, operacao: operacaoAtual(), observacao: observacao.trim() || undefined }),
    onSuccess: (cenario) => {
      toast.success('Cenário salvo com o resultado da calculadora.');
      setNome('');
      setObservacao('');
      queryClient.invalidateQueries({ queryKey: CHAVE_CENARIOS_RTC(id) });
      onAbrir(cenario);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.'),
  });

  const excluir = useMutation({
    mutationFn: (cenarioId: number) => excluirCenario(cenarioId),
    onSuccess: () => {
      toast.success('Cenário excluído.');
      queryClient.invalidateQueries({ queryKey: CHAVE_CENARIOS_RTC(id) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Não foi possível excluir.'),
  });

  const semPermissaoClientes = clientes.error instanceof ErroSimulador && clientes.error.tipo === 'permissao';

  return (
    <div className="card-surface p-4 sm:p-5 min-w-0 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Cenários do cliente</h3>
        <p className="text-xs text-muted-foreground">Salve a simulação no cliente para retomar na conversa sobre 2027.</p>
      </div>

      {clientes.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Carregando clientes…</p>
      ) : clientes.isError ? (
        <p className="text-sm text-destructive">
          {semPermissaoClientes ? 'Você não tem acesso à lista de clientes; dá para simular, mas não salvar.' : (clientes.error as Error).message}
        </p>
      ) : (clientes.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum cliente na sua alçada.</p>
      ) : (
        <Campo rotulo="Cliente">
          <AppSelect value={clienteId} onChange={setClienteId} placeholder="Escolha o cliente"
            options={(clientes.data ?? []).map((c) => ({ value: String(c.id), label: c.regimeTributario ? `${c.nome} · ${c.regimeTributario}` : c.nome }))} />
        </Campo>
      )}

      {id > 0 && (
        <>
          <div className="space-y-2">
            <Campo rotulo="Nome do cenário">
              <input value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Venda de serviço em 2027" className={classeInput} />
            </Campo>
            <Campo rotulo="Observação (opcional)">
              <textarea value={observacao} maxLength={1000} rows={2} onChange={(e) => setObservacao(e.target.value)} className={classeInput} />
            </Campo>
            <button type="button" disabled={!nome.trim() || salvar.isPending} onClick={() => salvar.mutate()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:w-auto">
              {salvar.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Calcular e salvar
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Salvos</p>
            {cenarios.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Carregando…</p>
            ) : cenarios.isError ? (
              <p className="text-sm text-destructive">{(cenarios.error as Error).message}</p>
            ) : (cenarios.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cenário salvo para este cliente.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {(cenarios.data ?? []).map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-2 p-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium break-words">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {REGIME_LABEL[c.regime]} · versão {c.versaoCalculadora ?? '—'}
                        {c.criadoEm ? ` · ${new Date(c.criadoEm).toLocaleDateString('pt-BR')}` : ''}
                        {c.criadoPor ? ` · ${c.criadoPor}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => onAbrir(c)} className="rounded p-1.5 hover:bg-muted" aria-label={`Abrir ${c.nome}`} title="Abrir">
                        <FolderOpen size={16} />
                      </button>
                      <button type="button" onClick={() => { if (window.confirm(`Excluir o cenário "${c.nome}"?`)) excluir.mutate(c.id); }}
                        className="rounded p-1.5 text-destructive hover:bg-muted" aria-label={`Excluir ${c.nome}`} title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
