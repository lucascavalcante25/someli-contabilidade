import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

interface ObrigacaoTipo {
  id: number;
  nome: string;
  tipo: string;
  descricao: string;
  diasAntecedenciaAlerta: number;
}

const TIPOS = ['FISCAL', 'LICENCA', 'OUTROS'];

export default function ObrigacoesTipos() {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const [obrigacoes, setObrigacoes] = useState<ObrigacaoTipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ObrigacaoTipo | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${apiBaseUrl}/obrigacoes`, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error('Erro ao carregar');
      const data = await res.json();
      setObrigacoes(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erro ao carregar tipos de obrigação');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleSave = async (form: { nome: string; tipo: string; descricao: string; diasAntecedenciaAlerta: number }) => {
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        descricao: form.descricao?.trim() || null,
        diasAntecedenciaAlerta: form.diasAntecedenciaAlerta ?? 7,
      };
      const url = editing ? `${apiBaseUrl}/obrigacoes/${editing.id}` : `${apiBaseUrl}/obrigacoes`;
      const res = await apiFetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || 'Erro ao salvar');
      }
      const saved = await res.json();
      if (editing) {
        setObrigacoes(prev => prev.map(o => (o.id === saved.id ? saved : o)));
        toast.success('Tipo atualizado');
      } else {
        setObrigacoes(prev => [...prev, saved]);
        toast.success('Tipo adicionado');
      }
      setShowForm(false);
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remover este tipo de obrigação?')) return;
    try {
      const res = await apiFetch(`${apiBaseUrl}/obrigacoes/${id}`, { method: 'DELETE', headers: {} });
      if (!res.ok) throw new Error('Erro ao remover');
      setObrigacoes(prev => prev.filter(o => o.id !== id));
      toast.success('Tipo removido');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Tipos de Obrigação</h1>
          <p className="text-sm text-muted-foreground mt-1">{obrigacoes.length} tipos cadastrados</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus size={16} /> Novo Tipo
        </button>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="label-text px-4 py-3 text-left">Nome</th>
                <th className="label-text px-4 py-3 text-left">Tipo</th>
                <th className="label-text px-4 py-3 text-left hidden md:table-cell">Descrição</th>
                <th className="label-text px-4 py-3 text-center">Dias Alerta</th>
                <th className="label-text px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Carregando...</td></tr>
              )}
              {!loading && obrigacoes.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nenhum tipo cadastrado</td></tr>
              )}
              {obrigacoes.map(o => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{o.nome}</td>
                  <td className="px-4 py-3">{o.tipo}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground max-w-[200px] truncate">{o.descricao || '-'}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{o.diasAntecedenciaAlerta}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => { setEditing(o); setShowForm(true); }} className="p-1.5 rounded hover:bg-muted"><Pencil size={14} /></button>
                      <button onClick={() => void handleDelete(o.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
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
          <ObrigacaoTipoFormModal
            editing={editing}
            loading={saving}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ObrigacaoTipoFormModal({
  editing,
  loading,
  onClose,
  onSave,
}: {
  editing: ObrigacaoTipo | null;
  loading: boolean;
  onClose: () => void;
  onSave: (f: { nome: string; tipo: string; descricao: string; diasAntecedenciaAlerta: number }) => void;
}) {
  const [form, setForm] = useState({
    nome: editing?.nome ?? '',
    tipo: editing?.tipo ?? 'FISCAL',
    descricao: editing?.descricao ?? '',
    diasAntecedenciaAlerta: editing?.diasAntecedenciaAlerta ?? 7,
  });

  useEffect(() => {
    if (editing) {
      setForm({ nome: editing.nome, tipo: editing.tipo, descricao: editing.descricao ?? '', diasAntecedenciaAlerta: editing.diasAntecedenciaAlerta });
    } else {
      setForm({ nome: '', tipo: 'FISCAL', descricao: '', diasAntecedenciaAlerta: 7 });
    }
  }, [editing]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} onClick={e => e.stopPropagation()} className="card-surface w-full max-w-md p-6">
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-semibold">{editing ? 'Editar Tipo' : 'Novo Tipo'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label-text">Nome</label>
            <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="w-full mt-1.5 rounded-md border border-input px-3 py-2.5 text-sm" placeholder="Ex: DAS, Alvará" />
          </div>
          <div>
            <label className="label-text">Tipo</label>
            <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} className="w-full mt-1.5 rounded-md border border-input px-3 py-2.5 text-sm">
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label-text">Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} rows={2} className="w-full mt-1.5 rounded-md border border-input px-3 py-2.5 text-sm resize-none" placeholder="Opcional" />
          </div>
          <div>
            <label className="label-text">Dias de antecedência do alerta</label>
            <input type="number" min={0} value={form.diasAntecedenciaAlerta} onChange={e => setForm(p => ({ ...p, diasAntecedenciaAlerta: Number(e.target.value) }))} className="w-full mt-1.5 rounded-md border border-input px-3 py-2.5 text-sm tabular-nums" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
          <button disabled={loading} onClick={() => onSave(form)} className="px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">{loading ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
