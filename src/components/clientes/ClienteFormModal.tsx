import { useEffect, useMemo, useState } from 'react';
import SegmentoClienteField from '@/components/clientes/SegmentoClienteField';
import type { Segmento } from '@/lib/painelMensal';
import { segmentoDasTags } from '@/lib/segmentoCliente';
import { dataParaObrigacao, type VencimentoPadrao } from '@/lib/vencimentoPadrao';
import { Info, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import ContaRecebimentoField from '@/components/clientes/ContaRecebimentoField';
import FichaClienteAcessos from '@/components/clientes/FichaClienteAcessos';
import ResponsaveisSetorFields from '@/components/clientes/ResponsaveisSetorFields';
import AppSelect from '@/components/shared/AppSelect';
import DateField from '@/components/shared/DateField';
import HintTooltip from '@/components/shared/HintTooltip';
import ModalShell from '@/components/shared/ModalShell';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useFeriados } from '@/hooks/useFeriados';
import { apiFetch } from '@/lib/http';
import { rotuloTipoObrigacao } from '@/lib/classificacao';
import { antecipaPorTipo, regraDosTipos } from '@/lib/feriados';
import { Permissoes } from '@/lib/permissions';
import { carregarResponsaveis, type ResponsaveisPorSetor } from '@/lib/responsaveis';

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
  indicacao?: string;
  formaPagamento?: string;
  contaRecebimento?: string;
  regimeTributario?: string;
  ativo?: boolean;
  certificadoVencimento?: string;
  certificadoTipo?: string;
  certificadoObservacao?: string;
  tags?: { nome: string }[];
}

const REGIME_OPTIONS = [
  { value: '', label: 'Não informado' },
  { value: 'MEI', label: 'MEI' },
  { value: 'SIMPLES_NACIONAL', label: 'Simples Nacional' },
  { value: 'LUCRO_PRESUMIDO', label: 'Lucro Presumido' },
  { value: 'LUCRO_REAL', label: 'Lucro Real' },
  { value: 'OUTRO', label: 'Outro' },
];

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

export interface ClienteFormData {
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
  /** Segmento (lista do Painel do mês); o original serve para gravar só se mudou. */
  segmento?: Segmento | '';
  segmentoOriginal?: Segmento | '';
  /** O segmento veio do CNAE da consulta do CNPJ. */
  segmentoSugerido?: boolean;
  /** Responsável de cada setor (usuário do sistema); originais servem para salvar só o que mudou. */
  responsaveis?: ResponsaveisPorSetor;
  responsaveisOriginais?: ResponsaveisPorSetor;
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


export function ClienteFormModal({
  cliente,
  prefill,
  onClose,
  onSave,
  loading,
  apiBaseUrl,
  getAuthHeaders,
  parseApiError: _parseApiError,
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
    contaRecebimento: cliente?.contaRecebimento ?? prefill?.contaRecebimento ?? '',
    regimeTributario: cliente?.regimeTributario ?? prefill?.regimeTributario ?? '',
    segmento: (cliente ? segmentoDasTags(cliente.tags) : prefill?.segmento) ?? '',
    segmentoOriginal: (cliente ? segmentoDasTags(cliente.tags) : undefined) ?? '',
    segmentoSugerido: !cliente && !!prefill?.segmentoSugerido,
    ativo: cliente?.ativo !== false,
    certificadoVencimento: cliente?.certificadoVencimento ?? prefill?.certificadoVencimento ?? '',
    certificadoTipo: cliente?.certificadoTipo ?? prefill?.certificadoTipo ?? '',
    certificadoObservacao: cliente?.certificadoObservacao ?? prefill?.certificadoObservacao ?? '',
    clienteObrigacoes: [],
  });

  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>([]);
  const { can } = useAuth();

  const [obrigacoesCatalogo, setObrigacoesCatalogo] = useState<({ id: number; nome: string; tipo: string } & VencimentoPadrao)[]>([]);
  const [pendingObrigacaoIds, setPendingObrigacaoIds] = useState<number[]>([]);
  const [batchDataVencimento, setBatchDataVencimento] = useState('');
  const feriados = useFeriados(batchDataVencimento);
  const tipoDaObrigacao = (obrigacaoId: number) => obrigacoesCatalogo.find((o) => o.id === obrigacaoId)?.tipo;
  const [loadingObrigacoes, setLoadingObrigacoes] = useState(false);
  const nextObrKeyRef = { current: 0 };

