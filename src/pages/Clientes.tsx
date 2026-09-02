import React, { useCallback, useEffect, useMemo, useState } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import AppSelect from '@/components/shared/AppSelect';
import DateField from '@/components/shared/DateField';
import { Search, Plus, Pencil, Trash2, X, Eye, Info, ChevronDown, ChevronRight, Download, File, FileText, Image, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import ListPagination from '@/components/shared/ListPagination';
import TableScroll from '@/components/shared/TableScroll';
import ModalShell from '@/components/shared/ModalShell';
import { PAGE_SIZE } from '@/lib/constants';
import { ClienteDetalhePanel } from '@/pages/ClienteDetalhe';

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
  dataInicioCobranca?: string;
  responsavelId?: number;
  responsavelNome?: string;
  indicacao?: string;
  formaPagamento?: string;
  ativo?: boolean;
  mesesPendentes?: number;
  mesesPendentesDetalhe?: string[];
  valorPendente?: number;
  dataFimCobranca?: string;
}

interface UsuarioResumo {
  id: number;
  nome: string;
}

interface ClienteObrigacaoFormItem {
  id?: number;
  _key?: number;
  obrigacaoId: number;
  obrigacaoNome?: string;
  dataVencimento: string;
  observacao: string;
}

interface ClienteDocumento {
  id: number;
  clienteId: number;
  nomeArquivo: string;
  tipoArquivo: string;
  dataUpload?: string;
  descricao?: string;
}

type SortKey = 'razaoSocial' | 'cnpj' | 'responsavel' | 'telefone' | 'honorario' | 'status' | 'ativo';
type SortDir = 'asc' | 'desc';
type SortRule = { key: SortKey; dir: SortDir };

const STATUS_SORT_ORDER: Record<string, number> = {
  em_dia: 0,
  pendente: 1,
  proximo_vencimento: 2,
  atrasado: 3,
  nao_iniciado: 4,
  inativo: 5,
};

function compareClientes(a: Cliente, b: Cliente, key: SortKey, dir: SortDir): number {
  const mul = dir === 'asc' ? 1 : -1;
  let cmp = 0;
  switch (key) {
    case 'razaoSocial':
      cmp = a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR', { sensitivity: 'base' });
      break;
    case 'cnpj':
      cmp = (a.cnpj || '').localeCompare(b.cnpj || '', 'pt-BR');
      break;
    case 'responsavel':
      cmp = (a.responsavelNome || '').localeCompare(b.responsavelNome || '', 'pt-BR', { sensitivity: 'base' });
      break;
    case 'telefone':
      cmp = (a.telefone || '').localeCompare(b.telefone || '', 'pt-BR');
      break;
    case 'honorario':
      cmp = (a.honorario || 0) - (b.honorario || 0);
      break;
    case 'ativo':
      cmp = (a.ativo === false ? 1 : 0) - (b.ativo === false ? 1 : 0);
      break;
    case 'status': {
      // Inativos depois dos ativos; depois pela gravidade do status e meses pendentes
      const aIn = a.ativo === false ? 1 : 0;
      const bIn = b.ativo === false ? 1 : 0;
      if (aIn !== bIn) {
        cmp = aIn - bIn;
        break;
      }
      const aSt = STATUS_SORT_ORDER[a.status] ?? 9;
      const bSt = STATUS_SORT_ORDER[b.status] ?? 9;
      cmp = aSt - bSt;
      if (cmp === 0) cmp = (a.mesesPendentes ?? 0) - (b.mesesPendentes ?? 0);
      if (cmp === 0) cmp = (a.valorPendente ?? 0) - (b.valorPendente ?? 0);
      break;
    }
    default:
      cmp = 0;
  }
  return cmp * mul;
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
  dataInicioCobranca?: string;
  responsavelId?: number;
  indicacao?: string;
  formaPagamento?: string;
  ativo?: boolean;
  clienteObrigacoes: ClienteObrigacaoFormItem[];
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

function getPrimeiroDiaMesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function isCobravel(dataInicioCobranca?: string): boolean {
  if (!dataInicioCobranca) return true;
  return new Date(dataInicioCobranca) <= new Date();
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
    dataInicioCobranca: raw.dataInicioCobranca ? String(raw.dataInicioCobranca).slice(0, 10) : undefined,
    responsavelId: raw.responsavelId ? Number(raw.responsavelId) : undefined,
    responsavelNome: raw.responsavelNome ? String(raw.responsavelNome) : undefined,
    indicacao: raw.indicacao ? String(raw.indicacao) : undefined,
    formaPagamento: raw.formaPagamento ? String(raw.formaPagamento) : undefined,
    ativo: raw.ativo !== false,
    mesesPendentes: raw.mesesPendentes != null ? Number(raw.mesesPendentes) : undefined,
    mesesPendentesDetalhe: Array.isArray(raw.mesesPendentesDetalhe)
      ? raw.mesesPendentesDetalhe.map(String)
      : undefined,
    valorPendente: raw.valorPendente != null ? Number(raw.valorPendente) : undefined,
    dataFimCobranca: raw.dataFimCobranca ? String(raw.dataFimCobranca).slice(0, 10) : undefined,
  };
}

