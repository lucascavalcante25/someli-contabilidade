import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

type Perfil = 'ADMIN' | 'CONTADOR' | 'OPERADOR';

interface Usuario {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  perfil: Perfil;
  ativo: boolean;
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
}

const perfilColors: Record<Perfil, string> = {
  ADMIN: 'bg-primary/10 text-primary',
  CONTADOR: 'bg-success/10 text-success',
  OPERADOR: 'bg-warning/10 text-warning',
};

export default function Usuarios() {
  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:8080', []);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('someli_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`,
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
      const response = await fetch(`${apiBaseUrl}/usuarios`, {
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
      const response = await fetch(`${apiBaseUrl}/usuarios/${id}`, {
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

      const response = await fetch(
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

      const usuarioSalvo = (await response.json()) as Usuario;
      if (usuarioId) {
        setUsuarios(prev => prev.map(u => (u.id === usuarioSalvo.id ? usuarioSalvo : u)));
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
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

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="label-text px-3 sm:px-4 py-3 text-left whitespace-nowrap">Nome</th>
              <th className="label-text px-3 sm:px-4 py-3 text-left whitespace-nowrap">CPF</th>
              <th className="label-text px-3 sm:px-4 py-3 text-left hidden md:table-cell">Telefone</th>
              <th className="label-text px-3 sm:px-4 py-3 text-left hidden md:table-cell">E-mail</th>
              <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap">Perfil</th>
              <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap">Ações</th>
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
                <td className="px-3 sm:px-4 py-3 font-medium max-w-[100px] sm:max-w-none truncate" title={u.nome}>{u.nome}</td>
                <td className="px-3 sm:px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap">{formatCpf(u.cpf)}</td>
                <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-muted-foreground">{u.telefone}</td>
                <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[120px]" title={u.email}>{u.email}</td>
                <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${perfilColors[u.perfil as Perfil]}`}>
                    {u.perfil}
                  </span>
                </td>
                <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setEditing(u); setShowForm(true); }} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                    <button onClick={() => void handleDelete(u.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
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
    </div>
  );
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} onClick={e => e.stopPropagation()} className="card-surface w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{usuario ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
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
            <select value={form.perfil || 'OPERADOR'} onChange={e => update('perfil', e.target.value as Perfil)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all">
              <option value="ADMIN">Admin</option>
              <option value="CONTADOR">Contador</option>
              <option value="OPERADOR">Operador</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.ativo} onChange={e => update('ativo', e.target.checked)} className="h-4 w-4 rounded border-input accent-primary cursor-pointer" />
            <label className="text-sm text-muted-foreground">Usuário ativo</label>
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Senha {usuario ? '(opcional na edição)' : ''}</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.senha || ''} onChange={e => update('senha', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button disabled={loading} onClick={() => onSave(form)} className="px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
