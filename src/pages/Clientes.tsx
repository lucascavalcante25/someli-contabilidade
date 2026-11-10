import React, { useCallback, useEffect, useMemo, useState } from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import AppSelect from '@/components/shared/AppSelect';
import { Search, Plus, Pencil, Trash2, Eye, Download, File, FileText, Image } from 'lucide-react';
import SortableTh from '@/components/shared/SortableTh';
import { comparePagamentoStatus, type SortDir } from '@/lib/pagamento-sort';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import ListPagination from '@/components/shared/ListPagination';
import TabelaCongelada from '@/components/shared/TabelaCongelada';
import ClienteNomeCelula from '@/components/clientes/ClienteNomeCelula';
import { maskCnpj } from '@/lib/masks';
import ModalShell from '@/components/shared/ModalShell';
import HintTooltip from '@/components/shared/HintTooltip';
import ToggleValoresButton from '@/components/shared/ToggleValoresButton';
import { useValoresVisibilidade } from '@/contexts/ValoresVisibilidadeContext';
import { PAGE_SIZE } from '@/lib/constants';
import { correspondeBusca } from '@/lib/buscaClientes';
import { rotuloRegime } from '@/lib/classificacao';
import { salvarResponsaveis, type ResponsaveisPorSetor } from '@/lib/responsaveis';
import { definirSegmento, type Segmento } from '@/lib/painelMensal';
import { segmentoPeloCnae } from '@/lib/segmentoCliente';
import ResponsavelLegalContato from '@/components/clientes/ResponsavelLegalContato';
import { ClienteFormModal } from '@/components/clientes/ClienteFormModal';
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
  contaRecebimento?: string;
  regimeTributario?: string;
  ativo?: boolean;
  mesesPendentes?: number;
  mesesPendentesDetalhe?: string[];
  valorPendente?: number;
  dataFimCobranca?: string;
  tags?: { id: number; nome: string; cor?: string; automatica?: boolean }[];
  certificadoVencimento?: string;
  certificadoTipo?: string;
  certificadoObservacao?: string;
  certificadoStatus?: string;
  certificadoDiasRestantes?: number;
}

type SortKey = 'razaoSocial' | 'cnpj' | 'regime' | 'responsavel' | 'telefone' | 'honorario' | 'status' | 'ativo';
type SortRule = { key: SortKey; dir: SortDir };

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

function compareClientes(a: Cliente, b: Cliente, key: SortKey, dir: SortDir): number {
  if (key === 'status') {
    return comparePagamentoStatus(a, b, dir);
  }
  const mul = dir === 'asc' ? 1 : -1;
  let cmp = 0;
  switch (key) {
    case 'razaoSocial':
      cmp = a.razaoSocial.localeCompare(b.razaoSocial, 'pt-BR', { sensitivity: 'base' });
      break;
    case 'cnpj':
      cmp = (a.cnpj || '').localeCompare(b.cnpj || '', 'pt-BR');
      break;
    case 'regime':
      cmp = rotuloRegime(a.regimeTributario).localeCompare(rotuloRegime(b.regimeTributario), 'pt-BR');
      break;
    case 'responsavel':
      cmp = (a.proprietario || '').localeCompare(b.proprietario || '', 'pt-BR', { sensitivity: 'base' });
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
  contaRecebimento?: string;
  regimeTributario?: string;
  ativo?: boolean;
  certificadoVencimento?: string;
  certificadoTipo?: string;
  certificadoObservacao?: string;
  clienteObrigacoes: ClienteObrigacaoFormItem[];
  /** Responsável de cada setor (usuário do sistema); originais servem para salvar só o que mudou. */
  responsaveis?: ResponsaveisPorSetor;
  responsaveisOriginais?: ResponsaveisPorSetor;
  segmento?: Segmento | '';
  segmentoOriginal?: Segmento | '';
  segmentoSugerido?: boolean;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
    contaRecebimento: raw.contaRecebimento ? String(raw.contaRecebimento) : undefined,
    regimeTributario: raw.regimeTributario ? String(raw.regimeTributario) : undefined,
    ativo: raw.ativo !== false,
    mesesPendentes: raw.mesesPendentes != null ? Number(raw.mesesPendentes) : undefined,
    mesesPendentesDetalhe: Array.isArray(raw.mesesPendentesDetalhe)
      ? raw.mesesPendentesDetalhe.map(String)
      : undefined,
    valorPendente: raw.valorPendente != null ? Number(raw.valorPendente) : undefined,
    dataFimCobranca: raw.dataFimCobranca ? String(raw.dataFimCobranca).slice(0, 10) : undefined,
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((t: any) => ({
          automatica: !!t.automatica,
          id: Number(t.id),
          nome: String(t.nome || ''),
          cor: t.cor ? String(t.cor) : undefined,
        }))
      : [],
    certificadoVencimento: raw.certificadoVencimento ? String(raw.certificadoVencimento).slice(0, 10) : undefined,
    certificadoTipo: raw.certificadoTipo ? String(raw.certificadoTipo) : undefined,
    certificadoObservacao: raw.certificadoObservacao ? String(raw.certificadoObservacao) : undefined,
    certificadoStatus: raw.certificadoStatus ? String(raw.certificadoStatus) : undefined,
    certificadoDiasRestantes: raw.certificadoDiasRestantes != null ? Number(raw.certificadoDiasRestantes) : undefined,
  };
}

