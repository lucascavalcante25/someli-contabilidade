import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, X, FileText, ClipboardList, File, Download, Loader2, Image, FileSpreadsheet, PowerOff, Power, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/shared/StatusBadge';
import DateField from '@/components/shared/DateField';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';
import ModalShell from '@/components/shared/ModalShell';
import ToggleValoresButton from '@/components/shared/ToggleValoresButton';
import { Checkbox } from '@/components/ui/checkbox';
import { useValoresVisibilidade } from '@/contexts/ValoresVisibilidadeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Permissoes } from '@/lib/permissions';
import ClienteResponsaveisSection from '@/components/ClienteResponsaveisSection';
import ClienteTagsSection from '@/components/ClienteTagsSection';
import OcorrenciaWorkList, { type OcorrenciaItem } from '@/components/obrigacoes/OcorrenciaWorkList';
import HintTooltip from '@/components/shared/HintTooltip';
import { cn } from '@/lib/utils';

type TipoObrigacao = 'FISCAL' | 'LICENCA' | 'OUTROS';
type StatusObrigacao = 'em_dia' | 'a_vencer' | 'atrasado' | 'proximo_vencimento';

interface Obrigacao {
  id: number;
  nome: string;
  tipo: string;
  descricao: string;
  diasAntecedenciaAlerta: number;
}

interface ClienteObrigacao {
  id: number;
  clienteId: number;
  obrigacaoId: number;
  obrigacaoNome: string;
  obrigacaoTipo: string;
  dataVencimento: string;
  ativo: boolean;
  observacao: string;
  status: StatusObrigacao;
}

interface ClienteObrigacaoForm {
  obrigacaoIds: number[];
  dataVencimento: string;
  observacao: string;
}

interface ClienteDocumento {
  id: number;
  clienteId: number;
  nomeArquivo: string;
  tipoArquivo: string;
  dataUpload: string;
  descricao: string;
}

