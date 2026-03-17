import { useState } from 'react';
import { Search, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

interface CnpjResult {
  razaoSocial: string;
  nomeFantasia: string;
  situacao: string;
  dataAbertura: string;
  naturezaJuridica: string;
  endereco: string;
  cnaePrincipal: string;
  cnaesSecundarios: string[];
  socios: { nome: string; qualificacao: string }[];
}

interface ReceitaAtividade {
  text?: string;
}

interface ReceitaQsa {
  nome?: string;
  qualificacao?: string;
  qual?: string;
}

interface ReceitaCnpjApiResponse {
  nome?: string;
  fantasia?: string;
  situacao?: string;
  abertura?: string;
  naturezaJuridica?: string;
  natureza_juridica?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  atividade_principal?: ReceitaAtividade[];
  atividades_secundarias?: ReceitaAtividade[];
  qsa?: ReceitaQsa[];
}

interface SintegraData {
  inscricao_estadual?: string;
  situacao_cadastral?: string;
  atividade_economica?: string;
  site_receipt?: string;
}

interface SintegraApiResponse {
  code?: number;
  codeMessage?: string;
  code_message?: string;
  header?: { date?: string; [key: string]: unknown };
  data?: SintegraData[];
  siteReceipts?: string[];
  site_receipts?: string[];
}

export default function Consultas() {
  const apiBaseUrl = API_BASE_URL;
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CnpjResult | null>(null);
  const [uf, setUf] = useState('CE');
  const [sintegraResult, setSintegraResult] = useState<{ situacaoIE: string; regime: string; ultimaAtualizacao: string } | null>(null);
  const navigate = useNavigate();

  const buildApiError = async (response: Response) => {
    try {
      const body = await response.json();
      return body?.message || 'Falha ao consultar serviço externo';
    } catch {
      return 'Falha ao consultar serviço externo ';
    }
  };

  const maskCnpj = (v: string) => {
    const nums = v.replace(/\D/g, '').slice(0, 14);
    return nums
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  const consultarCnpj = async () => {
    const nums = cnpj.replace(/\D/g, '');
    if (nums.length !== 14) { toast.error('CNPJ inválido'); return; }

    setLoading(true);
    setResult(null);
    setSintegraResult(null);

    try {
      const response = await apiFetch(`${apiBaseUrl}/someli/api/consultaCNPJ/${nums}`);
      if (!response.ok) {
        throw new Error(await buildApiError(response));
      }

      const data = (await response.json()) as ReceitaCnpjApiResponse;
      const atividadePrincipal = data.atividade_principal?.[0]?.text || '-';
      const secundarias = (data.atividades_secundarias || []).map(a => a.text || '-').filter(Boolean);
      const socios = (data.qsa || []).map(s => ({
        nome: s.nome || '-',
        qualificacao: s.qualificacao || s.qual || '-',
      }));
      const endereco = [
        [data.logradouro, data.numero].filter(Boolean).join(', '),
        data.bairro,
        data.municipio && data.uf ? `${data.municipio}/${data.uf}` : data.municipio || data.uf,
        data.cep ? `CEP ${data.cep}` : null,
      ].filter(Boolean).join(' - ');

      setResult({
        razaoSocial: data.nome || '-',
        nomeFantasia: data.fantasia || '-',
        situacao: data.situacao || '-',
        dataAbertura: data.abertura || '-',
        naturezaJuridica: data.naturezaJuridica || data.natureza_juridica || '-',
        endereco: endereco || '-',
        cnaePrincipal: atividadePrincipal,
        cnaesSecundarios: secundarias,
        socios,
      });
      toast.success('Consulta CNPJ realizada com sucesso');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao consultar CNPJ');
    } finally {
      setLoading(false);
    }
  };

  const consultarSintegra = async () => {
    const nums = cnpj.replace(/\D/g, '');
    if (nums.length !== 14) { toast.error('CNPJ inválido'); return; }

    setLoading(true);
    try {
      const response = await apiFetch(`${apiBaseUrl}/someli/api/sintegra/consulta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj: nums,
          uf,
        }),
      });

      if (!response.ok) {
        throw new Error(await buildApiError(response));
      }

      const data = (await response.json()) as SintegraApiResponse;
      const principal = data.data?.[0];
      const ultimaAtualizacao = principal?.site_receipt
        || data.siteReceipts?.[0]
        || data.site_receipts?.[0]
        || (typeof data.header?.date === 'string' ? data.header.date : '-');

      setSintegraResult({
        situacaoIE: principal?.situacao_cadastral || principal?.inscricao_estadual || '-',
        regime: principal?.atividade_economica || data.codeMessage || data.code_message || '-',
        ultimaAtualizacao,
      });
      toast.success('Consulta Sintegra realizada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao consultar Sintegra');
    } finally {
      setLoading(false);
    }
  };

  const limparConsulta = () => {
    setCnpj('');
    setResult(null);
    setSintegraResult(null);
    setUf('CE');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Consultas</h1>
        <p className="text-sm text-muted-foreground mt-1">Consulta pública de empresas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CNPJ */}
        <div className="card-surface p-5">
          <h3 className="text-sm font-semibold mb-4">Consulta CNPJ</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={cnpj}
              onChange={e => setCnpj(maskCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all tabular-nums"
            />
            <div className="flex gap-2 shrink-0">
              <button
                onClick={consultarCnpj}
                disabled={loading}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Consultar
              </button>
              <button
                onClick={limparConsulta}
                disabled={loading}
                className="rounded-md border border-input px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>

        {/* Sintegra */}
        <div className="card-surface p-5">
          <h3 className="text-sm font-semibold mb-4">Consulta Sintegra</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={cnpj}
              onChange={e => setCnpj(maskCnpj(e.target.value))}
              placeholder="CNPJ"
              className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all tabular-nums"
            />
            <div className="flex gap-2 shrink-0">
              <select
                value={uf}
                onChange={e => setUf(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-all w-20 shrink-0"
              >
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={consultarSintegra}
                disabled={loading}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Consultar
              </button>
            </div>
          </div>

          {sintegraResult && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Situação IE</span>
                <span className="font-medium">{sintegraResult.situacaoIE}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Regime</span>
                <span className="font-medium">{sintegraResult.regime}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Última Atualização</span>
                <span className="font-medium tabular-nums">{sintegraResult.ultimaAtualizacao}</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* CNPJ Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Resultado da Consulta</h3>
            <button
              onClick={() => {
                toast.success('Dados enviados para cadastro de cliente');
                navigate('/clientes', {
                  state: {
                    prefillCliente: {
                      cnpj: cnpj.replace(/\D/g, ''),
                      razaoSocial: result.razaoSocial,
                      nomeFantasia: result.nomeFantasia === '-' ? '' : result.nomeFantasia,
                      telefone: '',
                      email: '',
                      proprietario: result.socios?.[0]?.nome || '',
                    },
                  },
                });
              }}
              className="flex items-center gap-2 rounded-md bg-success px-3 py-2 text-xs font-medium text-success-foreground hover:opacity-90 transition-opacity"
            >
              <UserPlus size={14} /> Adicionar Cliente
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ['Razão Social', result.razaoSocial],
              ['Nome Fantasia', result.nomeFantasia],
              ['Situação Cadastral', result.situacao],
              ['Data Abertura', result.dataAbertura],
              ['Natureza Jurídica', result.naturezaJuridica],
              ['CNAE Principal', result.cnaePrincipal],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col py-1.5 border-b border-border">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
            <div className="md:col-span-2 flex flex-col py-1.5 border-b border-border">
              <span className="text-xs text-muted-foreground">Endereço</span>
              <span className="font-medium">{result.endereco}</span>
            </div>
          </div>

          {result.cnaesSecundarios.length > 0 && (
            <div>
              <h4 className="label-text mb-2">CNAEs Secundários</h4>
              <ul className="space-y-1">
                {result.cnaesSecundarios.map((c, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{c}</li>
                ))}
              </ul>
            </div>
          )}

          {result.socios.length > 0 && (
            <div>
              <h4 className="label-text mb-2">Quadro Societário (QSA)</h4>
              <div className="space-y-2">
                {result.socios.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-border">
                    <span className="font-medium">{s.nome}</span>
                    <span className="text-muted-foreground">{s.qualificacao}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