export default function Clientes() {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const location = useLocation();
  const navigate = useNavigate();
  const { mascarar } = useValoresVisibilidade();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [certFilter, setCertFilter] = useState('');
  const [tagOptions, setTagOptions] = useState<{ id: number; nome: string }[]>([]);
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
    void (async () => {
      try {
        const res = await apiFetch(`${apiBaseUrl}/tags`, { headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) return;
        const data = await res.json();
        setTagOptions(
          (Array.isArray(data) ? data : []).map((t: any) => ({
            id: Number(t.id),
            nome: String(t.nome || ''),
          }))
        );
      } catch {
        setTagOptions([]);
      }
    })();
  }, [apiBaseUrl]);

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
      const segmento = segmentoPeloCnae(prefill.cnaePrincipalCodigo);
      if (segmento) {
        draft.segmento = segmento;
        draft.segmentoSugerido = true;
      }
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
    const list = clientes.filter(c => {
      const matchText = correspondeBusca(c, search);
      const matchTag = !tagFilter || (c.tags || []).some((t) => String(t.id) === tagFilter);
      const st = c.certificadoStatus || 'NAO_INFORMADO';
      const matchCert =
        !certFilter ||
        (certFilter === 'alerta' && (st === 'VENCENDO' || st === 'VENCIDO')) ||
        st === certFilter;
      return matchText && matchTag && matchCert;
    });
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
  }, [clientes, search, tagFilter, certFilter, sortRules]);

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
        contaRecebimento: form.contaRecebimento || null,
        regimeTributario: form.regimeTributario?.trim() || '',
        ativo: form.ativo !== false,
        certificadoVencimento: form.certificadoVencimento || null,
        certificadoTipo: form.certificadoTipo?.trim() || null,
        certificadoObservacao: form.certificadoObservacao?.trim() || null,
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

      // Segmento é tag manual: grava só quando escolheram ou trocaram
      if (form.segmento && form.segmento !== form.segmentoOriginal) {
        try {
          await definirSegmento(saved.id, form.segmento);
        } catch (e) {
          toast.error(`Cliente salvo, mas o segmento não: ${e instanceof Error ? e.message : 'erro'}`);
        }
      }

      if (form.responsaveis) {
        try {
          await salvarResponsaveis(saved.id, form.responsaveis, form.responsaveisOriginais ?? {});
        } catch (e) {
          toast.error(`Cliente salvo, mas os responsáveis não: ${e instanceof Error ? e.message : 'erro'}`);
        }
      }

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
        <div className="flex items-center gap-2 shrink-0">
          <ToggleValoresButton />
          <button
            onClick={() => { setEditingCliente(null); setPrefillCliente(null); setShowForm(true); }}
            className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:max-w-xl">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar por nome, CNPJ, email, tag..."
              className="w-full rounded-md border border-input bg-card pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition-all"
            />
          </div>
          <AppSelect
            value={tagFilter}
            onChange={(v) => { setTagFilter(v); setCurrentPage(1); }}
            allowEmpty
            placeholder="Todas as tags"
            className="sm:w-44"
            options={[
              { value: '', label: 'Todas as tags' },
              ...tagOptions.map((t) => ({ value: String(t.id), label: t.nome.replace(/_/g, ' ') })),
            ]}
          />
          <AppSelect
            value={certFilter}
            onChange={(v) => { setCertFilter(v); setCurrentPage(1); }}
            allowEmpty
            placeholder="Certificado"
            className="sm:w-44"
            options={[
              { value: '', label: 'Certificado: todos' },
              { value: 'alerta', label: 'Vencendo / vencido' },
              { value: 'VENCIDO', label: 'Vencido' },
              { value: 'VENCENDO', label: 'Vencendo (30d)' },
              { value: 'OK', label: 'Em dia' },
              { value: 'NAO_INFORMADO', label: 'Não informado' },
            ]}
          />
        </div>
        <p className="text-[11px] text-muted-foreground sm:text-right">
          Clique no cabeçalho para ordenar · <kbd className="px-1 rounded border border-border text-[10px]">Shift</kbd>+clique para combinar critérios
        </p>
      </div>

      {/* Table */}
      <div className="card-surface overflow-hidden max-w-full">
        {/* Nome e cabeçalho congelados, barra lateral sempre visível (pedido da Karol, igual ao Painel do mês) */}
        <TabelaCongelada rotulo="Lista de clientes">
          <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr>
                <SortableTh label="Razão Social" sortKey="razaoSocial" sortRules={sortRules} onSort={toggleSort} align="left" className="sticky left-0 top-0 z-30 bg-muted pl-9 sm:pl-9" />
                <SortableTh label="CNPJ" sortKey="cnpj" sortRules={sortRules} onSort={toggleSort} align="left" className="sticky top-0 z-20 bg-muted hidden sm:table-cell" />
                <SortableTh label="Regime" sortKey="regime" sortRules={sortRules} onSort={toggleSort} align="left" className="sticky top-0 z-20 bg-muted hidden md:table-cell" />
                <SortableTh label="Responsável legal" sortKey="responsavel" sortRules={sortRules} onSort={toggleSort} align="left" className="sticky top-0 z-20 bg-muted hidden md:table-cell" />
                <SortableTh label="Honorário" sortKey="honorario" sortRules={sortRules} onSort={toggleSort} align="right" className="sticky top-0 z-20 bg-muted" />
                <SortableTh label="Status Pagamento" sortKey="status" sortRules={sortRules} onSort={toggleSort} align="center" className="sticky top-0 z-20 bg-muted" />
                <SortableTh label="Situação" sortKey="ativo" sortRules={sortRules} onSort={toggleSort} align="center" className="sticky top-0 z-20 bg-muted" />
                <th className="label-text sticky top-0 z-20 bg-muted px-3 sm:px-4 py-3 text-center whitespace-nowrap">Ações</th>
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
                  <ClienteNomeCelula
                    cliente={c}
                    aberto={expandedClienteId === c.id}
                    onAlternarDocumentos={() => void toggleExpand(c.id)}
                  />
                  <td className="px-3 sm:px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap hidden sm:table-cell">{c.cnpj ? maskCnpj(c.cnpj) : '—'}</td>
                  <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-muted-foreground whitespace-nowrap">{rotuloRegime(c.regimeTributario)}</td>
                  <td className="px-3 sm:px-4 py-3 hidden md:table-cell max-w-[220px]">
                    <ResponsavelLegalContato nome={c.proprietario} telefone={c.telefone} />
                  </td>
                  <td className="px-3 sm:px-4 py-3 text-right tabular-nums font-medium whitespace-nowrap">{mascarar(formatCurrency(c.honorario))}</td>
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
                      <HintTooltip content="Ver detalhes">
                        <button
                          type="button"
                          onClick={() => handleView(c)}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          aria-label="Ver detalhes"
                        >
                          <Eye size={14} />
                        </button>
                      </HintTooltip>
                      <HintTooltip content="Editar">
                        <button
                          type="button"
                          onClick={() => handleEdit(c)}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          aria-label="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                      </HintTooltip>
                      <HintTooltip content="Excluir">
                        <button
                          type="button"
                          onClick={() => void handleDelete(c.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          aria-label="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </HintTooltip>
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
                                    <td className="px-3 py-2 font-medium truncate max-w-[150px]">
                                      <HintTooltip content={doc.nomeArquivo} enabled={!!doc.nomeArquivo && doc.nomeArquivo.length > 18}>
                                        <span className="block truncate">{doc.nomeArquivo}</span>
                                      </HintTooltip>
                                    </td>
                                    <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground truncate max-w-[120px]">{doc.descricao || '—'}</td>
                                    <td className="px-3 py-2 text-muted-foreground text-xs">{doc.dataUpload ? new Date(doc.dataUpload).toLocaleDateString('pt-BR') : '—'}</td>
                                    <td className="px-3 py-2 text-center">
                                      <HintTooltip content="Baixar documento">
                                        <button
                                          type="button"
                                          onClick={() => void handleDownloadDoc(c.id, doc)}
                                          className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                          aria-label="Baixar documento"
                                        >
                                          <Download size={14} />
                                        </button>
                                      </HintTooltip>
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
        </TabelaCongelada>
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
          <ModalShell onClose={() => setViewingCliente(null)} maxWidth="3xl" fixedSize className="sm:h-[min(860px,92vh)] sm:max-h-[92vh]">
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