function maskCnpj(value: string): string {
  const nums = (value || '').replace(/\D/g, '').slice(0, 14);
  return nums
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function formatDate(value: string): string {
  if (!value) return '';
  const d = new Date(value + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
}

const statusObrigacaoConfig: Record<StatusObrigacao, { label: string; variant: 'em_dia' | 'pendente' | 'atrasado' | 'proximo_vencimento' }> = {
  em_dia: { label: 'Em dia', variant: 'em_dia' },
  a_vencer: { label: 'Vence hoje', variant: 'pendente' },
  proximo_vencimento: { label: 'Próximo do vencimento', variant: 'proximo_vencimento' },
  atrasado: { label: 'Atrasado', variant: 'atrasado' },
};

interface Cliente {
  id: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  proprietario: string;
  telefone: string;
  email: string;
  honorario: number | null;
  diaVencimento: number;
  tipoPagamento: string;
  status: string;
  mesesPendentes?: number;
  mesesPendentesDetalhe?: string[];
  valorPendente?: number;
  dataInicioCobranca?: string;
  responsavelNome?: string;
  indicacao?: string;
  formaPagamento?: string;
  ativo?: boolean;
  dataFimCobranca?: string;
}

export type ClienteDetalhePanelProps = {
  clienteId: number;
  variant?: 'page' | 'modal';
  initialTab?: 'dados' | 'obrigacoes' | 'ocorrencias' | 'documentos';
  onClose?: () => void;
  onEdit?: () => void;
};

export function ClienteDetalhePanel({
  clienteId,
  variant = 'page',
  initialTab = 'dados',
  onClose,
  onEdit,
}: ClienteDetalhePanelProps) {
  const id = String(clienteId);
  const navigate = useNavigate();
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);
  const { mascarar } = useValoresVisibilidade();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [obrigacoes, setObrigacoes] = useState<ClienteObrigacao[]>([]);
  const [obrigacoesInativas, setObrigacoesInativas] = useState<ClienteObrigacao[]>([]);
  const [documentos, setDocumentos] = useState<ClienteDocumento[]>([]);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaItem[]>([]);
  const [obrigacoesCatalogo, setObrigacoesCatalogo] = useState<Obrigacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingObrigacao, setEditingObrigacao] = useState<ClienteObrigacao | null>(null);
  const [tab, setTab] = useState(initialTab);

  const getAuthHeaders = () => ({ 'Content-Type': 'application/json' });

  const parseApiError = async (response: Response) => {
    try {
      const body = await response.json();
      return body?.message || 'Erro ao processar operação';
    } catch {
      return 'Erro ao processar operação';
    }
  };

  const carregarCliente = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch(`${apiBaseUrl}/clientes/${id}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await parseApiError(res));
      const data = await res.json();
      setCliente({
        id: data.id,
        cnpj: data.cnpj || '',
        razaoSocial: data.razaoSocial || '',
        nomeFantasia: data.nomeFantasia || '',
        proprietario: data.proprietario || '',
        telefone: data.telefone || '',
        email: data.email || '',
        honorario: data.honorario == null ? null : Number(data.honorario),
        diaVencimento: data.diaVencimento ?? 10,
        tipoPagamento: data.tipoPagamento || '',
        status: data.status || 'em_dia',
        mesesPendentes: data.mesesPendentes != null ? Number(data.mesesPendentes) : undefined,
        mesesPendentesDetalhe: Array.isArray(data.mesesPendentesDetalhe)
          ? data.mesesPendentesDetalhe.map(String)
          : undefined,
        valorPendente: data.valorPendente != null ? Number(data.valorPendente) : undefined,
        dataInicioCobranca: data.dataInicioCobranca ? String(data.dataInicioCobranca).slice(0, 10) : undefined,
        responsavelNome: data.responsavelNome || undefined,
        indicacao: data.indicacao || undefined,
        formaPagamento: data.formaPagamento || undefined,
        ativo: data.ativo !== false,
        dataFimCobranca: data.dataFimCobranca ? String(data.dataFimCobranca).slice(0, 10) : undefined,
      });
    } catch {
      toast.error('Cliente não encontrado');
      // Só fecha se ainda não carregou dados (evita fechar o modal ao trocar de aba)
      setCliente((prev) => {
        if (!prev && variant === 'modal') onClose?.();
        if (!prev && variant !== 'modal') navigate('/clientes');
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, id, navigate, variant, onClose]);

  const carregarObrigacoes = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`${apiBaseUrl}/clientes/${id}/obrigacoes?incluirInativas=true`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(await parseApiError(res));
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setObrigacoes(lista.filter((o: ClienteObrigacao) => o.ativo !== false));
      setObrigacoesInativas(lista.filter((o: ClienteObrigacao) => o.ativo === false));
    } catch {
      setObrigacoes([]);
      setObrigacoesInativas([]);
    }
  }, [apiBaseUrl, id]);

  const carregarDocumentos = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`${apiBaseUrl}/clientes/${id}/documentos`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setDocumentos((Array.isArray(data) ? data : []).map((d: any) => ({
        id: d.id,
        clienteId: d.clienteId,
        nomeArquivo: d.nomeArquivo || '',
        tipoArquivo: d.tipoArquivo || '',
        dataUpload: d.dataUpload || '',
        descricao: d.descricao || '',
      })));
    } catch {
      setDocumentos([]);
    }
  }, [apiBaseUrl, id]);

  const carregarOcorrencias = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`${apiBaseUrl}/clientes/${id}/ocorrencias`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('falha');
      const data = await res.json();
      setOcorrencias(Array.isArray(data) ? data : []);
    } catch {
      setOcorrencias([]);
    }
  }, [apiBaseUrl, id]);

  const carregarCatalogo = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBaseUrl}/obrigacoes`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setObrigacoesCatalogo(Array.isArray(data) ? data : []);
    } catch {
      setObrigacoesCatalogo([]);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    void carregarCliente();
  }, [carregarCliente]);

  useEffect(() => {
    void carregarObrigacoes();
    void carregarDocumentos();
    void carregarOcorrencias();
    void carregarCatalogo();
  }, [carregarObrigacoes, carregarDocumentos, carregarOcorrencias, carregarCatalogo]);

  const handleSaveObrigacao = async (form: ClienteObrigacaoForm, clienteObrigacaoId?: number) => {
    if (!id) return;
    if (!form.dataVencimento) {
      toast.error('Informe a data de vencimento');
      return;
    }
    if (!clienteObrigacaoId && (!form.obrigacaoIds || form.obrigacaoIds.length === 0)) {
      toast.error('Selecione ao menos uma obrigação');
      return;
    }
    setSaving(true);
    try {
      if (clienteObrigacaoId) {
        const res = await apiFetch(`${apiBaseUrl}/clientes/${id}/obrigacoes/${clienteObrigacaoId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            dataVencimento: form.dataVencimento,
            ativo: true,
            observacao: form.observacao?.trim() || null,
          }),
        });
        if (!res.ok) throw new Error(await parseApiError(res));
        const saved = await res.json();
        setObrigacoes(prev => prev.map(o => (o.id === saved.id ? saved : o)));
        toast.success('Obrigação atualizada');
      } else {
        const salvos: ClienteObrigacao[] = [];
        const erros: string[] = [];
        for (const obrigacaoId of form.obrigacaoIds) {
          const res = await apiFetch(`${apiBaseUrl}/clientes/${id}/obrigacoes`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              clienteId: Number(id),
              obrigacaoId,
              dataVencimento: form.dataVencimento,
              ativo: true,
              observacao: form.observacao?.trim() || null,
            }),
          });
          if (!res.ok) {
            erros.push(await parseApiError(res));
            continue;
          }
          salvos.push(await res.json());
        }
        if (salvos.length) {
          setObrigacoes(prev => [...prev, ...salvos]);
          toast.success(
            salvos.length === 1
              ? 'Obrigação adicionada'
              : `${salvos.length} obrigações adicionadas`
          );
        }
        if (erros.length && !salvos.length) {
          throw new Error(erros[0]);
        }
        if (erros.length && salvos.length) {
          toast.warning(`${erros.length} não puderam ser adicionadas (já existem ou erro)`);
        }
      }
      setShowForm(false);
      setEditingObrigacao(null);
      void carregarOcorrencias();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar';
      toast.error(msg);
      if (msg.includes('Já existe esta obrigação')) {
        void carregarObrigacoes();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDesativarObrigacao = async (o: ClienteObrigacao) => {
    if (!id || !window.confirm('Desativar esta obrigação? Ela não aparecerá mais na lista ativa e não gerará notificações. Você pode reativá-la depois.')) return;
    try {
      const res = await apiFetch(`${apiBaseUrl}/clientes/${id}/obrigacoes/${o.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ dataVencimento: o.dataVencimento, ativo: false, observacao: o.observacao ?? null }),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      const updated = await res.json();
      setObrigacoes(prev => prev.filter(ob => ob.id !== o.id));
      setObrigacoesInativas(prev => [{ ...updated, ativo: false }, ...prev]);
      toast.success('Obrigação desativada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao desativar');
    }
  };

  const handleReativarObrigacao = async (o: ClienteObrigacao) => {
    if (!id) return;
    try {
      const res = await apiFetch(`${apiBaseUrl}/clientes/${id}/obrigacoes/${o.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ dataVencimento: o.dataVencimento, ativo: true, observacao: o.observacao ?? null }),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      const updated = await res.json();
      setObrigacoesInativas(prev => prev.filter(ob => ob.id !== o.id));
      setObrigacoes(prev => [...prev, updated].sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()));
      toast.success('Obrigação reativada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao reativar');
    }
  };

  const handleDeleteObrigacao = async (obrigacaoId: number) => {
    if (!id || !window.confirm('Excluir permanentemente esta obrigação? Esta ação não pode ser desfeita.')) return;
    try {
      const res = await apiFetch(`${apiBaseUrl}/clientes/${id}/obrigacoes/${obrigacaoId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(await parseApiError(res));
      setObrigacoes(prev => prev.filter(o => o.id !== obrigacaoId));
      setObrigacoesInativas(prev => prev.filter(o => o.id !== obrigacaoId));
      toast.success('Obrigação removida');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao remover');
    }
  };

  const handleEditObrigacao = (o: ClienteObrigacao) => {
    setEditingObrigacao(o);
    setShowForm(true);
  };

  const handleUploadDocumento = async (file: File, descricao: string) => {
    if (!id || !file) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (descricao.trim()) formData.append('descricao', descricao.trim());
      const token = localStorage.getItem('someli_token');
      const res = await fetch(`${apiBaseUrl}/clientes/${id}/documentos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || 'Erro ao enviar');
      }
      const saved = await res.json();
      setDocumentos(prev => [{ ...saved, dataUpload: saved.dataUpload || new Date().toISOString() }, ...prev]);
      toast.success('Documento enviado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar documento');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDownloadDocumento = async (doc: ClienteDocumento) => {
    try {
      const res = await apiFetch(`${apiBaseUrl}/clientes/${id}/documentos/${doc.id}`, { headers: {} });
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

  const handleDownloadAllDocumentos = async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`${apiBaseUrl}/clientes/${id}/documentos/download-all`, { headers: {} });
      if (!res.ok || res.status === 204) {
        toast.info('Nenhum documento para baixar');
        return;
      }
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = `documentos-cliente-${id}.zip`;
      a.click();
      URL.revokeObjectURL(u);
      toast.success('Download iniciado');
    } catch {
      toast.error('Erro ao baixar documentos');
    }
  };

  const handleDeleteDocumento = async (docId: number) => {
    if (!id || !window.confirm('Excluir este documento?')) return;
    try {
      const res = await apiFetch(`${apiBaseUrl}/clientes/${id}/documentos/${docId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Erro ao excluir');
      setDocumentos(prev => prev.filter(d => d.id !== docId));
      toast.success('Documento excluído');
    } catch {
      toast.error('Erro ao excluir documento');
    }
  };

  const getDocIcon = (tipo: string, nome: string) => {
    const ext = (nome || '').toLowerCase().split('.').pop() || '';
    if (tipo?.includes('pdf') || ext === 'pdf') return FileText;
    if (['doc', 'docx'].includes(ext) || tipo?.includes('word')) return File;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || tipo?.includes('image')) return Image;
    if (['xls', 'xlsx'].includes(ext)) return FileSpreadsheet;
    return File;
  };

  const formatDateTime = (value: string) => {
    if (!value) return '';
    const d = new Date(value);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading || !cliente) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const tipoPagamentoLabel: Record<string, string> = {
    pessoa_fisica: 'Pessoa Física',
    pessoa_juridica: 'Pessoa Jurídica',
    terceiros: 'Terceiros',
  };
  const formaPagamentoLabel: Record<string, string> = {
    boleto: 'Boleto',
    pix: 'PIX',
  };

  const dadosFields: { label: string; value: ReactNode; hint: string }[] = [
    { label: 'CNPJ', value: cliente.cnpj ? maskCnpj(cliente.cnpj) : '—', hint: 'Cadastro Nacional da Pessoa Jurídica da empresa.' },
    { label: 'Razão Social', value: cliente.razaoSocial || '—', hint: 'Nome oficial registrado na Receita Federal.' },
    { label: 'Nome Fantasia', value: cliente.nomeFantasia || '—', hint: 'Nome comercial pelo qual a empresa é conhecida.' },
    { label: 'Proprietário', value: cliente.proprietario || '—', hint: 'Sócio ou responsável informado no cadastro.' },
    { label: 'Telefone', value: cliente.telefone || '—', hint: 'Contato principal para cobrança e comunicação.' },
    { label: 'E-mail', value: cliente.email || '—', hint: 'E-mail para envio de avisos e documentos.' },
    { label: 'Honorário', value: cliente.honorario == null ? '—' : mascarar(formatCurrency(cliente.honorario)), hint: 'Valor mensal cobrado pelo escritório. Pode ficar oculto sem permissão de honorário.' },
    { label: 'Dia Vencimento', value: String(cliente.diaVencimento || '—'), hint: 'Dia do mês em que o honorário vence.' },
    {
      label: 'Data início cobrança',
      value: cliente.dataInicioCobranca
        ? new Date(cliente.dataInicioCobranca + 'T12:00:00').toLocaleDateString('pt-BR')
        : '—',
      hint: 'A partir desta data o sistema calcula meses em aberto.',
    },
    { label: 'Tipo Pagamento', value: tipoPagamentoLabel[cliente.tipoPagamento] || cliente.tipoPagamento || '—', hint: 'Quem paga: pessoa física, jurídica ou terceiros.' },
    {
      label: 'Forma de pagamento',
      value: cliente.formaPagamento
        ? formaPagamentoLabel[cliente.formaPagamento] || cliente.formaPagamento
        : '—',
      hint: 'Meio usado na cobrança (Pix, boleto, etc.).',
    },
    { label: 'Responsável', value: cliente.responsavelNome || '—', hint: 'Responsável legado do cadastro (além dos setores).' },
    { label: 'Indicação', value: cliente.indicacao || '—', hint: 'Origem ou observação comercial do cliente.' },
    { label: 'Cliente ativo', value: cliente.ativo === false ? 'Não' : 'Sim', hint: 'Clientes inativos saem da operação normal de cobrança.' },
    {
      label: 'Status Pagamento',
      value: (
        <StatusBadge
          status={cliente.status as 'em_dia' | 'pendente' | 'atrasado'}
          mesesPendentes={cliente.mesesPendentes}
          mesesPendentesDetalhe={cliente.mesesPendentesDetalhe}
          valorPendente={cliente.valorPendente}
          ativo={cliente.ativo}
        />
      ),
      hint: 'Situação financeira calculada pelos pagamentos mensais registrados.',
    },
  ];

  const isModal = variant === 'modal';

  return (
    <div className={cn(isModal ? 'flex h-full min-h-0 flex-col' : 'page-shell')}>
      {variant === 'page' ? (
        <div className="flex items-start gap-3 min-w-0">
          <HintTooltip content="Voltar para a lista de clientes">
            <button
              onClick={() => navigate('/clientes')}
              className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
          </HintTooltip>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{cliente.razaoSocial}</h1>
            <p className="text-sm text-muted-foreground truncate">{cliente.nomeFantasia || maskCnpj(cliente.cnpj)}</p>
          </div>
          <ToggleValoresButton className="shrink-0" />
        </div>
      ) : (
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold truncate">Detalhes do Cliente</h2>
            <HintTooltip content={cliente.razaoSocial}>
              <p className="cursor-default truncate text-sm text-muted-foreground">{cliente.razaoSocial}</p>
            </HintTooltip>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ToggleValoresButton compact />
            <HintTooltip content="Fechar detalhes">
              <button onClick={onClose} className="rounded p-1 transition-colors hover:bg-muted" aria-label="Fechar">
                <X size={18} />
              </button>
            </HintTooltip>
          </div>
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        className={cn('w-full min-w-0 max-w-full', isModal && 'flex min-h-0 flex-1 flex-col')}
      >
        <TabsList className={cn('grid h-auto w-full shrink-0 grid-cols-4', isModal && 'sticky top-0 z-10')}>
          <HintTooltip content="Cadastro, responsáveis por setor e tags">
            <TabsTrigger value="dados" className="flex items-center justify-center gap-1 px-2 py-2 text-xs sm:gap-2 sm:text-sm">
              <FileText size={16} className="shrink-0" /> <span className="truncate">Dados</span>
            </TabsTrigger>
          </HintTooltip>
          <HintTooltip content="Vínculos de obrigações recorrentes deste cliente">
            <TabsTrigger value="obrigacoes" className="flex items-center justify-center gap-1 px-2 py-2 text-xs sm:gap-2 sm:text-sm">
              <ClipboardList size={16} className="shrink-0" /> <span className="truncate">Obrig. ({obrigacoes.length})</span>
            </TabsTrigger>
          </HintTooltip>
          <HintTooltip content="Ocorrências do período: status e histórico de eventos">
            <TabsTrigger value="ocorrencias" className="flex items-center justify-center gap-1 px-2 py-2 text-xs sm:gap-2 sm:text-sm">
              <ListChecks size={16} className="shrink-0" /> <span className="truncate">Ocorr. ({ocorrencias.length})</span>
            </TabsTrigger>
          </HintTooltip>
          <HintTooltip content="Arquivos compartilhados ou internos do cliente">
            <TabsTrigger value="documentos" className="flex items-center justify-center gap-1 px-2 py-2 text-xs sm:gap-2 sm:text-sm">
              <File size={16} className="shrink-0" /> <span className="truncate">Docs ({documentos.length})</span>
            </TabsTrigger>
          </HintTooltip>
        </TabsList>

        <div className={cn(isModal && 'mt-3 min-h-0 flex-1 overflow-y-auto pr-1')}>
        <TabsContent value="dados" className="mt-4 focus-visible:outline-none">
          <div className={variant === 'page' ? 'card-surface p-6 max-w-3xl space-y-4' : 'space-y-4'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {dadosFields.map((f) => (
                <div key={f.label} className="min-w-0 border-b border-border/60 pb-2">
                  <HintTooltip content={f.hint}>
                    <p className="label-text mb-1 w-fit cursor-help border-b border-dotted border-muted-foreground/40">{f.label}</p>
                  </HintTooltip>
                  <HintTooltip
                    content={typeof f.value === 'string' || typeof f.value === 'number' ? String(f.value) : f.hint}
                    enabled={typeof f.value === 'string' || typeof f.value === 'number'}
                  >
                    <div className="truncate text-sm font-medium">{f.value}</div>
                  </HintTooltip>
                </div>
              ))}
            </div>
            <div className="pt-4">
              <ClienteResponsaveisSection clienteId={cliente.id} />
            </div>
            <div className="pt-4 border-t border-border">
              <ClienteTagsSection clienteId={cliente.id} />
            </div>
            <div className={`flex ${variant === 'modal' ? 'flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2' : ''}`}>
              {variant === 'modal' && (
                <HintTooltip content="Fecha este painel sem salvar alterações">
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Fechar
                  </button>
                </HintTooltip>
              )}
              <HintTooltip content="Abre o formulário para alterar dados cadastrais">
                <button
                  onClick={() => {
                    if (onEdit) onEdit();
                    else navigate('/clientes', { state: { editClienteId: cliente.id } });
                  }}
                  className={
                    variant === 'modal'
                      ? 'w-full sm:w-auto px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity'
                      : 'text-sm text-primary hover:underline'
                  }
                >
                  {variant === 'modal' ? 'Editar' : 'Editar dados do cliente'}
                </button>
              </HintTooltip>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="obrigacoes" className="mt-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <HintTooltip content="Configurações recorrentes (DAS, eSocial, alvará…) vinculadas ao cliente">
                <p className="cursor-help text-sm text-muted-foreground">Obrigações cadastradas para este cliente</p>
              </HintTooltip>
              <HintTooltip content="Adiciona uma ou mais obrigações do catálogo">
                <button
                  onClick={() => { setEditingObrigacao(null); setShowForm(true); }}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  <Plus size={16} /> Nova Obrigação
                </button>
              </HintTooltip>
            </div>

            <div className="card-surface overflow-hidden">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="label-text px-4 py-3 text-left">Obrigação</th>
                      <th className="label-text px-4 py-3 text-left">Data Vencimento</th>
                      <th className="label-text px-4 py-3 text-center">Status</th>
                      <th className="label-text px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obrigacoes.length === 0 && !showForm && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhuma obrigação cadastrada. Clique em &quot;Nova Obrigação&quot; para adicionar.
                        </td>
                      </tr>
                    )}
                    {obrigacoes
                      .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
                      .map(o => {
                        const config = statusObrigacaoConfig[o.status] || statusObrigacaoConfig.em_dia;
                        return (
                          <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{o.obrigacaoNome}</td>
                            <td className="px-4 py-3 tabular-nums">{formatDate(o.dataVencimento)}</td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge status={config.variant} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-1">
                                <HintTooltip content="Editar vencimento ou observação desta obrigação">
                                  <button
                                    onClick={() => handleEditObrigacao(o)}
                                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                    aria-label="Editar"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                </HintTooltip>
                                <HintTooltip content="Desativa a obrigação sem excluir o histórico">
                                  <button
                                    onClick={() => void handleDesativarObrigacao(o)}
                                    className="rounded p-1.5 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600"
                                    aria-label="Desativar"
                                  >
                                    <PowerOff size={14} />
                                  </button>
                                </HintTooltip>
                                <HintTooltip content="Exclui permanentemente este vínculo">
                                  <button
                                    onClick={() => void handleDeleteObrigacao(o.id)}
                                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    aria-label="Excluir"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </HintTooltip>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {obrigacoesInativas.length > 0 && (
              <div className="card-surface overflow-hidden">
                <p className="label-text px-4 py-3 border-b border-border text-muted-foreground">Obrigações desativadas</p>
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="label-text px-4 py-2 text-left">Obrigação</th>
                        <th className="label-text px-4 py-2 text-left">Data Vencimento</th>
                        <th className="label-text px-4 py-2 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {obrigacoesInativas.map(o => (
                        <tr key={o.id} className="border-t border-border hover:bg-muted/20 opacity-80">
                          <td className="px-4 py-2 font-medium">{o.obrigacaoNome}</td>
                          <td className="px-4 py-2 tabular-nums">{formatDate(o.dataVencimento)}</td>
                          <td className="px-4 py-2">
                            <div className="flex justify-center gap-1">
                              <HintTooltip content="Reativar obrigação">
                                <button
                                  type="button"
                                  onClick={() => void handleReativarObrigacao(o)}
                                  className="p-1.5 rounded hover:bg-success/10 text-muted-foreground hover:text-success"
                                  aria-label="Reativar"
                                >
                                  <Power size={14} />
                                </button>
                              </HintTooltip>
                              <HintTooltip content="Excluir">
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteObrigacao(o.id)}
                                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  aria-label="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </HintTooltip>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <AnimatePresence>
              {showForm && (
                <ObrigacaoFormModal
                  obrigacoes={obrigacoesCatalogo}
                  jaVinculadas={obrigacoes.map(o => o.obrigacaoId)}
                  editing={editingObrigacao}
                  loading={saving}
                  onClose={() => { setShowForm(false); setEditingObrigacao(null); }}
                  onSave={(f) => void handleSaveObrigacao(f, editingObrigacao?.id)}
                />
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="ocorrencias" className="mt-4">
          <div className="card-surface p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">Ocorrências do período</p>
              <p className="text-sm text-muted-foreground">
                Atualize o status e consulte o histórico de eventos desta empresa.
              </p>
            </div>
            <OcorrenciaWorkList
              items={ocorrencias}
              showCliente={false}
              emptyMessage="Nenhuma ocorrência gerada ainda para este cliente."
              onUpdated={() => void carregarOcorrencias()}
            />
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <DocumentoUploadForm
                onUpload={handleUploadDocumento}
                loading={uploadingDoc}
              />
              {documentos.length > 0 && (
                <button
                  onClick={() => void handleDownloadAllDocumentos()}
                  className="flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted shrink-0"
                >
                  <Download size={16} /> Baixar todos
                </button>
              )}
            </div>

            <div className="card-surface overflow-hidden">
              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="label-text px-4 py-3 text-left w-10"></th>
                      <th className="label-text px-4 py-3 text-left">Nome do arquivo</th>
                      <th className="label-text px-4 py-3 text-left hidden md:table-cell">Descrição</th>
                      <th className="label-text px-4 py-3 text-left">Data upload</th>
                      <th className="label-text px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhum documento. Envie um arquivo acima.
                        </td>
                      </tr>
                    )}
                    {documentos.map(doc => {
                      const Icon = getDocIcon(doc.tipoArquivo, doc.nomeArquivo);
                      return (
                        <tr key={doc.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="rounded bg-muted/50 p-1.5 w-8 h-8 flex items-center justify-center">
                              <Icon size={16} className="text-muted-foreground" />
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium truncate max-w-[180px]">
                            <HintTooltip content={doc.nomeArquivo} enabled={!!doc.nomeArquivo && doc.nomeArquivo.length > 20}>
                              <span className="block truncate">{doc.nomeArquivo}</span>
                            </HintTooltip>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[150px]">
                            <HintTooltip content={doc.descricao || ''} enabled={!!doc.descricao && doc.descricao.length > 18}>
                              <span className="block truncate">{doc.descricao || '—'}</span>
                            </HintTooltip>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground tabular-nums text-xs">{formatDateTime(doc.dataUpload)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              <HintTooltip content="Baixar documento">
                                <button
                                  type="button"
                                  onClick={() => void handleDownloadDocumento(doc)}
                                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                  aria-label="Baixar"
                                >
                                  <Download size={14} />
                                </button>
                              </HintTooltip>
                              <HintTooltip content="Excluir documento">
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteDocumento(doc.id)}
                                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  aria-label="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </HintTooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function DocumentoUploadForm({ onUpload, loading }: { onUpload: (file: File, descricao: string) => void; loading: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [descricao, setDescricao] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Selecione um arquivo');
      return;
    }
    onUpload(file, descricao);
    setFile(null);
    setDescricao('');
    fileInputRef.current?.form?.reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 flex-1">
      <input
        ref={fileInputRef}
        type="file"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
        className="text-sm file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:font-medium"
      />
      <input
        type="text"
        value={descricao}
        onChange={e => setDescricao(e.target.value)}
        placeholder="Descrição (opcional)"
        className="rounded-md border border-input bg-background px-3 py-2.5 text-sm w-full sm:w-48"
      />
      <button
        type="submit"
        disabled={loading || !file}
        className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 shrink-0"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        {loading ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  );
}

function ObrigacaoFormModal({
  obrigacoes,
  jaVinculadas = [],
  editing,
  onClose,
  onSave,
  loading,
}: {
  obrigacoes: Obrigacao[];
  jaVinculadas?: number[];
  editing: ClienteObrigacao | null;
  onClose: () => void;
  onSave: (f: ClienteObrigacaoForm) => void;
  loading: boolean;
}) {
  const disponiveis = useMemo(
    () =>
      editing
        ? obrigacoes
        : obrigacoes.filter(o => !jaVinculadas.includes(o.id)),
    [obrigacoes, jaVinculadas, editing]
  );

  const [selectedIds, setSelectedIds] = useState<number[]>(
    editing ? [editing.obrigacaoId] : []
  );
  const [dataVencimento, setDataVencimento] = useState(
    editing?.dataVencimento?.slice(0, 10) ?? ''
  );
  const [observacao, setObservacao] = useState(editing?.observacao ?? '');

  useEffect(() => {
    if (editing) {
      setSelectedIds([editing.obrigacaoId]);
      setDataVencimento(editing.dataVencimento.slice(0, 10));
      setObservacao(editing.observacao ?? '');
    } else {
      setSelectedIds([]);
      setDataVencimento('');
      setObservacao('');
    }
  }, [editing]);

  const toggleId = (oid: number) => {
    setSelectedIds(prev =>
      prev.includes(oid) ? prev.filter(id => id !== oid) : [...prev, oid]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === disponiveis.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(disponiveis.map(o => o.id));
    }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="md">
      <div className="flex justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">{editing ? 'Editar Obrigação' : 'Nova Obrigação'}</h2>
          {!editing && (
            <p className="text-xs text-muted-foreground mt-1">
              Selecione uma ou mais obrigações para incluir de uma vez
            </p>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label-text">
              {editing ? 'Tipo de Obrigação' : 'Tipos de Obrigação'}
            </label>
            {!editing && disponiveis.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedIds.length === disponiveis.length ? 'Limpar seleção' : 'Selecionar todas'}
              </button>
            )}
          </div>

          {editing ? (
            <div className="w-full rounded-md border border-input bg-muted/40 px-3 py-2.5 text-sm">
              {editing.obrigacaoNome} ({editing.obrigacaoTipo})
            </div>
          ) : disponiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-md border border-dashed border-border px-3 py-4 text-center">
              Todas as obrigações do catálogo já estão vinculadas a este cliente.
            </p>
          ) : (
            <div className="rounded-md border border-input bg-background max-h-52 overflow-y-auto divide-y divide-border">
              {disponiveis.map(o => {
                const checked = selectedIds.includes(o.id);
                return (
                  <label
                    key={o.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                      checked ? 'bg-primary/5' : 'hover:bg-muted/40'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleId(o.id)}
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
          )}
          {!editing && selectedIds.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {selectedIds.length} selecionada(s)
            </p>
          )}
        </div>
        <div>
          <label className="label-text">Data de Vencimento</label>
          <div className="mt-1.5">
            <DateField
              value={dataVencimento}
              onChange={setDataVencimento}
            />
          </div>
          {!editing && selectedIds.length > 1 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              A mesma data será aplicada a todas as obrigações selecionadas
            </p>
          )}
        </div>
        <div>
          <label className="label-text">Observação</label>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={3}
            className="w-full mt-1.5 rounded-md border border-input bg-background px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-ring/20"
            placeholder="Opcional"
          />
        </div>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6">
        <button onClick={onClose} className="w-full sm:w-auto px-4 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
        <button
          disabled={loading || (!editing && selectedIds.length === 0)}
          onClick={() =>
            onSave({
              obrigacaoIds: selectedIds,
              dataVencimento,
              observacao,
            })
          }
          className="w-full sm:w-auto px-4 py-2.5 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading
            ? 'Salvando...'
            : editing
              ? 'Salvar'
              : selectedIds.length > 1
                ? `Adicionar ${selectedIds.length}`
                : 'Salvar'}
        </button>
      </div>
    </ModalShell>
  );
}

/** Rota legada /clientes/:id → abre o modal na listagem. */
export default function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const clienteId = id ? Number(id) : NaN;
  if (!Number.isFinite(clienteId)) {
    return <Navigate to="/clientes" replace />;
  }
  return <Navigate to="/clientes" replace state={{ viewClienteId: clienteId }} />;
}