  useEffect(() => {
    if (cliente) {
      setForm(prev => ({
        ...prev,
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
        dataInicioCobranca: cliente.dataInicioCobranca ?? getPrimeiroDiaMesAtual(),
        responsavelId: cliente.responsavelId,
        indicacao: cliente.indicacao ?? '',
        formaPagamento: cliente.formaPagamento ?? '',
        contaRecebimento: cliente.contaRecebimento ?? '',
        regimeTributario: cliente.regimeTributario ?? '',
        segmento: segmentoDasTags(cliente.tags) ?? '',
        segmentoOriginal: segmentoDasTags(cliente.tags) ?? '',
        segmentoSugerido: false,
        ativo: cliente.ativo !== false,
        certificadoVencimento: cliente.certificadoVencimento ?? '',
        certificadoTipo: cliente.certificadoTipo ?? '',
        certificadoObservacao: cliente.certificadoObservacao ?? '',
      }));
    } else if (prefill) {
      setForm(prev => ({
        ...prev,
        cnpj: prefill.cnpj || '',
        razaoSocial: prefill.razaoSocial || '',
        nomeFantasia: prefill.nomeFantasia || '',
        proprietario: prefill.proprietario || '',
        telefone: prefill.telefone || '',
        email: prefill.email || '',
        honorario: prefill.honorario ?? 0,
        diaVencimento: prefill.diaVencimento ?? 10,
        tipoPagamento: (prefill.tipoPagamento || 'pessoa_juridica') as TipoPagamento,
        status: (prefill.status || 'em_dia') as StatusCliente,
        dataInicioCobranca: prefill.dataInicioCobranca ?? getPrimeiroDiaMesAtual(),
        regimeTributario: prefill.regimeTributario || '',
        segmento: prefill.segmento || '',
        segmentoOriginal: '',
        segmentoSugerido: !!prefill.segmentoSugerido,
        certificadoVencimento: prefill.certificadoVencimento || '',
        certificadoTipo: prefill.certificadoTipo || '',
        certificadoObservacao: prefill.certificadoObservacao || '',
      }));
    }
  }, [cliente, prefill]);

  useEffect(() => {
    (async () => {
      try {
        // Só ativos: quem saiu do escritório não pode ser escolhido
        const res = await apiFetch(`${apiBaseUrl}/usuarios/ativos`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data: unknown = await res.json();
          const lista = Array.isArray(data) ? data : [];
          setUsuarios(lista.map((item) => {
            const u = item as { id?: unknown; nome?: unknown };
            return { id: Number(u.id), nome: String(u.nome || '') };
          }));
        }
      } catch {
        setUsuarios([]);
      }
    })();
  }, [apiBaseUrl, getAuthHeaders]);

