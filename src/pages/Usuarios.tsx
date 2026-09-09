import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Check, User, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { useAuth } from '@/contexts/AuthContext';
import TableScroll from '@/components/shared/TableScroll';
import ModalShell from '@/components/shared/ModalShell';
import HintTooltip from '@/components/shared/HintTooltip';
import AppSelect from '@/components/shared/AppSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { PERFIS, Permissoes } from '@/lib/permissions';

const PERMISSAO_HELP: Record<string, string> = {
  ADMINISTRACAO_VISUALIZAR: 'Libera telas e ações administrativas do sistema.',
  ALCADA_GLOBAL: 'Vê e opera todos os clientes, sem restrição de carteira.',
  ALCADA_SETOR: 'Amplia o acesso dentro do setor em que é responsável.',
  CLIENTES_VISUALIZAR: 'Permite listar e abrir fichas de clientes da alçada.',
  CLIENTES_CADASTRAR: 'Permite criar novos clientes no escritório.',
  CLIENTES_EDITAR: 'Permite alterar dados cadastrais e tags do cliente.',
  CLIENTES_EXCLUIR: 'Permite remover clientes (ação irreversível).',
  CLIENTES_RESPONSAVEIS_EDITAR: 'Define responsáveis por setor (fiscal, DP, etc.).',
  OBRIGACOES_VISUALIZAR: 'Consulta obrigações e ocorrências.',
  OBRIGACOES_CRIAR: 'Cria vínculos e aplica obrigações em massa.',
  OBRIGACOES_EDITAR: 'Altera vencimentos e status operacionais.',
  OBRIGACOES_CONCLUIR: 'Marca ocorrências como concluídas/entregues.',
  OBRIGACOES_EXCLUIR: 'Remove vínculos de obrigações.',
  OBRIGACOES_REABRIR: 'Reabre ocorrências já finalizadas.',
  OBRIGACOES_TIPOS_GERENCIAR: 'Gerencia o catálogo de tipos de obrigação.',
  FINANCEIRO_VISUALIZAR: 'Acessa resumo e lançamentos financeiros.',
  HONORARIO_VISUALIZAR: 'Exibe valores de honorário (informação sensível).',
  HONORARIO_EDITAR: 'Altera honorários dos clientes.',
  DESPESAS_VISUALIZAR: 'Consulta despesas do escritório.',
  DESPESAS_EDITAR: 'Lança e edita despesas.',
  USUARIOS_VISUALIZAR: 'Lista funcionários/usuários internos.',
  USUARIOS_PERMISSOES: 'Edita permissões granulares de outros usuários.',
  VISAO_GERENCIAL: 'Indicadores gerenciais no Meu Trabalho.',
};

type Perfil = typeof PERFIS[number];

interface Usuario {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  perfil: Perfil;
  ativo: boolean;
  fotoUrl?: string;
}

interface UsuarioFormData {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  perfil: Perfil;
  ativo: boolean;
  senha: string;
  confirmarSenha: string;
  foto?: File;
  fotoPreview?: string;
}

const perfilColors: Record<string, string> = {
  ADMIN: 'bg-primary/10 text-primary',
  SOCIO: 'bg-primary/10 text-primary',
  GERENTE: 'bg-success/10 text-success',
  SUPERVISOR_FISCAL: 'bg-success/10 text-success',
  FISCAL: 'bg-success/10 text-success',
  SUPERVISOR_DP: 'bg-warning/10 text-warning',
  DEPARTAMENTO_PESSOAL: 'bg-warning/10 text-warning',
  CONTABIL: 'bg-success/10 text-success',
  FINANCEIRO: 'bg-destructive/10 text-destructive',
  ATENDIMENTO: 'bg-muted text-muted-foreground',
  ESTAGIARIO: 'bg-muted text-muted-foreground',
  CONTADOR: 'bg-success/10 text-success',
  OPERADOR: 'bg-warning/10 text-warning',
};