function SortableTh({
  label,
  sortKey,
  sortRules,
  onSort,
  align = 'left',
  className = '',
}: {
  label: string;
  sortKey: SortKey;
  sortRules: SortRule[];
  onSort: (key: SortKey, multi: boolean) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  const idx = sortRules.findIndex((r) => r.key === sortKey);
  const active = idx >= 0;
  const dir = active ? sortRules[idx].dir : null;
  const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  const textAlign = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <th className={`label-text px-3 sm:px-4 py-3 ${textAlign} whitespace-nowrap ${className}`}>
      <button
        type="button"
        onClick={(e) => onSort(sortKey, e.shiftKey)}
        className={`inline-flex items-center gap-1.5 max-w-full group transition-colors ${alignClass} ${
          active ? 'text-foreground' : 'text-inherit hover:text-foreground'
        }`}
        title="Clique para ordenar · Shift+clique para combinar"
      >
        <span className="truncate">{label}</span>
        {active ? (
          <span className="inline-flex items-center gap-0.5 shrink-0 text-primary">
            {dir === 'asc' ? <ArrowUp size={13} strokeWidth={2.5} /> : <ArrowDown size={13} strokeWidth={2.5} />}
            {sortRules.length > 1 ? (
              <span className="text-[9px] font-bold tabular-nums">{idx + 1}</span>
            ) : null}
          </span>
        ) : (
          <ArrowUpDown size={13} strokeWidth={2.25} className="opacity-55 group-hover:opacity-100 shrink-0 text-primary" />
        )}
      </button>
    </th>
  );
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
  const [viewingCliente, setViewingCliente] = useState<Cliente | null>(null);
  const [prefillCliente, setPrefillCliente] = useState<Partial<ClienteFormData> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = PAGE_SIZE;
  const [expandedClienteId, setExpandedClienteId] = useState<number | null>(null);
  const [documentosPorCliente, setDocumentosPorCliente] = useState<Record<number, ClienteDocumento[]>>({});
  const [loadingDocumentos, setLoadingDocumentos] = useState<number | null>(null);
  // Padrão: ativos primeiro, depois A–Z. Shift+clique adiciona critério.
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { key: 'ativo', dir: 'asc' },
    { key: 'razaoSocial', dir: 'asc' },
  ]);

  const toggleSort = useCallback((key: SortKey, multi: boolean) => {
    setSortRules((prev) => {
      const idx = prev.findIndex((r) => r.key === key);
      if (!multi) {
        if (idx === 0) {
          const nextDir: SortDir = prev[0].dir === 'asc' ? 'desc' : 'asc';
          return [{ key, dir: nextDir }];
        }
        return [{ key, dir: 'asc' }];
      }
      // Shift: adiciona/alterna sem remover os outros
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { key, dir: copy[idx].dir === 'asc' ? 'desc' : 'asc' };
        return copy;
      }
      return [...prev, { key, dir: 'asc' }];
    });
    setCurrentPage(1);
  }, []);

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
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
      const response = await apiFetch(`${apiBaseUrl}/clientes`, {
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
    const state = (location.state || {}) as {
      prefillCliente?: any;
      viewClienteId?: number;
      editClienteId?: number;
    };

    if (state.prefillCliente) {
      const prefill = state.prefillCliente;
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
      return;
    }

    if (!clientes.length) return;

    if (state.viewClienteId) {
      const c = clientes.find((x) => x.id === Number(state.viewClienteId));
      if (c) setViewingCliente(c);
      navigate('/clientes', { replace: true, state: {} });
      return;
    }

    if (state.editClienteId) {
      const c = clientes.find((x) => x.id === Number(state.editClienteId));
      if (c) {
        setViewingCliente(null);
        setEditingCliente(c);
        setShowForm(true);
      }
      navigate('/clientes', { replace: true, state: {} });
    }
  }, [location.state, navigate, clientes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = clientes.filter(c =>
      c.razaoSocial.toLowerCase().includes(q) ||
      c.cnpj.includes(q) ||
      c.proprietario.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
    const rules = sortRules.length
      ? sortRules
      : ([{ key: 'ativo', dir: 'asc' }, { key: 'razaoSocial', dir: 'asc' }] as SortRule[]);
    return [...list].sort((a, b) => {
      for (const rule of rules) {
        const cmp = compareClientes(a, b, rule.key, rule.dir);
        if (cmp !== 0) return cmp;
      }
      return a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR', { sensitivity: 'base' });
    });
  }, [clientes, search, sortRules]);

  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente remover este cliente?')) return;
    try {
      const response = await apiFetch(`${apiBaseUrl}/clientes/${id}`, {
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
    setViewingCliente(null);
    setEditingCliente(c);
    setShowForm(true);
  };

  const handleView = (c: Cliente) => {
    setViewingCliente(c);
  };

  const toggleExpand = async (clienteId: number) => {
    if (expandedClienteId === clienteId) {
      setExpandedClienteId(null);
      return;
    }
    setExpandedClienteId(clienteId);
    if (!documentosPorCliente[clienteId]) {
      setLoadingDocumentos(clienteId);
      try {
        const res = await apiFetch(`${apiBaseUrl}/clientes/${clienteId}/documentos`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          const docs = (Array.isArray(data) ? data : []).map((d: any) => ({
            id: d.id,
            clienteId: d.clienteId,
            nomeArquivo: d.nomeArquivo || '',
            tipoArquivo: d.tipoArquivo || '',
            dataUpload: d.dataUpload || '',
            descricao: d.descricao || '',
          }));
          setDocumentosPorCliente(prev => ({ ...prev, [clienteId]: docs }));
        } else {
          setDocumentosPorCliente(prev => ({ ...prev, [clienteId]: [] }));
        }
      } catch {
        setDocumentosPorCliente(prev => ({ ...prev, [clienteId]: [] }));
      } finally {
        setLoadingDocumentos(null);
      }
    }
  };

  const handleDownloadDoc = async (clienteId: number, doc: ClienteDocumento) => {
    try {
      const res = await apiFetch(`${apiBaseUrl}/clientes/${clienteId}/documentos/${doc.id}`, { headers: {} });
      if (!res.ok) throw new Error('Erro ao baixar');
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = doc.nomeArquivo || 'documento';
      a.click();
      URL.revokeObjectURL(u);
      toast.success('Download iniciado');
    } catch {
      toast.error('Erro ao baixar documento');
    }
  };

  const getDocIcon = (tipo: string, nome: string) => {
    const ext = (nome || '').toLowerCase().split('.').pop() || '';
    if (tipo?.includes('pdf') || ext === 'pdf') return FileText;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || tipo?.includes('image')) return Image;
    return File;
  };

  const handleSave = async (form: ClienteFormData, clienteId?: number) => {
    const cnpjNumerico = form.cnpj.replace(/\D/g, '');
    if (cnpjNumerico.length > 0 && cnpjNumerico.length !== 14) {
      toast.error('CNPJ inválido (use 14 dígitos ou deixe em branco)');
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
    const obrigacoes = form.clienteObrigacoes ?? [];
    const obrigacoesSemData = obrigacoes.filter(o => !o.dataVencimento?.trim());
    if (obrigacoesSemData.length > 0) {
      toast.error('Informe a data de vencimento para todas as obrigações');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cnpj: cnpjNumerico || null,
        razaoSocial: form.razaoSocial.trim(),
        nomeFantasia: form.nomeFantasia.trim(),
        proprietario: form.proprietario.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim() || null,
        honorario: Number(form.honorario || 0),
        diaVencimento: Number(form.diaVencimento || 10),
        tipoPagamento: form.tipoPagamento,
        status: form.status,
        dataInicioCobranca: form.dataInicioCobranca || null,
        responsavelId: form.responsavelId || null,
        indicacao: form.indicacao?.trim() || null,
        formaPagamento: form.formaPagamento || null,
        ativo: form.ativo !== false,
      };

      const response = await apiFetch(
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

      let idsAntes: Set<number> = new Set();
      if (clienteId) {
        const resObr = await apiFetch(`${apiBaseUrl}/clientes/${clienteId}/obrigacoes`, { headers: getAuthHeaders() });
        if (resObr.ok) {
          const atuais = await resObr.json();
          idsAntes = new Set((Array.isArray(atuais) ? atuais : []).map((o: any) => o.id).filter(Boolean));
        }
      }

      for (const obr of obrigacoes) {
        if (obr.id) {
          const res = await apiFetch(`${apiBaseUrl}/clientes/${saved.id}/obrigacoes/${obr.id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ dataVencimento: obr.dataVencimento, ativo: true, observacao: obr.observacao?.trim() || null }),
          });
          if (!res.ok) throw new Error(await parseApiError(res));
        } else {
          const res = await apiFetch(`${apiBaseUrl}/clientes/${saved.id}/obrigacoes`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ clienteId: saved.id, obrigacaoId: obr.obrigacaoId, dataVencimento: obr.dataVencimento, ativo: true, observacao: obr.observacao?.trim() || null }),
          });
          if (!res.ok) throw new Error(await parseApiError(res));
        }
      }

      const idsMantidos = new Set(obrigacoes.filter(o => o.id).map(o => o.id!));
      for (const id of idsAntes) {
        if (!idsMantidos.has(id)) {
          await apiFetch(`${apiBaseUrl}/clientes/${saved.id}/obrigacoes/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        }
      }

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
    <div className="page-shell">
      <div className="page-header">
        <div className="min-w-0">
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar por nome, CNPJ, email..."
            className="w-full rounded-md border border-input bg-card pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
          />
        </div>
        <p className="text-[11px] text-muted-foreground sm:text-right">
          Clique no cabeçalho para ordenar · <kbd className="px-1 rounded border border-border text-[10px]">Shift</kbd>+clique para combinar critérios
        </p>
      </div>

      {/* Table */}
      <div className="card-surface overflow-hidden max-w-full">
        <TableScroll>
          <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="label-text px-2 py-3 text-center w-9"></th>
                <SortableTh label="Razão Social" sortKey="razaoSocial" sortRules={sortRules} onSort={toggleSort} align="left" />
                <SortableTh label="CNPJ" sortKey="cnpj" sortRules={sortRules} onSort={toggleSort} align="left" className="hidden sm:table-cell" />
                <SortableTh label="Responsável" sortKey="responsavel" sortRules={sortRules} onSort={toggleSort} align="left" className="hidden md:table-cell" />
                <SortableTh label="Telefone" sortKey="telefone" sortRules={sortRules} onSort={toggleSort} align="left" className="hidden lg:table-cell" />
                <SortableTh label="Honorário" sortKey="honorario" sortRules={sortRules} onSort={toggleSort} align="right" />
                <SortableTh label="Status Pagamento" sortKey="status" sortRules={sortRules} onSort={toggleSort} align="center" />
                <SortableTh label="Situação" sortKey="ativo" sortRules={sortRules} onSort={toggleSort} align="center" />
                <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">Carregando clientes...</td>
                </tr>
              )}
              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">Nenhum cliente encontrado</td>
                </tr>
              )}
              {paginated.map(c => (
                <React.Fragment key={c.id}>
                <tr className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-2 py-3 text-center">
                    <button
                      onClick={() => void toggleExpand(c.id)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title={expandedClienteId === c.id ? 'Recolher' : 'Ver documentos'}
                    >
                      {expandedClienteId === c.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </td>
                  <td className="px-3 sm:px-4 py-3 font-medium min-w-[120px] max-w-[180px] sm:max-w-none">
                    <span className={`block truncate ${c.ativo === false ? 'line-through text-muted-foreground' : ''}`} title={c.razaoSocial}>{c.razaoSocial}</span>
                    {c.ativo === false && <span className="text-[10px] uppercase text-muted-foreground">(inativo)</span>}
                    <span className="sm:hidden text-[11px] text-muted-foreground tabular-nums block truncate">{c.cnpj ? maskCnpj(c.cnpj) : '—'}</span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap hidden sm:table-cell">{c.cnpj ? maskCnpj(c.cnpj) : '—'}</td>
                  <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-muted-foreground">{c.responsavelNome || '—'}</td>
                  <td className="px-3 sm:px-4 py-3 hidden lg:table-cell text-muted-foreground tabular-nums">{c.telefone}</td>
                  <td className="px-3 sm:px-4 py-3 text-right tabular-nums font-medium whitespace-nowrap">{formatCurrency(c.honorario)}</td>
                  <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex flex-col items-center gap-0.5">
                      {!isCobravel(c.dataInicioCobranca) ? (
                        <>
                          <StatusBadge status="nao_iniciado" />
                          {c.dataInicioCobranca && (
                            <span className="text-[10px] text-muted-foreground">Cobrança inicia em: {new Date(c.dataInicioCobranca + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          )}
                        </>
                      ) : (
                        <StatusBadge
                          status={c.status}
                          mesesPendentes={c.mesesPendentes}
                          mesesPendentesDetalhe={c.mesesPendentesDetalhe}
                          valorPendente={c.valorPendente}
                          ativo={c.ativo !== false}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                    <span className={`text-xs font-medium ${c.ativo === false ? 'text-muted-foreground' : 'text-success'}`}>
                      {c.ativo === false ? 'Inativo' : 'Ativo'}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleView(c)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Ver detalhes"><Eye size={14} /></button>
                      <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Editar"><Pencil size={14} /></button>
                      <button onClick={() => void handleDelete(c.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
                {expandedClienteId === c.id && (
                  <tr key={`${c.id}-exp`} className="border-t border-border bg-muted/20">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="pl-8">
                        <p className="label-text font-medium mb-2">Documentos do cliente</p>
                        {loadingDocumentos === c.id ? (
                          <p className="text-sm text-muted-foreground py-4">Carregando...</p>
                        ) : !documentosPorCliente[c.id]?.length ? (
                          <p className="text-sm text-muted-foreground py-4">Nenhum documento anexado</p>
                        ) : (
                          <table className="w-full text-sm border border-border rounded-md overflow-hidden">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="label-text px-3 py-2 text-left w-8"></th>
                                <th className="label-text px-3 py-2 text-left">Nome</th>
                                <th className="label-text px-3 py-2 text-left hidden sm:table-cell">Descrição</th>
                                <th className="label-text px-3 py-2 text-left">Data</th>
                                <th className="label-text px-3 py-2 text-center w-20">Download</th>
                              </tr>
                            </thead>
                            <tbody>
                              {documentosPorCliente[c.id].map(doc => {
                                const Icon = getDocIcon(doc.tipoArquivo, doc.nomeArquivo);
                                return (
                                  <tr key={doc.id} className="border-t border-border hover:bg-background/50">
                                    <td className="px-3 py-2"><Icon size={14} className="text-muted-foreground" /></td>
                                    <td className="px-3 py-2 font-medium truncate max-w-[150px]" title={doc.nomeArquivo}>{doc.nomeArquivo}</td>
                                    <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground truncate max-w-[120px]">{doc.descricao || '—'}</td>
                                    <td className="px-3 py-2 text-muted-foreground text-xs">{doc.dataUpload ? new Date(doc.dataUpload).toLocaleDateString('pt-BR') : '—'}</td>
                                    <td className="px-3 py-2 text-center">
                                      <button onClick={() => void handleDownloadDoc(c.id, doc)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" title="Baixar"><Download size={14} /></button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <ListPagination
          totalItems={filtered.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageSize={perPage}
        />
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <ClienteFormModal
            cliente={editingCliente}
            prefill={prefillCliente}
            loading={saving}
            apiBaseUrl={apiBaseUrl}
            getAuthHeaders={getAuthHeaders}
            parseApiError={parseApiError}
            onClose={() => setShowForm(false)}
            onSave={(c) => void handleSave(c, editingCliente?.id)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingCliente && (
          <ModalShell onClose={() => setViewingCliente(null)} maxWidth="2xl">
            <ClienteDetalhePanel
              clienteId={viewingCliente.id}
              variant="modal"
              onClose={() => setViewingCliente(null)}
              onEdit={() => {
                const c = viewingCliente;
                setViewingCliente(null);
                handleEdit(c);
              }}
            />
          </ModalShell>
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
  apiBaseUrl,
  getAuthHeaders,
  parseApiError,
}: {
  cliente: Cliente | null;
  prefill: Partial<ClienteFormData> | null;
  onClose: () => void;
  onSave: (c: ClienteFormData) => void;
  loading: boolean;
  apiBaseUrl: string;
  getAuthHeaders: () => Record<string, string>;
  parseApiError: (r: Response) => Promise<string>;
}) {
  const [form, setForm] = useState<ClienteFormData>({
    cnpj: cliente ? maskCnpj(cliente.cnpj) : (prefill?.cnpj || ''),
    razaoSocial: cliente?.razaoSocial ?? prefill?.razaoSocial ?? '',
    nomeFantasia: cliente?.nomeFantasia ?? prefill?.nomeFantasia ?? '',
    proprietario: cliente?.proprietario ?? prefill?.proprietario ?? '',
    telefone: cliente?.telefone ?? prefill?.telefone ?? '',
    email: cliente?.email ?? prefill?.email ?? '',
    honorario: cliente?.honorario ?? prefill?.honorario ?? 0,
    diaVencimento: cliente?.diaVencimento ?? prefill?.diaVencimento ?? 10,
    tipoPagamento: (cliente?.tipoPagamento ?? prefill?.tipoPagamento ?? 'pessoa_juridica') as TipoPagamento,
    status: (cliente?.status ?? prefill?.status ?? 'em_dia') as StatusCliente,
    dataInicioCobranca: cliente?.dataInicioCobranca ?? prefill?.dataInicioCobranca ?? getPrimeiroDiaMesAtual(),
    responsavelId: cliente?.responsavelId ?? prefill?.responsavelId,
    indicacao: cliente?.indicacao ?? prefill?.indicacao ?? '',
    formaPagamento: cliente?.formaPagamento ?? prefill?.formaPagamento ?? '',
    ativo: cliente?.ativo !== false,
    clienteObrigacoes: [],
  });

  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);

  const [obrigacoesCatalogo, setObrigacoesCatalogo] = useState<{ id: number; nome: string; tipo: string }[]>([]);
  const [pendingObrigacaoIds, setPendingObrigacaoIds] = useState<number[]>([]);
  const [batchDataVencimento, setBatchDataVencimento] = useState('');
  const [loadingObrigacoes, setLoadingObrigacoes] = useState(false);
  const nextObrKeyRef = { current: 0 };

  useEffect(() => {
    if (cliente) {
      setForm(prev => ({ ...prev, cnpj: maskCnpj(cliente.cnpj), razaoSocial: cliente.razaoSocial, nomeFantasia: cliente.nomeFantasia, proprietario: cliente.proprietario, telefone: cliente.telefone, email: cliente.email, honorario: cliente.honorario, diaVencimento: cliente.diaVencimento, tipoPagamento: cliente.tipoPagamento, status: cliente.status, dataInicioCobranca: cliente.dataInicioCobranca ?? getPrimeiroDiaMesAtual(), responsavelId: cliente.responsavelId, indicacao: cliente.indicacao ?? '', formaPagamento: cliente.formaPagamento ?? '', ativo: cliente.ativo !== false }));
    } else if (prefill) {
      setForm(prev => ({ ...prev, cnpj: prefill.cnpj || '', razaoSocial: prefill.razaoSocial || '', nomeFantasia: prefill.nomeFantasia || '', proprietario: prefill.proprietario || '', telefone: prefill.telefone || '', email: prefill.email || '', honorario: prefill.honorario ?? 0, diaVencimento: prefill.diaVencimento ?? 10, tipoPagamento: (prefill.tipoPagamento || 'pessoa_juridica') as TipoPagamento, status: (prefill.status || 'em_dia') as StatusCliente, dataInicioCobranca: prefill.dataInicioCobranca ?? getPrimeiroDiaMesAtual() }));
    }
  }, [cliente, prefill]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${apiBaseUrl}/usuarios`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setUsuarios((Array.isArray(data) ? data : []).map((u: any) => ({ id: Number(u.id), nome: String(u.nome || '') })));
        }
      } catch {
        setUsuarios([]);
      }
    })();
  }, [apiBaseUrl, getAuthHeaders]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${apiBaseUrl}/obrigacoes`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setObrigacoesCatalogo(Array.isArray(data) ? data : []);
        }
      } catch {
        setObrigacoesCatalogo([]);
      }
    })();
  }, [apiBaseUrl, getAuthHeaders]);

  useEffect(() => {
    if (!cliente?.id) return;
    setLoadingObrigacoes(true);
    apiFetch(`${apiBaseUrl}/clientes/${cliente.id}/obrigacoes`, { headers: getAuthHeaders() })
      .then(async res => {
        if (!res.ok) return;
        const data = await res.json();
        const items: ClienteObrigacaoFormItem[] = (Array.isArray(data) ? data : []).map((o: any) => ({
          id: o.id,
          obrigacaoId: o.obrigacaoId,
          obrigacaoNome: o.obrigacaoNome,
          dataVencimento: o.dataVencimento ? String(o.dataVencimento).slice(0, 10) : '',
          observacao: o.observacao || '',
        }));
        setForm(prev => ({ ...prev, clienteObrigacoes: items }));
      })
      .catch(() => {})
      .finally(() => setLoadingObrigacoes(false));
  }, [cliente?.id, apiBaseUrl, getAuthHeaders]);

  const update = <K extends keyof ClienteFormData>(k: K, v: ClienteFormData[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const addObrigacao = (obrigacaoId: number, dataVencimento = '') => {
    const obr = obrigacoesCatalogo.find(o => o.id === obrigacaoId);
    if (!obr) return;
    nextObrKeyRef.current += 1;
    setForm(prev => {
      if (prev.clienteObrigacoes.some(o => o.obrigacaoId === obrigacaoId)) return prev;
      return {
        ...prev,
        clienteObrigacoes: [
          ...prev.clienteObrigacoes,
          {
            _key: nextObrKeyRef.current,
            obrigacaoId,
            obrigacaoNome: obr.nome,
            dataVencimento,
            observacao: '',
          },
        ],
      };
    });
  };

  const addObrigacoesSelecionadas = () => {
    if (pendingObrigacaoIds.length === 0) {
      toast.warning('Selecione ao menos uma obrigação');
      return;
    }
    const ids = [...pendingObrigacaoIds];
    const data = batchDataVencimento;
    setForm(prev => {
      const existentes = new Set(prev.clienteObrigacoes.map(o => o.obrigacaoId));
      const novas = ids
        .filter(id => !existentes.has(id))
        .map(id => {
          nextObrKeyRef.current += 1;
          const obr = obrigacoesCatalogo.find(o => o.id === id);
          return {
            _key: nextObrKeyRef.current,
            obrigacaoId: id,
            obrigacaoNome: obr?.nome,
            dataVencimento: data,
            observacao: '',
          };
        });
      return { ...prev, clienteObrigacoes: [...prev.clienteObrigacoes, ...novas] };
    });
    setPendingObrigacaoIds([]);
    toast.success(
      ids.length === 1 ? 'Obrigação adicionada' : `${ids.length} obrigações adicionadas`
    );
  };

  const togglePendingObrigacao = (id: number) => {
    setPendingObrigacaoIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const updateObrigacao = (index: number, field: keyof ClienteObrigacaoFormItem, value: string) => {
    setForm(prev => {
      const arr = [...prev.clienteObrigacoes];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, clienteObrigacoes: arr };
    });
  };

  const removeObrigacao = (index: number) => {
    setForm(prev => ({ ...prev, clienteObrigacoes: prev.clienteObrigacoes.filter((_, i) => i !== index) }));
  };

  const [honorarioInput, setHonorarioInput] = useState(formatCurrencyInput(form.honorario));
  useEffect(() => {
    setHonorarioInput(formatCurrencyInput(form.honorario));
  }, [form.honorario]);
  const emailInvalido = form.email.trim().length > 0 && !isValidEmail(form.email.trim());

  const obrigacoesOrdenadas = useMemo(() => {
    return [...form.clienteObrigacoes].sort((a, b) => {
      if (!a.dataVencimento) return 1;
      if (!b.dataVencimento) return -1;
      return new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime();
    });
  }, [form.clienteObrigacoes]);

  const obrigacoesDisponiveis = useMemo(
    () =>
      obrigacoesCatalogo.filter(
        (o) => !form.clienteObrigacoes.some((c) => c.obrigacaoId === o.id)
      ),
    [obrigacoesCatalogo, form.clienteObrigacoes]
  );

  return (
    <ModalShell onClose={onClose} maxWidth="xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{cliente ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'cnpj', label: 'CNPJ (opcional)', placeholder: '00.000.000/0000-00' },
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="space-y-1.5">
              <label className="label-text flex items-center gap-1.5">
                Data início cobrança
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help text-muted-foreground hover:text-foreground"><Info size={14} /></span>
                </TooltipTrigger>
                <TooltipContent>Define a partir de quando o cliente começará a ser cobrado</TooltipContent>
              </Tooltip>
            </label>
              <DateField
                value={form.dataInicioCobranca || ''}
                onChange={(v) => update('dataInicioCobranca', v)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-text">Tipo Pagamento</label>
              <AppSelect
                value={form.tipoPagamento || 'pessoa_juridica'}
                onChange={(v) => update('tipoPagamento', v as TipoPagamento)}
                options={[
                  { value: 'pessoa_fisica', label: 'Pessoa Física' },
                  { value: 'pessoa_juridica', label: 'Pessoa Jurídica' },
                  { value: 'terceiros', label: 'Terceiros' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-text">Forma de pagamento</label>
              <AppSelect
                value={form.formaPagamento || ''}
                onChange={(v) => update('formaPagamento', v)}
                allowEmpty
                placeholder="Não informado"
                options={[
                  { value: '', label: 'Não informado' },
                  { value: 'boleto', label: 'Boleto' },
                  { value: 'pix', label: 'PIX' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-text">Responsável</label>
              <AppSelect
                value={form.responsavelId != null ? String(form.responsavelId) : ''}
                onChange={(v) => update('responsavelId', v ? Number(v) : undefined)}
                allowEmpty
                placeholder="Não atribuído"
                options={[
                  { value: '', label: 'Não atribuído' },
                  ...usuarios.map((u) => ({ value: String(u.id), label: u.nome })),
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-text">Indicação</label>
              <input
                type="text"
                value={form.indicacao || ''}
                onChange={e => update('indicacao', e.target.value)}
                placeholder="Ex.: ELANE"
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all"
              />
            </div>
            <div className="space-y-1.5 flex items-end pb-1">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <Checkbox
                  checked={form.ativo !== false}
                  onCheckedChange={(checked) => update('ativo', checked === true)}
                  className="h-5 w-5 rounded-md"
                />
                Cliente ativo
              </label>
            </div>
            <div className="space-y-1.5">
              <label className="label-text">Status Pagamento</label>
              <AppSelect
                value={form.status}
                onChange={(v) => update('status', v as StatusCliente)}
                options={[
                  { value: 'em_dia', label: 'Em dia' },
                  { value: 'pendente', label: 'Pendente' },
                  { value: 'atrasado', label: 'Atrasado' },
                ]}
              />
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <h3 className="label-text font-medium mb-3">Obrigações do Cliente</h3>
            <div className="space-y-3">
              {loadingObrigacoes && (
                <p className="text-xs text-muted-foreground">Carregando obrigações...</p>
              )}

              {obrigacoesDisponiveis.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Selecione uma ou mais e adicione de uma vez
                    </p>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        if (pendingObrigacaoIds.length === obrigacoesDisponiveis.length) {
                          setPendingObrigacaoIds([]);
                        } else {
                          setPendingObrigacaoIds(obrigacoesDisponiveis.map((o) => o.id));
                        }
                      }}
                    >
                      {pendingObrigacaoIds.length === obrigacoesDisponiveis.length
                        ? 'Limpar seleção'
                        : 'Selecionar todas'}
                    </button>
                  </div>
                  <div className="rounded-lg border border-input bg-background max-h-44 overflow-y-auto divide-y divide-border">
                    {obrigacoesDisponiveis.map((o) => {
                      const checked = pendingObrigacaoIds.includes(o.id);
                      return (
                        <label
                          key={o.id}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                            checked ? 'bg-primary/5' : 'hover:bg-muted/40'
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => togglePendingObrigacao(o.id)}
                            className="h-4 w-4 rounded-md shrink-0"
                          />
                          <span className="text-sm font-medium flex-1 min-w-0 truncate">{o.nome}</span>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0 rounded-full bg-muted px-2 py-0.5">
                            {o.tipo}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-muted-foreground">Data vencimento (opcional, para todas)</label>
                      <DateField
                        value={batchDataVencimento}
                        onChange={setBatchDataVencimento}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addObrigacoesSelecionadas}
                      disabled={pendingObrigacaoIds.length === 0}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 shrink-0"
                    >
                      <Plus size={16} />
                      Adicionar{pendingObrigacaoIds.length > 0 ? ` (${pendingObrigacaoIds.length})` : ''}
                    </button>
                  </div>
                </div>
              ) : (
                !loadingObrigacoes && (
                  <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border px-3 py-3 text-center">
                    {obrigacoesCatalogo.length === 0
                      ? 'Nenhuma obrigação cadastrada no catálogo'
                      : 'Todas as obrigações do catálogo já foram adicionadas'}
                  </p>
                )
              )}

              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {obrigacoesOrdenadas.map((obr, index) => {
                  const idx = form.clienteObrigacoes.findIndex(o => o === obr);
                  if (idx < 0) return null;
                  const nome = obr.obrigacaoNome ?? obrigacoesCatalogo.find(o => o.id === obr.obrigacaoId)?.nome ?? `Obrigação #${obr.obrigacaoId}`;
                  return (
                    <div key={obr.id ? `co-${obr.id}` : `new-${obr._key ?? index}`} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{nome}</span>
                        <button type="button" onClick={() => removeObrigacao(idx)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Data Vencimento</label>
                          <DateField
                            value={obr.dataVencimento}
                            onChange={(v) => updateObrigacao(idx, 'dataVencimento', v)}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs text-muted-foreground">Observação (opcional)</label>
                          <input
                            type="text"
                            value={obr.observacao}
                            onChange={e => updateObrigacao(idx, 'observacao', e.target.value)}
                            placeholder="Opcional"
                            className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6">
          <button onClick={onClose} className="w-full sm:w-auto px-4 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
          <button
            disabled={loading}
            onClick={() => onSave(form)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
    </ModalShell>
  );
}
