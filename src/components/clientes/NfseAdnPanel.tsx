import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FileCheck2, KeyRound, Loader2, Pause, Play, RefreshCw, Trash2, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Permissoes } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ModalShell from '@/components/shared/ModalShell';
import {
  ErroNfse,
  alterarBuscaNfse,
  carregarStatusNfse,
  enviarCertificadoA1,
  formatarData,
  formatarDataHora,
  removerCertificadoA1,
  resumoSincronizacao,
  sincronizarNfse,
  situacaoNfse,
  validarArquivoCertificado,
  type NfseAdnStatus,
  type TomSituacao,
} from '@/lib/nfseAdn';

const TOM_CLASSE: Record<TomSituacao, string> = {
  ok: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  alerta: 'bg-warning/15 text-warning',
  erro: 'bg-destructive/15 text-destructive',
  neutro: 'bg-muted text-muted-foreground',
};

const inputClass =
  'w-full min-w-0 rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20';

interface Props {
  clienteId: string;
  /** Chamado quando a busca trouxe notas, para recarregar Docs e radar. */
  onNotasAtualizadas?: () => void;
}

function mensagemDeErro(e: unknown) {
  return e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.';
}

export default function NfseAdnPanel({ clienteId, onNotasAtualizadas }: Props) {
  const { can } = useAuth();
  const podeCertificado = can(Permissoes.CERTIFICADO_A1_GERENCIAR);
  const podeEditar = can(Permissoes.CLIENTES_EDITAR);

  const [status, setStatus] = useState<NfseAdnStatus | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<ErroNfse | null>(null);
  const [acao, setAcao] = useState<'sincronizar' | 'ativo' | 'remover' | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setStatus(await carregarStatusNfse(clienteId));
      setErro(null);
    } catch (e) {
      setErro(e instanceof ErroNfse ? e : new ErroNfse(mensagemDeErro(e), 'servidor'));
    } finally {
      setCarregando(false);
    }
  }, [clienteId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const sincronizar = async () => {
    setAcao('sincronizar');
    try {
      const r = await sincronizarNfse(clienteId);
      if (r.status === 'EM_DIA') toast.success(resumoSincronizacao(r));
      else toast.error(resumoSincronizacao(r));
      if (r.novas > 0 || r.canceladas > 0) onNotasAtualizadas?.();
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e));
    } finally {
      setAcao(null);
    }
  };

  const alternarAtivo = async () => {
    if (!status) return;
    setAcao('ativo');
    try {
      setStatus(await alterarBuscaNfse(clienteId, !status.ativo));
      toast.success(status.ativo ? 'Busca de notas pausada' : 'Busca de notas ligada');
    } catch (e) {
      toast.error(mensagemDeErro(e));
    } finally {
      setAcao(null);
    }
  };

  const remover = async () => {
    setAcao('remover');
    try {
      setStatus(await removerCertificadoA1(clienteId));
      toast.success('Certificado removido do servidor');
    } catch (e) {
      toast.error(mensagemDeErro(e));
    } finally {
      setAcao(null);
      setConfirmarRemocao(false);
    }
  };

  const situacao = status ? situacaoNfse(status) : null;

  return (
    <div className="card-surface min-w-0 space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <FileCheck2 size={16} className="mt-0.5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">NFS-e automática (Portal Nacional)</p>
            <p className="text-xs text-muted-foreground">
              Com o certificado A1 do cliente, o sistema baixa as notas de serviço emitidas e recebidas e guarda o XML
              aqui em Docs, na competência da nota.
            </p>
          </div>
        </div>
        {situacao && (
          <span className={cn('shrink-0 rounded px-2 py-0.5 text-xs font-medium', TOM_CLASSE[situacao.tom])}>
            {situacao.rotulo}
          </span>
        )}
      </div>

      {carregando && !status && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Carregando…
        </p>
      )}

      {erro && !status && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {erro.tipo === 'rede' && <WifiOff size={16} className="shrink-0 text-destructive" />}
          <span className="min-w-0 flex-1 text-destructive">{erro.message}</span>
          <Button size="sm" variant="outline" onClick={() => void carregar()}>
            Tentar de novo
          </Button>
        </div>
      )}

      {status && !status.habilitado && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          A guarda de certificados está desligada no servidor. Peça ao administrador para configurar a chave de
          certificados antes de usar esta função.
        </p>
      )}

      {status?.habilitado && !status.certificado && (
        <div className="space-y-3 rounded-md border border-dashed border-input p-3">
          <p className="text-sm text-muted-foreground">
            Nenhum certificado enviado. Envie o certificado A1 (.pfx) do cliente para buscar as notas de serviço de hora
            em hora. Use somente com autorização do cliente.
          </p>
          {podeCertificado ? (
            <Button size="sm" onClick={() => setModalAberto(true)}>
              <KeyRound size={14} /> Enviar certificado A1
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Só quem tem a permissão “Gerenciar certificado A1” pode enviar o certificado.
            </p>
          )}
        </div>
      )}

      {status?.habilitado && status.certificado && (
        <>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Certificado</dt>
              <dd className="truncate" title={status.certificado.titular ?? undefined}>
                {status.certificado.titular || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Válido até</dt>
              <dd className={cn(status.certificado.vencido && 'font-medium text-destructive')}>
                {formatarData(status.certificado.validoAte)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Notas baixadas</dt>
              <dd>{status.notasImportadas}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Última busca</dt>
              <dd>{formatarDataHora(status.ultimaConsulta)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Próxima busca</dt>
              <dd>{status.ativo && status.agendamentoLigado ? formatarDataHora(status.proximaConsulta) : '—'}</dd>
            </div>
          </dl>

          {status.ultimaMensagem && (
            <p
              className={cn(
                'break-words rounded-md p-2 text-xs',
                status.ultimoStatus === 'ERRO' ? 'bg-destructive/5 text-destructive' : 'bg-muted text-muted-foreground',
              )}
            >
              {status.ultimaMensagem}
            </p>
          )}

          {!status.agendamentoLigado && status.ativo && (
            <p className="text-xs text-muted-foreground">
              A busca automática de hora em hora está desligada no servidor. Use “Buscar agora”.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {podeEditar && (
              <Button
                size="sm"
                onClick={() => void sincronizar()}
                disabled={acao !== null || !status.ativo || status.certificado.vencido}
              >
                {acao === 'sincronizar' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {acao === 'sincronizar' ? 'Buscando…' : 'Buscar agora'}
              </Button>
            )}
            {podeEditar && (
              <Button size="sm" variant="outline" onClick={() => void alternarAtivo()} disabled={acao !== null}>
                {status.ativo ? <Pause size={14} /> : <Play size={14} />}
                {status.ativo ? 'Pausar busca' : 'Ligar busca'}
              </Button>
            )}
            {podeCertificado && (
              <Button size="sm" variant="outline" onClick={() => setModalAberto(true)} disabled={acao !== null}>
                <KeyRound size={14} /> Trocar certificado
              </Button>
            )}
            {podeCertificado && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmarRemocao(true)}
                disabled={acao !== null}
              >
                <Trash2 size={14} /> Remover certificado
              </Button>
            )}
          </div>
        </>
      )}

      {modalAberto && (
        <EnviarCertificadoModal
          clienteId={clienteId}
          onClose={() => setModalAberto(false)}
          onEnviado={(novo) => {
            setStatus(novo);
            setModalAberto(false);
            toast.success('Certificado guardado. A primeira busca já pode ser feita.');
          }}
        />
      )}

      <AlertDialog open={confirmarRemocao} onOpenChange={setConfirmarRemocao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover o certificado deste cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo e a senha são apagados do servidor e a busca de notas para. As notas já baixadas continuam em
              Docs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acao === 'remover'}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void remover();
              }}
              disabled={acao === 'remover'}
            >
              {acao === 'remover' ? 'Removendo…' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ModalProps {
  clienteId: string;
  onClose: () => void;
  onEnviado: (status: NfseAdnStatus) => void;
}

function EnviarCertificadoModal({ clienteId, onClose, onEnviado }: ModalProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    const invalido = validarArquivoCertificado(arquivo);
    if (invalido || !arquivo) {
      setErro(invalido);
      return;
    }
    if (!senha) {
      setErro('Informe a senha do certificado.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      onEnviado(await enviarCertificadoA1(clienteId, arquivo, senha));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
      setSenha('');
    }
  };

  return (
    <ModalShell onClose={enviando ? () => undefined : onClose} maxWidth="sm">
      <form onSubmit={(e) => void enviar(e)} className="space-y-4 p-5">
        <div>
          <h3 className="text-base font-semibold">Enviar certificado A1</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            O arquivo e a senha ficam cifrados no servidor e só são usados para buscar as NFS-e no Portal Nacional. Use
            somente com autorização do cliente.
          </p>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Arquivo (.pfx ou .p12)</span>
          <input
            type="file"
            accept=".pfx,.p12,application/x-pkcs12"
            disabled={enviando}
            onChange={(e) => {
              setArquivo(e.target.files?.[0] ?? null);
              setErro(null);
            }}
            className="block w-full min-w-0 text-sm file:mr-2 file:rounded file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Senha do certificado</span>
          <input
            type="password"
            autoComplete="new-password"
            value={senha}
            disabled={enviando}
            onChange={(e) => setSenha(e.target.value)}
            className={inputClass}
          />
        </label>
        {erro && <p className="rounded-md bg-destructive/5 p-2 text-sm text-destructive">{erro}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando && <Loader2 size={14} className="animate-spin" />}
            {enviando ? 'Validando…' : 'Guardar certificado'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
