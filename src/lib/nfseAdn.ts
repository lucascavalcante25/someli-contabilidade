import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

/** Busca automática de NFS-e no Portal Nacional (ADN) por cliente. */

export interface CertificadoA1Info {
  cnpj: string | null;
  titular: string | null;
  validoAte: string | null;
  vencido: boolean;
  enviadoEm: string | null;
}

export interface NfseAdnStatus {
  /** Servidor com CERTIFICADO_CHAVE_MESTRA configurada. */
  habilitado: boolean;
  /** Job de hora em hora ligado no servidor. */
  agendamentoLigado: boolean;
  certificado: CertificadoA1Info | null;
  ativo: boolean;
  ultimoNsu: number | null;
  ultimaConsulta: string | null;
  proximaConsulta: string | null;
  ultimoStatus: string | null;
  ultimaMensagem: string | null;
  notasImportadas: number;
}

export interface NfseSyncResultado {
  status: string;
  mensagem: string;
  novas: number;
  canceladas: number;
}

export type TomSituacao = 'ok' | 'alerta' | 'erro' | 'neutro';

export const TAMANHO_MAXIMO_CERTIFICADO = 100 * 1024;

/** Separa falha de rede (sem resposta) de erro devolvido pelo servidor. */
export class ErroNfse extends Error {
  constructor(
    message: string,
    readonly tipo: 'rede' | 'servidor',
  ) {
    super(message);
    this.name = 'ErroNfse';
  }
}

const base = (clienteId: string) => `${API_BASE_URL}/clientes/${clienteId}/nfse-adn`;

async function requisicao<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(url, init);
  } catch {
    throw new ErroNfse('Sem conexão com o servidor. Verifique a internet e tente de novo.', 'rede');
  }
  const corpo: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const mensagem =
      corpo && typeof corpo === 'object' && 'message' in corpo && typeof corpo.message === 'string'
        ? corpo.message
        : `Erro ${response.status} ao falar com o servidor`;
    throw new ErroNfse(mensagem, 'servidor');
  }
  return corpo as T;
}

export function carregarStatusNfse(clienteId: string) {
  return requisicao<NfseAdnStatus>(base(clienteId));
}

export function enviarCertificadoA1(clienteId: string, arquivo: File, senha: string) {
  const form = new FormData();
  form.append('arquivo', arquivo);
  form.append('senha', senha);
  return requisicao<NfseAdnStatus>(`${base(clienteId)}/certificado`, { method: 'POST', body: form });
}

export function removerCertificadoA1(clienteId: string) {
  return requisicao<NfseAdnStatus>(`${base(clienteId)}/certificado`, { method: 'DELETE' });
}

export function alterarBuscaNfse(clienteId: string, ativo: boolean) {
  return requisicao<NfseAdnStatus>(`${base(clienteId)}/ativo`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ativo }),
  });
}

export function sincronizarNfse(clienteId: string) {
  return requisicao<NfseSyncResultado>(`${base(clienteId)}/sincronizar`, { method: 'POST' });
}

export function situacaoNfse(s: NfseAdnStatus): { rotulo: string; tom: TomSituacao } {
  if (!s.habilitado) return { rotulo: 'Desligada no servidor', tom: 'neutro' };
  if (!s.certificado) return { rotulo: 'Sem certificado', tom: 'neutro' };
  if (s.certificado.vencido) return { rotulo: 'Certificado vencido', tom: 'erro' };
  if (!s.ativo) return { rotulo: 'Busca pausada', tom: 'neutro' };
  switch (s.ultimoStatus) {
    case 'EM_DIA':
      return { rotulo: 'Em dia', tom: 'ok' };
    case 'ERRO':
    case 'SEM_CERTIFICADO':
      return { rotulo: 'Erro na última busca', tom: 'erro' };
    case 'LIMITE':
      return { rotulo: 'Aguardando o Portal Nacional', tom: 'alerta' };
    default:
      return { rotulo: 'Aguardando primeira busca', tom: 'neutro' };
  }
}

export function validarArquivoCertificado(arquivo: File | null | undefined): string | null {
  if (!arquivo) return 'Selecione o arquivo do certificado.';
  if (!/\.(pfx|p12)$/i.test(arquivo.name)) return 'O certificado A1 deve ser um arquivo .pfx ou .p12.';
  if (arquivo.size > TAMANHO_MAXIMO_CERTIFICADO) return 'Arquivo grande demais para um certificado A1 (máximo 100 KB).';
  return null;
}

export function resumoSincronizacao(r: NfseSyncResultado): string {
  if (r.status !== 'EM_DIA') return r.mensagem;
  if (r.novas === 0 && r.canceladas === 0) return 'Nenhuma nota nova.';
  const novas = r.novas === 1 ? '1 nota nova' : `${r.novas} notas novas`;
  if (r.canceladas === 0) return `${novas}.`;
  return `${novas} e ${r.canceladas} ${r.canceladas === 1 ? 'cancelada' : 'canceladas'}.`;
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
}
