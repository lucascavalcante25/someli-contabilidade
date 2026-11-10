import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

/**
 * Painel do mês: substitui o checklist do Trello. Cada competência é uma folha nova
 * (tudo desmarcado) e os meses anteriores ficam como histórico.
 */

export interface OcorrenciaPainel {
  id: number;
  clienteId: number;
  clienteNome: string;
  /** Nome pelo qual a equipe conhece o cliente (razão social de MEI traz o CPF). */
  clienteNomeFantasia?: string | null;
  obrigacaoNome: string;
  setor: string | null;
  competencia: string;
  dataVencimento: string;
  status: string;
  concluidaEm: string | null;
  concluidaPorNome: string | null;
}

export interface LinhaPainel {
  clienteId: number;
  clienteNome: string;
  celulas: Record<string, OcorrenciaPainel>;
  feitas: number;
  total: number;
}

export interface MatrizPainel {
  colunas: string[];
  linhas: LinhaPainel[];
  feitas: number;
  total: number;
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const FEITO = new Set(['CONCLUIDA', 'ENTREGUE']);
export const NAO_APLICAVEL = 'NAO_APLICAVEL';

const pad = (n: number) => String(n).padStart(2, '0');

/** No mês atual trabalha-se a competência anterior (vence em novembro, competência outubro). */
export function competenciaDeTrabalho(hoje: Date = new Date()): string {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function deslocarCompetencia(competencia: string, meses: number): string {
  const [a, m] = competencia.split('-').map(Number);
  const d = new Date(a, m - 1 + meses, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function rotuloCompetencia(competencia: string): string {
  const [a, m] = competencia.split('-').map(Number);
  return `${MESES[m - 1]}/${a}`;
}

export const estaFeita = (o: OcorrenciaPainel) => FEITO.has(o.status);

export function montarMatriz(ocorrencias: OcorrenciaPainel[]): MatrizPainel {
  const frequencia = new Map<string, number>();
  const porCliente = new Map<number, LinhaPainel>();
  for (const o of ocorrencias) {
    frequencia.set(o.obrigacaoNome, (frequencia.get(o.obrigacaoNome) ?? 0) + 1);
    const nome = o.clienteNomeFantasia || o.clienteNome;
    const linha = porCliente.get(o.clienteId) ?? { clienteId: o.clienteId, clienteNome: nome, celulas: {}, feitas: 0, total: 0 };
    linha.celulas[o.obrigacaoNome] = o;
    if (o.status !== NAO_APLICAVEL) {
      linha.total++;
      if (estaFeita(o)) linha.feitas++;
    }
    porCliente.set(o.clienteId, linha);
  }
  const colunas = [...frequencia.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .map(([nome]) => nome);
  const linhas = [...porCliente.values()].sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, 'pt-BR'));
  return {
    colunas,
    linhas,
    feitas: linhas.reduce((s, l) => s + l.feitas, 0),
    total: linhas.reduce((s, l) => s + l.total, 0),
  };
}

/** Separa falha de rede (sem resposta) de erro devolvido pelo servidor. */
export class ErroPainel extends Error {
  constructor(
    message: string,
    readonly tipo: 'rede' | 'servidor',
  ) {
    super(message);
    this.name = 'ErroPainel';
  }
}

async function requisicao<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(url, init);
  } catch {
    throw new ErroPainel('Sem conexão com o servidor. Verifique a internet e tente de novo.', 'rede');
  }
  const corpo: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const mensagem =
      corpo && typeof corpo === 'object' && 'message' in corpo && typeof corpo.message === 'string'
        ? corpo.message
        : `Erro ${response.status} ao falar com o servidor`;
    throw new ErroPainel(mensagem, 'servidor');
  }
  return corpo as T;
}

export function carregarPainel(competencia: string) {
  return requisicao<OcorrenciaPainel[]>(`${API_BASE_URL}/ocorrencias?competencia=${encodeURIComponent(competencia)}`);
}

export type Segmento = 'SERVICOS' | 'COMERCIO_INDUSTRIA';
const SEGMENTOS: Segmento[] = ['SERVICOS', 'COMERCIO_INDUSTRIA'];

/** Segmento de cada cliente (antes eram os painéis do Trello), pela tag. */
export async function carregarSegmentos(): Promise<Record<number, Segmento>> {
  const clientes = await requisicao<{ id: number; tags?: { nome: string }[] }[]>(`${API_BASE_URL}/clientes`);
  const mapa: Record<number, Segmento> = {};
  for (const c of clientes) {
    const seg = (c.tags ?? []).map((t) => t.nome).find((n): n is Segmento => SEGMENTOS.includes(n as Segmento));
    if (seg) mapa[c.id] = seg;
  }
  return mapa;
}

export function alterarConclusao(ocorrenciaId: number, concluir: boolean) {
  return requisicao<OcorrenciaPainel>(`${API_BASE_URL}/ocorrencias/${ocorrenciaId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: concluir ? 'CONCLUIDA' : 'PENDENTE' }),
  });
}

/** Tipo do catálogo de obrigações (GET /obrigacoes). */
export interface TipoObrigacao {
  id: number;
  nome: string;
  tipo: string;
  periodicidadePadrao?: string | null;
  diaVencimentoPadrao?: number | null;
  mesVencimentoPadrao?: number | null;
}

export function carregarCatalogo() {
  return requisicao<TipoObrigacao[]>(`${API_BASE_URL}/obrigacoes`);
}

/**
 * Liga a obrigação ao cliente: é o mesmo vínculo do "Editar cliente", então aparece no cadastro,
 * no Painel V1 e no V2. O backend já cria a atividade da competência.
 */
export function adicionarAoChecklist(clienteId: number, obrigacaoId: number, dataVencimento: string) {
  return requisicao<{ id: number }>(`${API_BASE_URL}/clientes/${clienteId}/obrigacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clienteId, obrigacaoId, dataVencimento, ativo: true }),
  });
}

/** Obrigação nova no catálogo (vale para o sistema todo; ajustes finos em Tipos de Obrigação). Mensal. */
export function criarTipoObrigacao(dados: { nome: string; tipo: string; diaVencimentoPadrao: number }) {
  return requisicao<TipoObrigacao>(`${API_BASE_URL}/obrigacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...dados, diasAntecedenciaAlerta: 7, periodicidadePadrao: 'MENSAL' }),
  });
}

/** Grava o segmento do cliente (tag manual). Vale para este mês e os próximos. */
export function definirSegmento(clienteId: number, segmento: Segmento) {
  return requisicao<unknown>(`${API_BASE_URL}/clientes/${clienteId}/segmento`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ segmento }),
  });
}
