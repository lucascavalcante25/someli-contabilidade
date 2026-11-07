import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

export interface AcessoResumo {
  id: number;
  clienteId: number;
  sistema: string;
  url: string | null;
  loginMascarado: string;
  setor: string | null;
  origem: string;
  atualizadoPorNome: string | null;
  atualizadoEm: string | null;
}

export interface AcessoRevelado {
  id: number;
  login: string;
  senha: string;
  observacao: string | null;
}

/** Acesso já em claro: a ficha abre mostrando tudo, como era no Trello. */
export interface AcessoAberto {
  id: number;
  clienteId: number;
  sistema: string;
  url: string | null;
  login: string;
  senha: string;
  observacao: string | null;
  setor: string | null;
  origem: string;
  atualizadoPorNome: string | null;
  atualizadoEm: string | null;
}

/** Marcadores usados na importação quando login/senha estão só no texto da observação. */
const MARCADORES = new Set(['—', '-', 'ver observação', 'ver observacao']);

export function valorPreenchido(valor: string | null | undefined): string | null {
  const texto = (valor ?? '').trim();
  return texto && !MARCADORES.has(texto.toLowerCase()) ? texto : null;
}

export interface AcessoForm {
  sistema: string;
  url?: string | null;
  login: string;
  senha?: string | null;
  observacao?: string | null;
  setor?: string | null;
  origem?: 'MANUAL' | 'TRELLO';
}

export interface FichaContagem {
  clienteId: number;
  acessos: number;
  anotacoes: number;
}

export const CHAVE_ACESSOS = (clienteId: number) => ['cliente-acessos', clienteId] as const;
export const CHAVE_CONTAGENS = ['fichas-contagens'] as const;

export class ErroAcesso extends Error {
  readonly tipo: 'rede' | 'credencial' | 'permissao' | 'servidor';

  constructor(message: string, tipo: ErroAcesso['tipo']) {
    super(message);
    this.name = 'ErroAcesso';
    this.tipo = tipo;
  }
}

function mensagemDoCorpo(corpo: unknown): string | null {
  if (corpo && typeof corpo === 'object' && 'message' in corpo && typeof corpo.message === 'string') {
    return corpo.message;
  }
  return null;
}

async function requisicao<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(url, { cache: 'no-store', ...init }, { manterNo403: true });
  } catch {
    throw new ErroAcesso('Sem conexão com o servidor. Verifique a internet e tente de novo.', 'rede');
  }
  if (response.status === 401) {
    throw new ErroAcesso('Sua sessão expirou. Entre novamente.', 'credencial');
  }
  const corpo: unknown = await response.json().catch(() => null);
  if (response.status === 403) {
    throw new ErroAcesso(mensagemDoCorpo(corpo) ?? 'Você não tem permissão para ver estes acessos.', 'permissao');
  }
  if (!response.ok) {
    throw new ErroAcesso(mensagemDoCorpo(corpo) ?? `Erro ${response.status} ao falar com o servidor`, 'servidor');
  }
  return corpo as T;
}

export function listarAcessos(clienteId: number) {
  return requisicao<AcessoResumo[]>(`${API_BASE_URL}/clientes/${clienteId}/acessos`);
}

export function listarAcessosAbertos(clienteId: number) {
  return requisicao<AcessoAberto[]>(`${API_BASE_URL}/clientes/${clienteId}/acessos/abertos`);
}

export function criarAcesso(clienteId: number, dados: AcessoForm) {
  return requisicao<AcessoResumo>(`${API_BASE_URL}/clientes/${clienteId}/acessos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
}

export function atualizarAcesso(acessoId: number, dados: AcessoForm) {
  return requisicao<AcessoResumo>(`${API_BASE_URL}/acessos/${acessoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
}

export function desativarAcesso(acessoId: number) {
  return requisicao<null>(`${API_BASE_URL}/acessos/${acessoId}`, { method: 'DELETE' });
}

export function revelarAcesso(acessoId: number) {
  return requisicao<AcessoRevelado>(`${API_BASE_URL}/acessos/${acessoId}/revelar`, { method: 'POST' });
}

export function carregarContagens() {
  return requisicao<FichaContagem[]>(`${API_BASE_URL}/clientes/fichas/contagens`);
}
