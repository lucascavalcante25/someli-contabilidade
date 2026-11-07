import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Loader2, Pencil, Pin, Plus, StickyNote, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AppSelect from '@/components/shared/AppSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  atualizarAcesso,
  CHAVE_ACESSOS,
  CHAVE_CONTAGENS,
  criarAcesso,
  desativarAcesso,
  ErroAcesso,
  listarAcessosAbertos,
  valorPreenchido,
  type AcessoAberto,
  type AcessoForm,
} from '@/lib/acessos';
import {
  atualizarAnotacao,
  CHAVE_ANOTACOES,
  criarAnotacao,
  desativarAnotacao,
  ErroAnotacao,
  listarAnotacoes,
  partesDoTexto,
  type Anotacao,
  type AnotacaoForm,
} from '@/lib/anotacoes';
import { Permissoes } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const SETORES = [
  { value: '', label: 'Sem setor' },
  { value: 'FISCAL', label: 'Fiscal' },
  { value: 'DEPARTAMENTO_PESSOAL', label: 'Departamento Pessoal' },
  { value: 'CONTABIL', label: 'Contábil' },
  { value: 'SOCIETARIO', label: 'Societário' },
];

const ROTULO: Record<string, string> = {
  FISCAL: 'Fiscal',
  DEPARTAMENTO_PESSOAL: 'Pessoal',
  CONTABIL: 'Contábil',
  SOCIETARIO: 'Societário',
};

function rotuloSetor(setor: string | null) {
  if (!setor) return null;
  return ROTULO[setor] ?? setor;
}

function textoErro(erro: unknown, vazio: string) {
  if (erro instanceof ErroAcesso || erro instanceof ErroAnotacao) return erro.message;
  return erro instanceof Error ? erro.message : vazio;
}

interface FichaClienteAcessosProps {
  clienteId: number;
  clienteNome: string;
}

