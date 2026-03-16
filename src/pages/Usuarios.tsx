import { useState } from 'react';
import { mockUsuarios, type Usuario } from '@/data/mockData';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const perfilColors: Record<string, string> = {
  ADMIN: 'bg-primary/10 text-primary',
  CONTADOR: 'bg-success/10 text-success',
  OPERADOR: 'bg-warning/10 text-warning',
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(mockUsuarios);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento de usuários do sistema</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="label-text px-4 py-3 text-left">Nome</th>
              <th className="label-text px-4 py-3 text-left">CPF</th>
              <th className="label-text px-4 py-3 text-left hidden md:table-cell">E-mail</th>
              <th className="label-text px-4 py-3 text-center">Perfil</th>
              <th className="label-text px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{u.nome}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{u.cpf}</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${perfilColors[u.perfil]}`}>
                    {u.perfil}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setEditing(u); setShowForm(true); }} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                    <button onClick={() => { setUsuarios(prev => prev.filter(p => p.id !== u.id)); toast.success('Usuário removido'); }} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showForm && (
          <UsuarioFormModal
            usuario={editing}
            onClose={() => setShowForm(false)}
            onSave={(u) => {
              if (editing) {
                setUsuarios(prev => prev.map(p => p.id === u.id ? u : p));
                toast.success('Usuário atualizado');
              } else {
                setUsuarios(prev => [...prev, { ...u, id: Date.now() }]);
                toast.success('Usuário cadastrado');
              }
              setShowForm(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UsuarioFormModal({ usuario, onClose, onSave }: { usuario: Usuario | null; onClose: () => void; onSave: (u: Usuario) => void }) {
  const [form, setForm] = useState<Partial<Usuario & { senha: string; confirmarSenha: string }>>(
    usuario ? { ...usuario, senha: '', confirmarSenha: '' } : { nome: '', cpf: '', email: '', perfil: 'OPERADOR', senha: '', confirmarSenha: '' }
  );
  const [showPass, setShowPass] = useState(false);

  const update = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const senha = form.senha || '';
  const strength = [
    senha.length >= 8,
    /[A-Z]/.test(senha),
    /[a-z]/.test(senha),
    /\d/.test(senha),
    /[^A-Za-z0-9]/.test(senha),
  ];
  const strengthScore = strength.filter(Boolean).length;

  const maskCpf = (v: string) => {
    const nums = v.replace(/\D/g, '').slice(0, 11);
    return nums.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
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
            <label className="label-text">Perfil</label>
            <select value={form.perfil || 'OPERADOR'} onChange={e => update('perfil', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all">
              <option value="ADMIN">Admin</option>
              <option value="CONTADOR">Contador</option>
              <option value="OPERADOR">Operador</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Senha</label>
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
          <button onClick={() => onSave(form as Usuario)} className="px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">Salvar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
