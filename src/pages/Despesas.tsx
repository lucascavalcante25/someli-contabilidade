import { useCallback, useEffect, useMemo, useState } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const TIPOS_DESPESA = [
  { value: 'fixa', label: 'Fixa' },
  { value: 'parcelada', label: 'Parcelada' },
  { value: 'recorrente', label: 'Recorrente' },
  { value: 'cartao', label: 'Cartão de Crédito' },
] as const;

const TIPOS_DESPESA_MOBILE: Record<string, string> = {
  fixa: 'Fixa',
  parcelada: 'Parcel.',
  recorrente: 'Recorr.',
  cartao: 'Cartão',
};

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

function getAuthHeaders() {
  const token = localStorage.getItem('someli_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || ''}`,
  };
}

interface Despesa {
  id: number;
  descricao: string;
  valorMensal: number;
  tipo: string;
  diaPagamento: number;
  dataInicio: string;
  parcelas?: number;
  parcelaAtual?: number;
  ativo: boolean;
}

export default function Despesas() {
  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:8080', []);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Despesa | null>(null);

  const carregarDespesas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/despesas`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Erro ao carregar despesas');
      const data = await res.json();
      setDespesas(
        (Array.isArray(data) ? data : []).map((d: any) => ({
          id: d.id,
          descricao: d.descricao ?? '',
          valorMensal: Number(d.valorMensal ?? 0),
          tipo: d.tipo ?? 'fixa',
          diaPagamento: d.diaPagamento ?? 10,
          dataInicio: d.dataInicio ?? new Date().toISOString().split('T')[0],
          parcelas: d.parcelas,
          parcelaAtual: d.parcelaAtual,
          ativo: d.ativo !== false,
        }))
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void carregarDespesas();
  }, [carregarDespesas]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente remover esta despesa?')) return;
    try {
      const res = await fetch(`${apiBaseUrl}/despesas/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Erro ao remover despesa');
      setDespesas((prev) => prev.filter((d) => d.id !== id));
      toast.success('Despesa removida');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover despesa');
    }
  };

  const handleSave = async (form: Partial<Despesa>) => {
    try {
      if (editing) {
        const res = await fetch(`${apiBaseUrl}/despesas/${editing.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            descricao: form.descricao,
            valorMensal: form.valorMensal,
            tipo: form.tipo,
            diaPagamento: form.diaPagamento,
            dataInicio: form.dataInicio,
            parcelas: form.parcelas,
            parcelaAtual: form.parcelaAtual,
            ativo: form.ativo,
          }),
        });
        if (!res.ok) throw new Error('Erro ao atualizar despesa');
        const data = await res.json();
        setDespesas((prev) => prev.map((d) => (d.id === editing.id ? { ...d, ...data } : d)));
        toast.success('Despesa atualizada');
      } else {
        const res = await fetch(`${apiBaseUrl}/despesas`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            descricao: form.descricao,
            valorMensal: form.valorMensal,
            tipo: form.tipo ?? 'fixa',
            diaPagamento: form.diaPagamento ?? 10,
            dataInicio: form.dataInicio ?? new Date().toISOString().split('T')[0],
            parcelas: form.parcelas,
            parcelaAtual: form.parcelaAtual ?? 1,
          }),
        });
        if (!res.ok) throw new Error('Erro ao cadastrar despesa');
        const data = await res.json();
        setDespesas((prev) => [...prev, { ...form, ...data } as Despesa]);
        toast.success('Despesa cadastrada');
      }
      setShowForm(false);
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar despesa');
    }
  };

  if (loading && despesas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Despesas</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de despesas do escritório</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> Nova Despesa
        </button>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="bg-muted/50">
              <th className="label-text px-3 sm:px-4 py-3 text-left whitespace-nowrap">Descrição</th>
              <th className="label-text px-3 sm:px-4 py-3 text-right whitespace-nowrap">Valor</th>
              <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap">Tipo</th>
              <th className="label-text px-3 sm:px-4 py-3 text-center hidden md:table-cell">Parcelas</th>
              <th className="label-text px-3 sm:px-4 py-3 text-center hidden md:table-cell">Data Início</th>
              <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap">Status</th>
              <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {despesas.map((d) => (
              <tr key={d.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-3 sm:px-4 py-3 font-medium max-w-[100px] sm:max-w-none truncate" title={d.descricao}>{d.descricao}</td>
                <td className="px-3 sm:px-4 py-3 text-right tabular-nums font-medium whitespace-nowrap">{formatCurrency(d.valorMensal)}</td>
                <td className="px-3 sm:px-4 py-3 text-center">
                  <span className="text-xs font-medium text-muted-foreground md:hidden" title={TIPOS_DESPESA.find((t) => t.value === d.tipo)?.label}>
                    {TIPOS_DESPESA_MOBILE[d.tipo] ?? d.tipo}
                  </span>
                  <span className="text-xs font-medium capitalize text-muted-foreground hidden md:inline">
                    {TIPOS_DESPESA.find((t) => t.value === d.tipo)?.label ?? d.tipo}
                  </span>
                </td>
                <td className="px-3 sm:px-4 py-3 text-center hidden md:table-cell text-muted-foreground tabular-nums">
                  {d.parcelas != null ? `${d.parcelaAtual ?? 1}/${d.parcelas}` : '—'}
                </td>
                <td className="px-3 sm:px-4 py-3 text-center hidden md:table-cell text-muted-foreground tabular-nums">
                  {d.dataInicio ? new Date(d.dataInicio).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                  <StatusBadge status={d.ativo ? 'ativo' : 'inativo'} />
                </td>
                <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => {
                        setEditing(d);
                        setShowForm(true);
                      }}
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {despesas.length === 0 && (
          <div className="px-4 py-12 text-center text-muted-foreground">
            Nenhuma despesa cadastrada. Clique em &quot;Nova Despesa&quot; para começar.
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <DespesaFormModal
            despesa={editing}
            tipos={TIPOS_DESPESA}
            onClose={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DespesaFormModal({
  despesa,
  tipos,
  onClose,
  onSave,
}: {
  despesa: Despesa | null;
  tipos: readonly { value: string; label: string }[];
  onClose: () => void;
  onSave: (d: Partial<Despesa>) => void;
}) {
  const [form, setForm] = useState<Partial<Despesa>>(
    despesa || {
      descricao: '',
      valorMensal: 0,
      tipo: 'fixa',
      diaPagamento: 10,
      dataInicio: new Date().toISOString().split('T')[0],
      parcelas: undefined,
      parcelaAtual: 1,
      ativo: true,
    }
  );

  const showParcelas = form.tipo === 'parcelada' || form.tipo === 'cartao';

  const update = (k: keyof Despesa, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

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
        onClick={(e) => e.stopPropagation()}
        className="card-surface w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{despesa ? 'Editar Despesa' : 'Nova Despesa'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="label-text">Descrição</label>
            <input
              value={form.descricao || ''}
              onChange={(e) => update('descricao', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all"
              placeholder="Ex: Aluguel, Software, Internet..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="label-text">Valor (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={formatCurrencyInput(form.valorMensal ?? 0)}
                onChange={(e) => update('valorMensal', parseCurrencyInput(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all tabular-nums"
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-text">Dia Pagamento</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.diaPagamento ?? ''}
                onChange={(e) => update('diaPagamento', Number(e.target.value) || 10)}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all tabular-nums"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="label-text">Tipo</label>
            <select
              value={form.tipo || 'fixa'}
              onChange={(e) => {
                const v = e.target.value;
                update('tipo', v);
                if (v !== 'parcelada' && v !== 'cartao') {
                  update('parcelas', undefined);
                  update('parcelaAtual', 1);
                }
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all"
            >
              {tipos.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {showParcelas && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="label-text">Total de Parcelas</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={form.parcelas ?? ''}
                  onChange={(e) => update('parcelas', Number(e.target.value) || undefined)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all tabular-nums"
                  placeholder="Ex: 12"
                />
              </div>
              {despesa && (
                <div className="space-y-1.5">
                  <label className="label-text">Parcela Atual</label>
                  <input
                    type="number"
                    min={1}
                    max={form.parcelas ?? 12}
                    value={form.parcelaAtual ?? ''}
                    onChange={(e) => update('parcelaAtual', Number(e.target.value) || 1)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all tabular-nums"
                  />
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="label-text">Data Início</label>
            <input
              type="date"
              value={form.dataInicio || ''}
              onChange={(e) => update('dataInicio', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all"
            />
          </div>
          {despesa && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.ativo ?? true}
                onChange={(e) => update('ativo', e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm">Ativo</span>
            </label>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.descricao?.trim() || (form.valorMensal ?? 0) < 0}
            className="px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salvar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