  useEffect(() => {
    if (!cliente?.id) return;
    carregarResponsaveis(cliente.id)
      .then((r) => setForm((p) => ({ ...p, responsaveis: r, responsaveisOriginais: r })))
      .catch(() => setForm((p) => ({ ...p, responsaveis: {}, responsaveisOriginais: {} })));
  }, [cliente?.id]);

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
        const data: unknown = await res.json();
        const lista = Array.isArray(data) ? data : [];
        const items: ClienteObrigacaoFormItem[] = lista.map((item) => {
          const o = item as { id?: number; obrigacaoId?: number; obrigacaoNome?: string; dataVencimento?: string; observacao?: string };
          return {
            id: o.id,
            obrigacaoId: Number(o.obrigacaoId),
            obrigacaoNome: o.obrigacaoNome,
            dataVencimento: o.dataVencimento ? String(o.dataVencimento).slice(0, 10) : '',
            observacao: o.observacao || '',
          };
        });
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
            dataVencimento: dataParaObrigacao(obr, data),
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
        <Tabs defaultValue="cadastro" className="min-w-0">
          <TabsList className="grid h-auto w-full grid-cols-2">
            <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            <TabsTrigger value="ficha" disabled={!cliente?.id} className="whitespace-normal px-2 text-center leading-tight">
              Acessos e anotações
            </TabsTrigger>
          </TabsList>
          {!cliente?.id && (
            <p className="mt-2 text-xs text-muted-foreground">Salve o cliente para cadastrar acessos e anotações.</p>
          )}
          <TabsContent value="cadastro" className="mt-4 focus-visible:outline-none">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(
            [
              { key: 'cnpj', label: 'CNPJ (opcional)', placeholder: '00.000.000/0000-00', type: 'text' },
              { key: 'razaoSocial', label: 'Razão Social', placeholder: '', type: 'text' },
              { key: 'nomeFantasia', label: 'Nome Fantasia', placeholder: '', type: 'text' },
              { key: 'proprietario', label: 'Responsável legal (proprietário)', placeholder: '', type: 'text' },
              { key: 'telefone', label: 'Telefone / WhatsApp do responsável', placeholder: '(85) 99999-9999', type: 'text' },
              { key: 'email', label: 'E-mail', placeholder: '', type: 'email' },
            ] as const
          ).map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="label-text">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={form[f.key] || ''}
                onChange={e => {
                  if (f.key === 'cnpj') {
                    update('cnpj', maskCnpj(e.target.value));
                    return;
                  }
                  if (f.key === 'telefone') {
                    update('telefone', maskTelefone(e.target.value));
                    return;
                  }
                  update(f.key, e.target.value);
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
            <ContaRecebimentoField
              value={form.contaRecebimento || ''}
              onChange={(v) => update('contaRecebimento', v)}
            />
            <div className="space-y-1.5">
              <label className="label-text flex items-center gap-1.5">
                Regime tributário
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help text-muted-foreground hover:text-foreground"><Info size={14} /></span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px]">
                    Usado pelos templates MEI / Simples / Presumido em Tipos de Obrigação. Sem regime, o cliente não recebe o pacote.
                  </TooltipContent>
                </Tooltip>
              </label>
              <AppSelect
                value={form.regimeTributario || ''}
                onChange={(v) => update('regimeTributario', v)}
                allowEmpty
                placeholder="Não informado"
                options={REGIME_OPTIONS}
              />
            </div>
            <SegmentoClienteField
              value={form.segmento || ''}
              sugeridoPeloCnae={form.segmentoSugerido}
              onChange={(seg) => setForm((prev) => ({ ...prev, segmento: seg, segmentoSugerido: false }))}
            />
            <div className="space-y-1.5">
              <label className="label-text flex items-center gap-1.5">
                Venc. certificado
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help text-muted-foreground hover:text-foreground"><Info size={14} /></span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[240px]">
                    Controle operacional do certificado digital (A1/A3). Não armazena arquivo nem senha. Alerta a 30 dias.
                  </TooltipContent>
                </Tooltip>
              </label>
              <DateField
                value={form.certificadoVencimento || ''}
                onChange={(v) => update('certificadoVencimento', v)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="label-text">Tipo certificado</label>
              <AppSelect
                value={form.certificadoTipo || ''}
                onChange={(v) => update('certificadoTipo', v)}
                allowEmpty
                placeholder="Não informado"
                options={[
                  { value: '', label: 'Não informado' },
                  { value: 'A1', label: 'A1' },
                  { value: 'A3', label: 'A3' },
                ]}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="label-text">Obs. certificado</label>
              <input
                type="text"
                value={form.certificadoObservacao || ''}
                onChange={(e) => update('certificadoObservacao', e.target.value)}
                placeholder="Ex.: renovar com o sócio, token no cofre..."
                maxLength={500}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4 rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div>
                <p className="text-sm font-medium">Responsáveis por setor</p>
                <p className="text-xs text-muted-foreground">
                  Cada pessoa vê no painel só os clientes e setores pelos quais responde. Deixe em branco o setor que o cliente não usa.
                </p>
              </div>
              <ResponsaveisSetorFields
                value={form.responsaveis ?? {}}
                usuarios={usuarios}
                onChange={(r) => setForm((p) => ({ ...p, responsaveis: r }))}
                somenteLeitura={!can(Permissoes.CLIENTES_RESPONSAVEIS_EDITAR)}
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
                            {rotuloTipoObrigacao(o.tipo)}
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
                        feriados={feriados}
                        antecipa={regraDosTipos(pendingObrigacaoIds.map(tipoDaObrigacao))}
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
                        <HintTooltip content="Remover obrigação">
                          <button
                            type="button"
                            onClick={() => removeObrigacao(idx)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Remover obrigação"
                          >
                            <Trash2 size={14} />
                          </button>
                        </HintTooltip>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Data Vencimento</label>
                          <DateField
                            value={obr.dataVencimento}
                            onChange={(v) => updateObrigacao(idx, 'dataVencimento', v)}
                            feriados={feriados}
                            antecipa={antecipaPorTipo(tipoDaObrigacao(obr.obrigacaoId))}
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
          </TabsContent>
          <TabsContent value="ficha" className="mt-4 min-w-0 focus-visible:outline-none">
            {cliente?.id ? (
              <FichaClienteAcessos clienteId={cliente.id} clienteNome={cliente.nomeFantasia || cliente.razaoSocial} />
            ) : null}
          </TabsContent>
        </Tabs>
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
