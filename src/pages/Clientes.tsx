import { useState, useMemo } from 'react';
import { mockClientes, formatCurrency, type Cliente } from '@/data/mockData';
import StatusBadge from '@/components/shared/StatusBadge';
import { Search, Plus, Pencil, Trash2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>(mockClientes);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clientes.filter(c =>
      c.razaoSocial.toLowerCase().includes(q) ||
      c.cnpj.includes(q) ||
      c.proprietario.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }, [clientes, search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleDelete = (id: number) => {
    setClientes(prev => prev.filter(c => c.id !== id));
    toast.success('Cliente removido com sucesso');
  };

  const handleEdit = (c: Cliente) => {
    setEditingCliente(c);
    setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">{clientes.length} clientes cadastrados</p>
        </div>
        <button
          onClick={() => { setEditingCliente(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          placeholder="Buscar por nome, CNPJ, email..."
          className="w-full rounded-md border border-input bg-card pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
        />
      </div>

      {/* Table */}
      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="label-text px-4 py-3 text-left">Razão Social</th>
                <th className="label-text px-4 py-3 text-left">CNPJ</th>
                <th className="label-text px-4 py-3 text-left hidden md:table-cell">Proprietário</th>
                <th className="label-text px-4 py-3 text-left hidden lg:table-cell">Telefone</th>
                <th className="label-text px-4 py-3 text-right">Honorário</th>
                <th className="label-text px-4 py-3 text-center">Status</th>
                <th className="label-text px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(c => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.razaoSocial}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{c.cnpj}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.proprietario}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground tabular-nums">{c.telefone}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(c.honorario)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-8 w-8 rounded text-xs font-medium transition-colors ${currentPage === i + 1 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <ClienteFormModal
            cliente={editingCliente}
            onClose={() => setShowForm(false)}
            onSave={(c) => {
              if (editingCliente) {
                setClientes(prev => prev.map(p => p.id === c.id ? c : p));
                toast.success('Cliente atualizado');
              } else {
                setClientes(prev => [...prev, { ...c, id: Date.now() }]);
                toast.success('Cliente cadastrado');
              }
              setShowForm(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClienteFormModal({ cliente, onClose, onSave }: { cliente: Cliente | null; onClose: () => void; onSave: (c: Cliente) => void }) {
  const [form, setForm] = useState<Partial<Cliente>>(cliente || {
    cnpj: '', razaoSocial: '', nomeFantasia: '', proprietario: '', telefone: '', email: '',
    honorario: 0, diaVencimento: 10, tipoPagamento: 'pessoa_juridica', status: 'em_dia',
  });

  const update = (k: keyof Cliente, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="card-surface w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{cliente ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          {[
            { key: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
            { key: 'razaoSocial', label: 'Razão Social' },
            { key: 'nomeFantasia', label: 'Nome Fantasia' },
            { key: 'proprietario', label: 'Proprietário' },
            { key: 'telefone', label: 'Telefone' },
            { key: 'email', label: 'E-mail', type: 'email' },
          ].map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="label-text">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={(form as any)[f.key] || ''}
                onChange={e => update(f.key as keyof Cliente, e.target.value)}
                placeholder={f.placeholder}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label-text">Honorário (R$)</label>
              <input
                type="number"
                value={form.honorario || ''}
                onChange={e => update('honorario', Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-text">Dia Vencimento</label>
              <input
                type="number"
                min={1} max={31}
                value={form.diaVencimento || ''}
                onChange={e => update('diaVencimento', Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all tabular-nums"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Tipo Pagamento</label>
            <select
              value={form.tipoPagamento || 'pessoa_juridica'}
              onChange={e => update('tipoPagamento', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all"
            >
              <option value="pessoa_fisica">Pessoa Física</option>
              <option value="pessoa_juridica">Pessoa Jurídica</option>
              <option value="terceiros">Terceiros</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button
            onClick={() => onSave(form as Cliente)}
            className="px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Salvar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
