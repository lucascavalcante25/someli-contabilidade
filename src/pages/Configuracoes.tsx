import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';

interface ContaForm {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  perfil: string;
  senha: string;
  confirmarSenha: string;
}

function maskPhone(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 10) {
    return n
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return n
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function formatCpf(cpf: string) {
  const nums = cpf.replace(/\D/g, '').slice(0, 11);
  if (nums.length !== 11) return cpf;
  return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9, 11)}`;
}

export default function Configuracoes() {
  const { user, updateUser } = useAuth();
  const apiBaseUrl = API_BASE_URL;
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<ContaForm>({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    perfil: '',
    senha: '',
    confirmarSenha: '',
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${apiBaseUrl}/account`);
      if (!res.ok) throw new Error('Não foi possível carregar seus dados');
      const data = await res.json();
      setForm({
        nome: data.nome || '',
        email: data.email || '',
        telefone: maskPhone(String(data.telefone || '')),
        cpf: formatCpf(String(data.cpf || '')),
        perfil: data.perfil || '',
        senha: '',
        confirmarSenha: '',
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim() || !form.telefone.trim()) {
      toast.error('Preencha nome, e-mail e telefone');
      return;
    }
    if (form.senha && form.senha !== form.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (form.senha && form.senha.length < 8) {
      toast.error('A senha deve ter ao menos 8 caracteres');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        telefone: form.telefone.trim(),
      };
      if (form.senha) body.senha = form.senha;
      const res = await apiFetch(`${apiBaseUrl}/account`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'Falha ao salvar');
      }
      const data = await res.json();
      updateUser({
        nome: data.nome,
        fotoUrl: data.fotoUrl,
        email: data.email,
        telefone: data.telefone,
      });
      setForm((f) => ({ ...f, senha: '', confirmarSenha: '' }));
      toast.success('Dados atualizados');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleFoto = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5 MB');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiFetch(`${apiBaseUrl}/account/foto`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error('Falha no upload da foto');
      const data = await res.json();
      updateUser({ fotoUrl: data.fotoUrl, nome: data.nome });
      toast.success('Foto atualizada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar foto');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="animate-spin" size={18} />
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Minha conta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atualize sua foto e dados básicos. O CPF e o perfil só podem ser alterados por um administrador.
        </p>
      </div>

      <div className="card-surface p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative">
            <UserAvatar
              userId={user?.id}
              fotoUrl={user?.fotoUrl}
              nome={form.nome || user?.nome}
              avatarVersion={user?._avatarVersion}
              className="h-20 w-20 text-lg ring-offset-2"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 disabled:opacity-60"
              title="Alterar foto"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void handleFoto(e.target.files?.[0] || null)}
            />
          </div>
          <div className="text-center sm:text-left">
            <p className="font-medium">{form.nome || 'Seu nome'}</p>
            <p className="text-sm text-muted-foreground">{form.perfil}</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WEBP · até 5 MB</p>
          </div>
        </div>

        <form onSubmit={handleSalvar} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Nome</label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">E-mail</label>
              <input
                type="email"
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Telefone</label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: maskPhone(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">CPF</label>
              <input
                className="w-full rounded-md border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground"
                value={form.cpf}
                disabled
                readOnly
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Perfil</label>
              <input
                className="w-full rounded-md border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground"
                value={form.perfil}
                disabled
                readOnly
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <User size={14} /> Alterar senha <span className="text-muted-foreground font-normal">(opcional)</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nova senha</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  placeholder="Deixe em branco para manter"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirmar senha</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
                  value={form.confirmarSenha}
                  onChange={(e) => setForm((f) => ({ ...f, confirmarSenha: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