export default function Usuarios() {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const { user: currentUser, updateUser, can } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [permsUser, setPermsUser] = useState<Usuario | null>(null);

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
    };
  };

  const parseApiError = async (response: Response) => {
    try {
      const body = await response.json();
      return body?.message || 'Erro ao processar requisição';
    } catch {
      return 'Erro ao processar requisição';
    }
  };

  const maskCpf = (v: string) => {
    const nums = v.replace(/\D/g, '').slice(0, 11);
    return nums
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatCpf = (cpf: string) => {
    const nums = cpf.replace(/\D/g, '').slice(0, 11);
    if (nums.length !== 11) return cpf;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9, 11)}`;
  };

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${apiBaseUrl}/usuarios`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      const data = (await response.json()) as Usuario[];
      setUsuarios(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void fetchUsuarios();
  }, [fetchUsuarios]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente remover este usuário?')) return;
    try {
      const response = await apiFetch(`${apiBaseUrl}/usuarios/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      setUsuarios(prev => prev.filter(u => u.id !== id));
      toast.success('Usuário removido');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover usuário');
    }
  };

  const handleSave = async (form: UsuarioFormData, usuarioId?: number) => {
    const cpf = form.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) {
      toast.error('CPF inválido');
      return;
    }
    if (!form.nome || !form.email || !form.telefone || !form.perfil) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (!usuarioId && !form.senha) {
      toast.error('Senha é obrigatória para novo usuário');
      return;
    }
    if (form.senha && form.senha !== form.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        cpf,
        email: form.email.trim(),
        telefone: form.telefone.trim(),
        perfil: form.perfil,
        ativo: form.ativo,
        ...(form.senha ? { senha: form.senha } : {}),
      };

      const response = await apiFetch(
        usuarioId ? `${apiBaseUrl}/usuarios/${usuarioId}` : `${apiBaseUrl}/usuarios`,
        {
          method: usuarioId ? 'PUT' : 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      let usuarioSalvo = (await response.json()) as Usuario;

      if (form.foto && usuarioSalvo.id) {
        try {
          const token = localStorage.getItem('someli_token');
          const formData = new FormData();
          formData.append('file', form.foto);
          const fotoRes = await fetch(`${apiBaseUrl}/usuarios/${usuarioSalvo.id}/foto`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });
          if (fotoRes.ok) {
            usuarioSalvo = (await fotoRes.json()) as Usuario;
          }
        } catch {
          toast.warning('Usuário salvo, mas falha ao enviar foto');
        }
      }

      if (usuarioId) {
        setUsuarios(prev => prev.map(u => (u.id === usuarioSalvo.id ? usuarioSalvo : u)));
        if (currentUser?.id === usuarioSalvo.id) {
          const updates: { nome: string; fotoUrl?: string } = { nome: usuarioSalvo.nome };
          if (usuarioSalvo.fotoUrl != null) updates.fotoUrl = usuarioSalvo.fotoUrl;
          updateUser(updates);
        }
        toast.success('Usuário atualizado');
      } else {
        setUsuarios(prev => [...prev, usuarioSalvo]);
        toast.success('Usuário cadastrado');
      }
      setShowForm(false);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento de usuários do sistema</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      <div className="card-surface overflow-hidden max-w-full">
        <TableScroll>
        <table className="w-full text-sm min-w-[300px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="label-text px-3 sm:px-4 py-3 text-left whitespace-nowrap">Nome</th>
              <th className="label-text px-3 sm:px-4 py-3 text-left whitespace-nowrap hidden sm:table-cell">CPF</th>
              <th className="label-text px-3 sm:px-4 py-3 text-left hidden md:table-cell">Telefone</th>
              <th className="label-text px-3 sm:px-4 py-3 text-left hidden lg:table-cell">E-mail</th>
              <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap">Perfil</th>
              <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap w-20">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Carregando usuários...
                </td>
              </tr>
            )}
            {!loading && usuarios.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum usuário cadastrado
                </td>
              </tr>
            )}
            {!loading && usuarios.map(u => (
              <tr key={u.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-3 sm:px-4 py-3 font-medium min-w-[100px] max-w-[160px] sm:max-w-none">
                  <HintTooltip content={u.nome} enabled={!!u.nome && u.nome.length > 22}>
                    <span className="block truncate">{u.nome}</span>
                  </HintTooltip>
                  <span className="sm:hidden text-[11px] text-muted-foreground tabular-nums">{formatCpf(u.cpf)}</span>
                </td>
                <td className="px-3 sm:px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap hidden sm:table-cell">{formatCpf(u.cpf)}</td>
                <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-muted-foreground">{u.telefone}</td>
                <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[120px]">
                  <HintTooltip content={u.email} enabled={!!u.email && u.email.length > 18}>
                    <span className="block truncate">{u.email}</span>
                  </HintTooltip>
                </td>
                <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${perfilColors[u.perfil as Perfil]}`}>
                    {u.perfil}
                  </span>
                </td>
                <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <HintTooltip content="Editar">
                      <button
                        type="button"
                        onClick={() => { setEditing(u); setShowForm(true); }}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                    </HintTooltip>
                    {can(Permissoes.USUARIOS_PERMISSOES) && (
                      <HintTooltip content="Permissões">
                        <button
                          type="button"
                          onClick={() => setPermsUser(u)}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          aria-label="Permissões"
                        >
                          <Shield size={14} />
                        </button>
                      </HintTooltip>
                    )}
                    <HintTooltip content="Excluir">
                      <button
                        type="button"
                        onClick={() => void handleDelete(u.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        aria-label="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </HintTooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </TableScroll>
      </div>

      <AnimatePresence>
        {showForm && (
          <UsuarioFormModal
            usuario={editing}
            onClose={() => setShowForm(false)}
            loading={saving}
            onSave={(form) => void handleSave(form, editing?.id)}
            maskCpf={maskCpf}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {permsUser && (
          <PermissoesModal
            usuario={permsUser}
            onClose={() => setPermsUser(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UsuarioFotoPreview({ usuarioId }: { usuarioId: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API_BASE_URL}/usuarios/${usuarioId}/foto`, { headers: {} })
      .then(r => cancelled || (r.ok ? r.blob() : null))
      .then(blob => {
        if (cancelled || !blob) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setSrc(url);
      });
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setSrc(null);
    };
  }, [usuarioId]);
  if (!src) return <User size={32} className="text-muted-foreground" />;
  return <img src={src} alt="" className="h-full w-full object-cover" />;
}

function UsuarioFormModal({
  usuario,
  onClose,
  onSave,
  loading,
  maskCpf,
}: {
  usuario: Usuario | null;
  onClose: () => void;
  onSave: (u: UsuarioFormData) => void;
  loading: boolean;
  maskCpf: (cpf: string) => string;
}) {
  const [form, setForm] = useState<UsuarioFormData>(
    usuario
      ? {
          nome: usuario.nome,
          cpf: maskCpf(usuario.cpf),
          email: usuario.email,
          telefone: usuario.telefone,
          perfil: usuario.perfil,
          ativo: usuario.ativo,
          senha: '',
          confirmarSenha: '',
        }
      : {
          nome: '',
          cpf: '',
          email: '',
          telefone: '',
          perfil: 'OPERADOR',
          ativo: true,
          senha: '',
          confirmarSenha: '',
        }
  );
  const [showPass, setShowPass] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof UsuarioFormData>(k: K, v: UsuarioFormData[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const senha = form.senha || '';
  const strength = [
    senha.length >= 8,
    /[A-Z]/.test(senha),
    /[a-z]/.test(senha),
    /\d/.test(senha),
    /[^A-Za-z0-9]/.test(senha),
  ];
  const strengthScore = strength.filter(Boolean).length;

  const maskTelefone = (v: string) => {
    const nums = v.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 10) {
      return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  };

  return (
    <ModalShell onClose={onClose} maxWidth="sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{usuario ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <label className="label-text">Foto do perfil</label>
            <div className="relative">
              <div className="h-20 w-20 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-background overflow-hidden bg-muted flex items-center justify-center">
                {fotoPreview ? (
                  <img src={fotoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : usuario?.fotoUrl && usuario?.id ? (
                  <UsuarioFotoPreview usuarioId={usuario.id} />
                ) : (
                  <User size={32} className="text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    update('foto', file);
                    setFotoPreview(URL.createObjectURL(file));
                  }
                }}
              />
              <HintTooltip content="Alterar foto">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90"
                  aria-label="Alterar foto"
                >
                  <Pencil size={12} />
                </button>
              </HintTooltip>
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG ou GIF (opcional)</p>
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Nome</label>
            <input value={form.nome || ''} onChange={e => update('nome', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="label-text">CPF</label>
            <input value={form.cpf || ''} onChange={e => update('cpf', maskCpf(e.target.value))} placeholder="000.000.000-00" className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="label-text">E-mail</label>
            <input type="email" value={form.email || ''} onChange={e => update('email', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Telefone</label>
            <input value={form.telefone || ''} onChange={e => update('telefone', maskTelefone(e.target.value))} placeholder="(00) 00000-0000" className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Perfil</label>
            <AppSelect
              value={form.perfil || 'OPERADOR'}
              onChange={(v) => update('perfil', v as Perfil)}
              options={PERFIS.map(p => ({ value: p, label: p.replace(/_/g, ' ') }))}
            />
          </div>
          <div className="flex items-center gap-2.5">
            <Checkbox
              checked={form.ativo}
              onCheckedChange={(checked) => update('ativo', checked === true)}
              className="h-5 w-5 rounded-md"
            />
            <label className="text-sm text-muted-foreground">Usuário ativo</label>
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Senha {usuario ? '(opcional na edição)' : ''}</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.senha || ''} onChange={e => update('senha', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all" />
              <HintTooltip content={showPass ? 'Ocultar senha' : 'Mostrar senha'}>
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </HintTooltip>
            </div>
            {senha && (
              <div className="space-y-2 mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strengthScore ? (strengthScore <= 2 ? 'bg-destructive' : strengthScore <= 3 ? 'bg-warning' : 'bg-success') : 'bg-muted'}`} />
                  ))}
                </div>
                <div className="space-y-0.5">
                  {['Mín. 8 caracteres', 'Letra maiúscula', 'Letra minúscula', 'Número', 'Caractere especial'].map((rule, i) => (
                    <p key={rule} className={`text-xs flex items-center gap-1 ${strength[i] ? 'text-success' : 'text-muted-foreground'}`}>
                      {strength[i] && <Check size={12} />} {rule}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Confirmar Senha</label>
            <input type="password" value={form.confirmarSenha || ''} onChange={e => update('confirmarSenha', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all" />
            {form.confirmarSenha && form.senha !== form.confirmarSenha && (
              <p className="text-xs text-destructive">As senhas não coincidem</p>
            )}
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button disabled={loading} onClick={() => onSave(form)} className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
    </ModalShell>
  );
}

function PermissoesModal({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const [catalogo, setCatalogo] = useState<{ codigo: string; modulo: string; descricao: string }[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [alcadaGlobal, setAlcadaGlobal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [catRes, userRes] = await Promise.all([
          apiFetch(`${API_BASE_URL}/permissoes/catalogo`),
          apiFetch(`${API_BASE_URL}/permissoes/usuarios/${usuario.id}`),
        ]);
        if (!cancelled && catRes.ok) {
          const data = await catRes.json();
          setCatalogo(Array.isArray(data) ? data : []);
        }
        if (!cancelled && userRes.ok) {
          const data = await userRes.json();
          setSelecionadas(new Set(data.efetivas || []));
          setAlcadaGlobal(!!data.alcadaGlobal);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [usuario.id]);

  const toggle = (codigo: string) => {
    setSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  };

  const aplicarPerfil = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/permissoes/perfil/${usuario.perfil}`);
      if (!res.ok) throw new Error('Falha ao carregar perfil');
      const data = await res.json();
      setSelecionadas(new Set(Array.isArray(data) ? data : []));
      toast.success(`Permissões do perfil ${usuario.perfil} aplicadas (ainda não salvas)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    }
  };

  const resetar = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/permissoes/usuarios/${usuario.id}/reset`, { method: 'PUT' });
      if (!res.ok) throw new Error('Falha ao resetar');
      const data = await res.json();
      setSelecionadas(new Set(data.efetivas || []));
      setAlcadaGlobal(!!data.alcadaGlobal);
      toast.success('Permissões resetadas para o perfil');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const salvar = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/permissoes/usuarios/${usuario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissoes: Array.from(selecionadas),
          alcadaGlobal,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Falha ao salvar');
      }
      toast.success('Permissões atualizadas');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const porModulo = catalogo.reduce<Record<string, typeof catalogo>>((acc, p) => {
    (acc[p.modulo] ||= []).push(p);
    return acc;
  }, {});

  return (
    <ModalShell onClose={onClose} maxWidth="lg" fixedSize>
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Permissões de Acesso</h2>
          <p className="text-sm text-muted-foreground">{usuario.nome} · {usuario.perfil}</p>
        </div>
        <HintTooltip content="Fechar sem salvar">
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fechar">
            <X size={18} />
          </button>
        </HintTooltip>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-2">
            <HintTooltip content="Copia as permissões padrão do perfil (CONTADOR, FISCAL…) sem salvar ainda">
              <button type="button" onClick={() => void aplicarPerfil()} className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted">
                Copiar do perfil
              </button>
            </HintTooltip>
            <HintTooltip content="Remove customizações e restaura imediatamente as permissões do perfil">
              <button type="button" onClick={() => void resetar()} className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted">
                Resetar para perfil
              </button>
            </HintTooltip>
          </div>
          <div className="flex items-center gap-2.5">
            <Checkbox checked={alcadaGlobal} onCheckedChange={(c) => setAlcadaGlobal(c === true)} className="h-5 w-5" />
            <HintTooltip content="Com alçada global o usuário enxerga toda a carteira, não só os clientes em que é responsável">
              <label className="cursor-help text-sm">Alçada global (todos os clientes)</label>
            </HintTooltip>
          </div>
          {Object.entries(porModulo).map(([modulo, perms]) => (
            <div key={modulo} className="space-y-2 rounded-md border border-border p-3">
              <HintTooltip content={`Grupo de permissões do módulo ${modulo}`}>
                <p className="cursor-help text-xs font-semibold uppercase tracking-wide text-muted-foreground">{modulo}</p>
              </HintTooltip>
              <div className="grid gap-2 sm:grid-cols-2">
                {perms.map((p) => (
                  <HintTooltip
                    key={p.codigo}
                    content={PERMISSAO_HELP[p.codigo] || p.descricao || p.codigo}
                    side="right"
                  >
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <Checkbox
                        checked={selecionadas.has(p.codigo)}
                        onCheckedChange={() => toggle(p.codigo)}
                        className="mt-0.5 h-4 w-4"
                      />
                      <span>
                        <span className="font-medium">{p.codigo}</span>
                        <span className="block text-xs text-muted-foreground">{p.descricao}</span>
                      </span>
                    </label>
                  </HintTooltip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex shrink-0 justify-end gap-2 border-t pt-3">
        <HintTooltip content="Descarta alterações desta tela">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
        </HintTooltip>
        <HintTooltip content="Grava permissões e alçada deste usuário">
          <button disabled={saving || loading} onClick={() => void salvar()} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">
            {saving ? 'Salvando…' : 'Salvar permissões'}
          </button>
        </HintTooltip>
      </div>
    </ModalShell>
  );
}

