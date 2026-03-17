import { useCallback, useEffect, useMemo, useState } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';

type TipoPagamento = 'pessoa_fisica' | 'pessoa_juridica' | 'terceiros';
type StatusCliente = 'em_dia' | 'pendente' | 'atrasado';

interface Cliente {
  id: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  proprietario: string;
  telefone: string;
  email: string;
  honorario: number;
  diaVencimento: number;
  tipoPagamento: TipoPagamento;
  status: StatusCliente;
}

interface ClienteFormData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  proprietario: string;
  telefone: string;
  email: string;
  honorario: number;
  diaVencimento: number;
  tipoPagamento: TipoPagamento;
  status: StatusCliente;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function formatCurrencyInput(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0);
}

function parseCurrencyInput(value: string): number {
  const onlyDigits = value.replace(/\D/g, '');
  if (!onlyDigits) return 0;
  return Number(onlyDigits) / 100;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function maskCnpj(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 14);
  return nums
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function maskTelefone(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 10) {
    return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function normalizeClienteFromApi(raw: any): Cliente {
  return {
    id: Number(raw.id),
    cnpj: String(raw.cnpj || ''),
    razaoSocial: String(raw.razaoSocial || ''),
    nomeFantasia: String(raw.nomeFantasia || ''),
    proprietario: String(raw.proprietario || ''),
    telefone: String(raw.telefone || ''),
    email: String(raw.email || ''),
    honorario: Number(raw.honorario || 0),
    diaVencimento: Number(raw.diaVencimento || 10),
    tipoPagamento: (raw.tipoPagamento || 'pessoa_juridica') as TipoPagamento,
    status: (raw.status || 'em_dia') as StatusCliente,
  };
}

export default function Clientes() {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const location = useLocation();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [prefillCliente, setPrefillCliente] = useState<Partial<ClienteFormData> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8;

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
      return body?.message || 'Erro ao processar operação de cliente';
    } catch {
      return 'Erro ao processar operação de cliente';
    }
  };

  const carregarClientes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/clientes`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      const data = await response.json();
      setClientes((Array.isArray(data) ? data : []).map(normalizeClienteFromApi));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void carregarClientes();
  }, [carregarClientes]);

  useEffect(() => {
    const prefill = (location.state as any)?.prefillCliente;
    if (!prefill) return;
    const draft: Partial<ClienteFormData> = {
      cnpj: maskCnpj(String(prefill.cnpj || '')),
      razaoSocial: String(prefill.razaoSocial || ''),
      nomeFantasia: String(prefill.nomeFantasia || ''),
      proprietario: String(prefill.proprietario || ''),
      telefone: String(prefill.telefone || ''),
      email: String(prefill.email || ''),
    };
    setEditingCliente(null);
    setPrefillCliente(draft);
    setShowForm(true);
    navigate('/clientes', { replace: true, state: {} });
  }, [location.state, navigate]);

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

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente remover este cliente?')) return;
    try {
      const response = await fetch(`${apiBaseUrl}/clientes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      setClientes(prev => prev.filter(c => c.id !== id));
      toast.success('Cliente removido com sucesso');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover cliente');
    }
  };

  const handleEdit = (c: Cliente) => {
    setEditingCliente(c);
    setShowForm(true);
  };

  const handleSave = async (form: ClienteFormData, clienteId?: number) => {
    const cnpjNumerico = form.cnpj.replace(/\D/g, '');
    if (cnpjNumerico.length !== 14) {
      toast.error('CNPJ inválido');
      return;
    }
    if (!form.razaoSocial.trim()) {
      toast.error('Razão social é obrigatória');
      return;
    }
    if (form.email.trim() && !isValidEmail(form.email.trim())) {
      toast.error('Digite um e-mail válido');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cnpj: cnpjNumerico,
        razaoSocial: form.razaoSocial.trim(),
        nomeFantasia: form.nomeFantasia.trim(),
        proprietario: form.proprietario.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim() || null,
        honorario: Number(form.honorario || 0),
        diaVencimento: Number(form.diaVencimento || 10),
        tipoPagamento: form.tipoPagamento,
        status: form.status,
      };

      const response = await fetch(
        clienteId ? `${apiBaseUrl}/clientes/${clienteId}` : `${apiBaseUrl}/clientes`,
        {
          method: clienteId ? 'PUT' : 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const saved = normalizeClienteFromApi(await response.json());
      if (clienteId) {
        setClientes(prev => prev.map(c => (c.id === saved.id ? saved : c)));
        toast.success('Cliente atualizado');
      } else {
        setClientes(prev => [...prev, saved]);
        toast.success('Cliente cadastrado');
      }
      setShowForm(false);
      setEditingCliente(null);
      setPrefillCliente(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">{clientes.length} clientes cadastrados</p>
        </div>
        <button
          onClick={() => { setEditingCliente(null); setPrefillCliente(null); setShowForm(true); }}
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
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
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="label-text px-3 sm:px-4 py-3 text-left whitespace-nowrap">Razão Social</th>
                <th className="label-text px-3 sm:px-4 py-3 text-left whitespace-nowrap">CNPJ</th>
                <th className="label-text px-3 sm:px-4 py-3 text-left hidden md:table-cell">Proprietário</th>
                <th className="label-text px-3 sm:px-4 py-3 text-left hidden lg:table-cell">Telefone</th>
                <th className="label-text px-3 sm:px-4 py-3 text-right whitespace-nowrap">Honorário</th>
                <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap">Status</th>
                <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Carregando clientes...</td>
                </tr>
              )}
              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Nenhum cliente encontrado</td>
                </tr>
              )}
              {paginated.map(c => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-3 sm:px-4 py-3 font-medium max-w-[120px] sm:max-w-none truncate" title={c.razaoSocial}>{c.razaoSocial}</td>
                  <td className="px-3 sm:px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap">{maskCnpj(c.cnpj)}</td>
                  <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-muted-foreground">{c.proprietario}</td>
                  <td className="px-3 sm:px-4 py-3 hidden lg:table-cell text-muted-foreground tabular-nums">{c.telefone}</td>
                  <td className="px-3 sm:px-4 py-3 text-right tabular-nums font-medium whitespace-nowrap">{formatCurrency(c.honorario)}</td>
                  <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap"><StatusBadge status={c.status} /></td>
                  <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                      <button onClick={() => void handleDelete(c.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
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
            prefill={prefillCliente}
            loading={saving}
            onClose={() => setShowForm(false)}
            onSave={(c) => void handleSave(c, editingCliente?.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClienteFormModal({
  cliente,
  prefill,
  onClose,
  onSave,
  loading,
}: {
  cliente: Cliente | null;
  prefill: Partial<ClienteFormData> | null;
  onClose: () => void;
  onSave: (c: ClienteFormData) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<ClienteFormData>(
    cliente ? {
      cnpj: maskCnpj(cliente.cnpj),
      razaoSocial: cliente.razaoSocial,
      nomeFantasia: cliente.nomeFantasia,
      proprietario: cliente.proprietario,
      telefone: cliente.telefone,
      email: cliente.email,
      honorario: cliente.honorario,
      diaVencimento: cliente.diaVencimento,
      tipoPagamento: cliente.tipoPagamento,
      status: cliente.status,
    } : {
      cnpj: prefill?.cnpj || '',
      razaoSocial: prefill?.razaoSocial || '',
      nomeFantasia: prefill?.nomeFantasia || '',
      proprietario: prefill?.proprietario || '',
      telefone: prefill?.telefone || '',
      email: prefill?.email || '',
      honorario: 0,
      diaVencimento: 10,
      tipoPagamento: 'pessoa_juridica',
      status: 'em_dia',
    }
  );

  const update = <K extends keyof ClienteFormData>(k: K, v: ClienteFormData[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));
  const [honorarioInput, setHonorarioInput] = useState(formatCurrencyInput(form.honorario));
  const emailInvalido = form.email.trim().length > 0 && !isValidEmail(form.email.trim());

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
                onChange={e => {
                  if (f.key === 'cnpj') {
                    update('cnpj', maskCnpj(e.target.value));
                    return;
                  }
                  if (f.key === 'telefone') {
                    update('telefone', maskTelefone(e.target.value));
                    return;
                  }
                  update(f.key as keyof ClienteFormData, e.target.value as any);
                }}
                placeholder={f.placeholder}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all"
              />
              {f.key === 'email' && emailInvalido && (
                <p className="text-xs text-destructive">Digite um e-mail válido (ex.: nome@empresa.com)</p>
              )}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label-text">Honorário (R$)</label>
              <input
                type="text"
                inputMode="numeric"
                value={honorarioInput}
                onChange={e => {
                  const parsed = parseCurrencyInput(e.target.value);
                  setHonorarioInput(formatCurrencyInput(parsed));
                  update('honorario', parsed);
                }}
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
              onChange={e => update('tipoPagamento', e.target.value as TipoPagamento)}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all"
            >
              <option value="pessoa_fisica">Pessoa Física</option>
              <option value="pessoa_juridica">Pessoa Jurídica</option>
              <option value="terceiros">Terceiros</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Status</label>
            <select
              value={form.status}
              onChange={e => update('status', e.target.value as StatusCliente)}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all"
            >
              <option value="em_dia">Em dia</option>
              <option value="pendente">Pendente</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button
            disabled={loading}
            onClick={() => onSave(form)}
            className="px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
