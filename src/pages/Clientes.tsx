import React, { useCallback, useEffect, useMemo, useState } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import { Search, Plus, Pencil, Trash2, X, Eye, Info, ChevronDown, ChevronRight, Download, File, FileText, Image } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [expandedClienteId, setExpandedClienteId] = useState<number | null>(null);
  const [documentosPorCliente, setDocumentosPorCliente] = useState<Record<number, ClienteDocumento[]>>({});
  const [loadingDocumentos, setLoadingDocumentos] = useState<number | null>(null);

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
    setEditingCliente(c);
    setShowForm(true);
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
    const obrigacoes = form.clienteObrigacoes ?? [];
    const obrigacoesSemData = obrigacoes.filter(o => !o.dataVencimento?.trim());
    if (obrigacoesSemData.length > 0) {
      toast.error('Informe a data de vencimento para todas as obrigações');
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
        dataInicioCobranca: form.dataInicioCobranca || null,
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
                <th className="label-text px-2 py-3 text-center w-9"></th>
                <th className="label-text px-3 sm:px-4 py-3 text-left whitespace-nowrap">Razão Social</th>
                <th className="label-text px-3 sm:px-4 py-3 text-left whitespace-nowrap">CNPJ</th>
                <th className="label-text px-3 sm:px-4 py-3 text-left hidden md:table-cell">Proprietário</th>
                <th className="label-text px-3 sm:px-4 py-3 text-left hidden lg:table-cell">Telefone</th>
                <th className="label-text px-3 sm:px-4 py-3 text-right whitespace-nowrap">Honorário</th>
                <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap">Status Pagamento</th>
                <th className="label-text px-3 sm:px-4 py-3 text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Carregando clientes...</td>
                </tr>
              )}
              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Nenhum cliente encontrado</td>
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
                  <td className="px-3 sm:px-4 py-3 font-medium max-w-[120px] sm:max-w-none truncate" title={c.razaoSocial}>{c.razaoSocial}</td>
                  <td className="px-3 sm:px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap">{maskCnpj(c.cnpj)}</td>
                  <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-muted-foreground">{c.proprietario}</td>
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
                        <StatusBadge status={c.status} />
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => navigate(`/clientes/${c.id}`)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Ver detalhes"><Eye size={14} /></button>
                      <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                      <button onClick={() => void handleDelete(c.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
                {expandedClienteId === c.id && (
                  <tr key={`${c.id}-exp`} className="border-t border-border bg-muted/20">
                    <td colSpan={8} className="px-4 py-3">
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
            apiBaseUrl={apiBaseUrl}
            getAuthHeaders={getAuthHeaders}
            parseApiError={parseApiError}
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
    clienteObrigacoes: [],
  });

  const [obrigacoesCatalogo, setObrigacoesCatalogo] = useState<{ id: number; nome: string; tipo: string }[]>([]);
  const [obrigacaoSelectValue, setObrigacaoSelectValue] = useState<string>('');
  const [loadingObrigacoes, setLoadingObrigacoes] = useState(false);
  const nextObrKeyRef = { current: 0 };

  useEffect(() => {
    if (cliente) {
      setForm(prev => ({ ...prev, cnpj: maskCnpj(cliente.cnpj), razaoSocial: cliente.razaoSocial, nomeFantasia: cliente.nomeFantasia, proprietario: cliente.proprietario, telefone: cliente.telefone, email: cliente.email, honorario: cliente.honorario, diaVencimento: cliente.diaVencimento, tipoPagamento: cliente.tipoPagamento, status: cliente.status, dataInicioCobranca: cliente.dataInicioCobranca ?? getPrimeiroDiaMesAtual() }));
    } else if (prefill) {
      setForm(prev => ({ ...prev, cnpj: prefill.cnpj || '', razaoSocial: prefill.razaoSocial || '', nomeFantasia: prefill.nomeFantasia || '', proprietario: prefill.proprietario || '', telefone: prefill.telefone || '', email: prefill.email || '', honorario: prefill.honorario ?? 0, diaVencimento: prefill.diaVencimento ?? 10, tipoPagamento: (prefill.tipoPagamento || 'pessoa_juridica') as TipoPagamento, status: (prefill.status || 'em_dia') as StatusCliente, dataInicioCobranca: prefill.dataInicioCobranca ?? getPrimeiroDiaMesAtual() }));
    }
  }, [cliente, prefill]);

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

  const addObrigacao = (obrigacaoId: number) => {
    const obr = obrigacoesCatalogo.find(o => o.id === obrigacaoId);
    if (!obr) return;
    nextObrKeyRef.current += 1;
    setForm(prev => ({
      ...prev,
      clienteObrigacoes: [...prev.clienteObrigacoes, { _key: nextObrKeyRef.current, obrigacaoId, obrigacaoNome: obr.nome, dataVencimento: '', observacao: '' }],
    }));
    setObrigacaoSelectValue('');
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
        className="card-surface w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{cliente ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <input
                type="date"
                value={form.dataInicioCobranca || ''}
                onChange={e => update('dataInicioCobranca', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all"
              />
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
              <label className="label-text">Status Pagamento</label>
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

          <div className="border-t border-border pt-4 mt-4">
            <h3 className="label-text font-medium mb-3">Obrigações do Cliente</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={obrigacaoSelectValue}
                  onChange={e => {
                    const v = e.target.value;
                    setObrigacaoSelectValue(v);
                    if (v) addObrigacao(Number(v));
                  }}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="">Selecione uma obrigação para adicionar</option>
                  {obrigacoesCatalogo.map(o => (
                    <option key={o.id} value={o.id}>{o.nome} ({o.tipo})</option>
                  ))}
                </select>
              </div>

              {loadingObrigacoes && (
                <p className="text-xs text-muted-foreground">Carregando obrigações...</p>
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
                          <input
                            type="date"
                            value={obr.dataVencimento}
                            onChange={e => updateObrigacao(idx, 'dataVencimento', e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm"
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
