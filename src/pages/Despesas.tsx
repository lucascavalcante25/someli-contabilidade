import { useState } from 'react';
import { mockDespesas, formatCurrency, type Despesa } from '@/data/mockData';
import StatusBadge from '@/components/shared/StatusBadge';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function Despesas() {
  const [despesas, setDespesas] = useState<Despesa[]>(mockDespesas);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Despesa | null>(null);

  const handleDelete = (id: number) => {
    setDespesas(prev => prev.filter(d => d.id !== id));
    toast.success('Despesa removida');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Despesas</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de despesas do escritório</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Nova Despesa
        </button>
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="label-text px-4 py-3 text-left">Descrição</th>
              <th className="label-text px-4 py-3 text-right">Valor Mensal</th>
              <th className="label-text px-4 py-3 text-center">Tipo</th>
              <th className="label-text px-4 py-3 text-center hidden md:table-cell">Data Início</th>
              <th className="label-text px-4 py-3 text-center">Status</th>
              <th className="label-text px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {despesas.map(d => (
              <tr key={d.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{d.descricao}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(d.valorMensal)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-medium capitalize text-muted-foreground">{d.tipo}</span>
                </td>
                <td className="px-4 py-3 text-center hidden md:table-cell text-muted-foreground tabular-nums">
                  {new Date(d.dataInicio).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={d.ativo ? 'ativo' : 'inativo'} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setEditing(d); setShowForm(true); }} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showForm && (
          <DespesaFormModal
            despesa={editing}
            onClose={() => setShowForm(false)}
            onSave={(d) => {
              if (editing) {
                setDespesas(prev => prev.map(p => p.id === d.id ? d : p));
                toast.success('Despesa atualizada');
              } else {
                setDespesas(prev => [...prev, { ...d, id: Date.now() }]);
                toast.success('Despesa cadastrada');
              }
              setShowForm(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DespesaFormModal({ despesa, onClose, onSave }: { despesa: Despesa | null; onClose: () => void; onSave: (d: Despesa) => void }) {
  const [form, setForm] = useState<Partial<Despesa>>(despesa || {
    descricao: '', valorMensal: 0, tipo: 'fixa', diaPagamento: 10, dataInicio: new Date().toISOString().split('T')[0], ativo: true,
  });

  const update = (k: keyof Despesa, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} onClick={e => e.stopPropagation()} className="card-surface w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{despesa ? 'Editar Despesa' : 'Nova Despesa'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="label-text">Descrição</label>
            <input value={form.descricao || ''} onChange={e => update('descricao', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label-text">Valor (R$)</label>
              <input type="number" value={form.valorMensal || ''} onChange={e => update('valorMensal', Number(e.target.value))} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <label className="label-text">Dia Pagamento</label>
              <input type="number" min={1} max={31} value={form.diaPagamento || ''} onChange={e => update('diaPagamento', Number(e.target.value))} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all tabular-nums" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Tipo</label>
            <select value={form.tipo || 'fixa'} onChange={e => update('tipo', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all">
              <option value="fixa">Fixa</option>
              <option value="parcelada">Parcelada</option>
              <option value="eventual">Eventual</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Data Início</label>
            <input type="date" value={form.dataInicio || ''} onChange={e => update('dataInicio', e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.ativo ?? true} onChange={e => update('ativo', e.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
            <span className="text-sm">Ativo</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={() => onSave(form as Despesa)} className="px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">Salvar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