/** Acessos e anotações do cliente. O mesmo componente vale para o painel e para o cadastro. */
export default function FichaClienteAcessos({ clienteId, clienteNome }: FichaClienteAcessosProps) {
  const { can } = useAuth();
  const podeVerAcessos = can(Permissoes.CLIENTE_ACESSOS_VER);
  const abaInicial = podeVerAcessos ? 'acessos' : 'anotacoes';

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <p className="sr-only">Ficha de {clienteNome}</p>
      <Tabs defaultValue={abaInicial} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TabsList className={cn('grid h-auto w-full shrink-0', podeVerAcessos ? 'grid-cols-2' : 'grid-cols-1')}>
          {podeVerAcessos && (
            <TabsTrigger value="acessos" className="gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Acessos
            </TabsTrigger>
          )}
          <TabsTrigger value="anotacoes" className="gap-1.5">
            <StickyNote className="h-3.5 w-3.5" /> Anotações
          </TabsTrigger>
        </TabsList>
        {podeVerAcessos && (
          <TabsContent value="acessos" className="mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden focus-visible:outline-none">
            <AcessosLista clienteId={clienteId} />
          </TabsContent>
        )}
        <TabsContent value="anotacoes" className="mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden focus-visible:outline-none">
          <AnotacoesLista clienteId={clienteId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Estado({ erro, vazio, onTentar }: { erro: unknown; vazio: string; onTentar: () => void }) {
  if (!erro) {
    return <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">{vazio}</p>;
  }
  const tipo = erro instanceof ErroAcesso || erro instanceof ErroAnotacao ? erro.tipo : 'servidor';
  return (
    <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm">
      <p className={tipo === 'rede' ? 'text-foreground' : 'text-destructive'}>{textoErro(erro, 'Não foi possível carregar.')}</p>
      {tipo !== 'credencial' && (
        <Button type="button" variant="outline" size="sm" onClick={onTentar}>Tentar de novo</Button>
      )}
    </div>
  );
}

function AcessosLista({ clienteId }: { clienteId: number }) {
  const { can } = useAuth();
  const podeEditar = can(Permissoes.CLIENTE_ACESSOS_EDITAR);
  const queryClient = useQueryClient();
  // A ficha abre mostrando tudo (como no Trello). Não guarda em cache depois de fechar.
  const consulta = useQuery({
    queryKey: CHAVE_ACESSOS(clienteId),
    queryFn: () => listarAcessosAbertos(clienteId),
    gcTime: 0,
    staleTime: 0,
  });
  const [formulario, setFormulario] = useState<number | 'novo' | null>(null);
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function recarregar() {
    await queryClient.invalidateQueries({ queryKey: CHAVE_ACESSOS(clienteId) });
    await queryClient.invalidateQueries({ queryKey: CHAVE_CONTAGENS });
  }

  async function copiar(valor: string, rotulo: string) {
    try {
      await navigator.clipboard.writeText(valor);
      toast.success(`${rotulo} copiado`);
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  }

  async function desativar(acessoId: number) {
    setOcupado(true);
    try {
      await desativarAcesso(acessoId);
      setConfirmar(null);
      await recarregar();
      toast.success('Acesso desativado');
    } catch (erro) {
      toast.error(textoErro(erro, 'Não foi possível desativar.'));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      {podeEditar && (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant={formulario === 'novo' ? 'secondary' : 'default'} onClick={() => setFormulario((atual) => (atual === 'novo' ? null : 'novo'))}>
            <Plus className="h-4 w-4" /> Adicionar acesso
          </Button>
        </div>
      )}
      {formulario === 'novo' && (
        <AcessoFormulario
          clienteId={clienteId}
          onCancelar={() => setFormulario(null)}
          onSalvo={async () => {
            setFormulario(null);
            await recarregar();
          }}
        />
      )}
      {consulta.isLoading && (
        <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando acessos...
        </p>
      )}
      {consulta.isError && <Estado erro={consulta.error} vazio="" onTentar={() => void consulta.refetch()} />}
      {consulta.isSuccess && consulta.data.length === 0 && <Estado erro={null} vazio="Nenhum acesso cadastrado" onTentar={() => undefined} />}
      {consulta.data?.map((acesso) => {
        const login = valorPreenchido(acesso.login);
        const senha = valorPreenchido(acesso.senha);
        return (
          <article key={acesso.id} className="min-w-0 space-y-2 rounded-lg border border-border p-3">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{acesso.sistema}</p>
                {acesso.atualizadoPorNome && <p className="text-xs text-muted-foreground">{acesso.atualizadoPorNome}</p>}
              </div>
              {rotuloSetor(acesso.setor) && <Badge variant="secondary" className="shrink-0">{rotuloSetor(acesso.setor)}</Badge>}
            </div>
            {acesso.url && (
              <a href={acesso.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-primary underline">
                {acesso.url}
              </a>
            )}
            {(login || senha) && (
              <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 text-sm">
                {login && (
                  <>
                    <dt className="text-muted-foreground">Login</dt>
                    <dd className="break-all font-mono select-text">{login}</dd>
                  </>
                )}
                {senha && (
                  <>
                    <dt className="text-muted-foreground">Senha</dt>
                    <dd className="break-all font-mono select-text">{senha}</dd>
                  </>
                )}
              </dl>
            )}
            {acesso.observacao && (
              <p className="whitespace-pre-wrap break-words rounded-md bg-muted/40 px-2.5 py-2 text-sm select-text">{acesso.observacao}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {login && (
                <Button type="button" size="sm" variant="outline" onClick={() => void copiar(login, 'Login')}>
                  <Copy className="h-4 w-4" /> Copiar login
                </Button>
              )}
              {senha && (
                <Button type="button" size="sm" variant="outline" onClick={() => void copiar(senha, 'Senha')}>
                  <Copy className="h-4 w-4" /> Copiar senha
                </Button>
              )}
              {acesso.observacao && !login && !senha && (
                <Button type="button" size="sm" variant="outline" onClick={() => void copiar(acesso.observacao ?? '', 'Texto')}>
                  <Copy className="h-4 w-4" /> Copiar texto
                </Button>
              )}
              {podeEditar && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setFormulario(acesso.id)}>
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
              )}
              {podeEditar && confirmar !== acesso.id && (
                <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmar(acesso.id)}>
                  <Trash2 className="h-4 w-4" /> Desativar
                </Button>
              )}
            </div>
            {confirmar === acesso.id && (
              <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 px-2 py-2 text-sm">
                <span>Desativar este acesso?</span>
                <Button type="button" size="sm" variant="destructive" disabled={ocupado} onClick={() => void desativar(acesso.id)}>Desativar</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmar(null)}>Cancelar</Button>
              </div>
            )}
            {formulario === acesso.id && (
              <AcessoFormulario
                clienteId={clienteId}
                acesso={acesso}
                onCancelar={() => setFormulario(null)}
                onSalvo={async () => {
                  setFormulario(null);
                  await recarregar();
                }}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}

function AcessoFormulario({
  clienteId,
  acesso,
  onCancelar,
  onSalvo,
}: {
  clienteId: number;
  acesso?: AcessoAberto;
  onCancelar: () => void;
  onSalvo: () => Promise<void>;
}) {
  const [sistema, setSistema] = useState(acesso?.sistema ?? '');
  const [url, setUrl] = useState(acesso?.url ?? '');
  const [login, setLogin] = useState(valorPreenchido(acesso?.login) ?? '');
  const [senha, setSenha] = useState(valorPreenchido(acesso?.senha) ?? '');
  const [observacao, setObservacao] = useState(acesso?.observacao ?? '');
  const [setor, setSetor] = useState(acesso?.setor ?? '');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!sistema.trim()) {
      toast.error('Informe o nome do acesso (ex.: Gov.br, ISS, e-CAC).');
      return;
    }
    if (!login.trim() && !senha.trim() && !observacao.trim()) {
      toast.error('Preencha login e senha, ou escreva os dados na observação.');
      return;
    }
    const dados: AcessoForm = {
      sistema: sistema.trim(),
      url: url.trim() || null,
      // Quando tudo está no texto livre, login/senha vão com marcador (o servidor exige os campos)
      login: login.trim() || '—',
      senha: senha || '—',
      observacao: observacao.trim() || null,
      setor: setor || null,
    };
    setSalvando(true);
    try {
      if (acesso) await atualizarAcesso(acesso.id, dados);
      else await criarAcesso(clienteId, dados);
      toast.success(acesso ? 'Acesso atualizado' : 'Acesso cadastrado');
      await onSalvo();
    } catch (erro) {
      toast.error(textoErro(erro, 'Não foi possível salvar o acesso.'));
    } finally {
      setSalvando(false);
    }
  }

  const id = acesso?.id ?? 'novo';
  return (
    <form className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void salvar(); }}>
      <div className="space-y-1.5">
        <Label htmlFor={`sistema-${id}`}>Acesso</Label>
        <Input id={`sistema-${id}`} value={sistema} onChange={(e) => setSistema(e.target.value)} maxLength={120} placeholder="Gov.br, ISS, e-CAC, banco..." />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`url-${id}`}>URL</Label>
        <Input id={`url-${id}`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`login-${id}`}>Login</Label>
        <Input id={`login-${id}`} value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" spellCheck={false} placeholder="CPF, CNPJ ou usuário" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`senha-${id}`}>Senha</Label>
        <Input id={`senha-${id}`} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="off" spellCheck={false} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Setor</Label>
        <AppSelect value={setor} onChange={setSetor} options={SETORES} allowEmpty placeholder="Sem setor" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`obs-${id}`}>Observação</Label>
        <Textarea id={`obs-${id}`} value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={4} maxLength={2000} placeholder="Outros dados do acesso (CNPJ, pergunta secreta, instruções). Fica guardado cifrado." />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancelar}>Cancelar</Button>
      </div>
    </form>
  );
}

function AnotacoesLista({ clienteId }: { clienteId: number }) {
  const { can } = useAuth();
  const podeEditar = can(Permissoes.CLIENTES_EDITAR);
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: CHAVE_ANOTACOES(clienteId),
    queryFn: () => listarAnotacoes(clienteId),
  });
  const [formulario, setFormulario] = useState<number | 'novo' | null>(null);
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function recarregar() {
    await queryClient.invalidateQueries({ queryKey: CHAVE_ANOTACOES(clienteId) });
    await queryClient.invalidateQueries({ queryKey: CHAVE_CONTAGENS });
  }

  async function alternarFixada(nota: Anotacao) {
    setOcupado(true);
    try {
      await atualizarAnotacao(nota.id, { titulo: nota.titulo, texto: nota.texto, setor: nota.setor, fixada: !nota.fixada });
      await recarregar();
    } catch (erro) {
      toast.error(textoErro(erro, 'Não foi possível fixar a anotação.'));
    } finally {
      setOcupado(false);
    }
  }

  async function desativar(id: number) {
    setOcupado(true);
    try {
      await desativarAnotacao(id);
      setConfirmar(null);
      await recarregar();
      toast.success('Anotação excluída');
    } catch (erro) {
      toast.error(textoErro(erro, 'Não foi possível excluir.'));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      {podeEditar && (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant={formulario === 'novo' ? 'secondary' : 'default'} onClick={() => setFormulario((atual) => (atual === 'novo' ? null : 'novo'))}>
            <Plus className="h-4 w-4" /> Adicionar anotação
          </Button>
        </div>
      )}
      {formulario === 'novo' && (
        <AnotacaoFormulario clienteId={clienteId} onCancelar={() => setFormulario(null)} onSalvo={async () => { setFormulario(null); await recarregar(); }} />
      )}
      {consulta.isLoading && (
        <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando anotações...
        </p>
      )}
      {consulta.isError && <Estado erro={consulta.error} vazio="" onTentar={() => void consulta.refetch()} />}
      {consulta.isSuccess && consulta.data.length === 0 && <Estado erro={null} vazio="Nenhuma anotação cadastrada" onTentar={() => undefined} />}
      {consulta.data?.map((nota) => (
        <article key={nota.id} className="min-w-0 space-y-2 rounded-lg border border-border p-3">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold">{nota.titulo || 'Anotação'}</p>
            <div className="flex shrink-0 items-center gap-1">
              {nota.fixada && <Pin className="h-3.5 w-3.5 text-primary" aria-label="Fixada" />}
              {rotuloSetor(nota.setor) && <Badge variant="secondary">{rotuloSetor(nota.setor)}</Badge>}
            </div>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm">
            {partesDoTexto(nota.texto).map((parte, indice) => parte.tipo === 'link' ? (
              <a key={indice} href={parte.valor} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">{parte.valor}</a>
            ) : (
              <span key={indice}>{parte.valor}</span>
            ))}
          </p>
          {podeEditar && (
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="outline" disabled={ocupado} onClick={() => void alternarFixada(nota)}>
                <Pin className="h-4 w-4" /> {nota.fixada ? 'Desafixar' : 'Fixar'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setFormulario(nota.id)}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
              {confirmar !== nota.id ? (
                <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmar(nota.id)}>
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              ) : (
                <>
                  <Button type="button" size="sm" variant="destructive" disabled={ocupado} onClick={() => void desativar(nota.id)}>Excluir</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmar(null)}>Cancelar</Button>
                </>
              )}
            </div>
          )}
          {formulario === nota.id && (
            <AnotacaoFormulario
              clienteId={clienteId}
              anotacao={nota}
              onCancelar={() => setFormulario(null)}
              onSalvo={async () => { setFormulario(null); await recarregar(); }}
            />
          )}
        </article>
      ))}
    </div>
  );
}

function AnotacaoFormulario({
  clienteId,
  anotacao,
  onCancelar,
  onSalvo,
}: {
  clienteId: number;
  anotacao?: Anotacao;
  onCancelar: () => void;
  onSalvo: () => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(anotacao?.titulo ?? '');
  const [texto, setTexto] = useState(anotacao?.texto ?? '');
  const [setor, setSetor] = useState(anotacao?.setor ?? '');
  const [fixada, setFixada] = useState(anotacao?.fixada ?? false);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!texto.trim()) {
      toast.error('Informe o texto da anotação.');
      return;
    }
    const dados: AnotacaoForm = {
      titulo: titulo.trim() || null,
      texto: texto.trim(),
      setor: setor || null,
      fixada,
    };
    setSalvando(true);
    try {
      if (anotacao) await atualizarAnotacao(anotacao.id, dados);
      else await criarAnotacao(clienteId, dados);
      toast.success(anotacao ? 'Anotação atualizada' : 'Anotação cadastrada');
      await onSalvo();
    } catch (erro) {
      toast.error(textoErro(erro, 'Não foi possível salvar a anotação.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border border-border bg-muted/20 p-3" onSubmit={(e) => { e.preventDefault(); void salvar(); }}>
      <div className="space-y-1.5">
        <Label htmlFor={`titulo-${anotacao?.id ?? 'novo'}`}>Título</Label>
        <Input id={`titulo-${anotacao?.id ?? 'novo'}`} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} placeholder="Opcional" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`texto-${anotacao?.id ?? 'novo'}`}>Texto</Label>
        <Textarea id={`texto-${anotacao?.id ?? 'novo'}`} value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} />
      </div>
      <div className="space-y-1.5">
        <Label>Setor</Label>
        <AppSelect value={setor} onChange={setSetor} options={SETORES} allowEmpty placeholder="Sem setor" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={fixada} onCheckedChange={(v) => setFixada(v === true)} />
        Fixar no topo
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancelar}>Cancelar</Button>
      </div>
    </form>
  );
}
