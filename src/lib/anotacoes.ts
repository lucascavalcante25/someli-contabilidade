import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

export interface Anotacao {
  id: number;
  clienteId: number;
  titulo: string | null;
  texto: string;
  setor: string | null;
  fixada: boolean;
  origem: string;
  atualizadoPorNome: string | null;
  atualizadoEm: string | null;
}

export interface AnotacaoForm {
  titulo?: string | null;
  texto: string;
  setor?: string | null;
  fixada?: boolean;
  origem?: 'MANUAL' | 'TRELLO';
}

export const CHAVE_ANOTACOES = (clienteId: number) => ['cliente-anotacoes', clienteId] as const;

export class ErroAnotacao extends Error {
  readonly tipo: 'rede' | 'credencial' | 'permissao' | 'servidor';

  constructor(message: string, tipo: ErroAnotacao['tipo']) {
    super(message);
    this.name = 'ErroAnotacao';
    this.tipo = tipo;
  }
}

const LINK = /https?:\/\/[^\s<>"']+/g;

export function partesDoTexto(texto: string): { tipo: 'texto' | 'link'; valor: string }[] {
  const partes: { tipo: 'texto' | 'link'; valor: string }[] = [];
  let ultimo = 0;
  for (const match of texto.matchAll(LINK)) {
    const inicio = match.index ?? 0;
    if (inicio > ultimo) partes.push({ tipo: 'texto', valor: texto.slice(ultimo, inicio) });
    partes.push({ tipo: 'link', valor: match[0] });
    ultimo = inicio + match[0].length;
  }
  if (ultimo < texto.length || partes.length === 0) {
    partes.push({ tipo: 'texto', valor: texto.slice(ultimo) });
  }
  return partes;
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
    throw new ErroAnotacao('Sem conexão com o servidor. Verifique a internet e tente de novo.', 'rede');
  }
  if (response.status === 401) {
    throw new ErroAnotacao('Sua sessão expirou. Entre novamente.', 'credencial');
  }
  if (response.status === 204) return undefined as T;
  const corpo: unknown = await response.json().catch(() => null);
  if (response.status === 403) {
    throw new ErroAnotacao(mensagemDoCorpo(corpo) ?? 'Você não tem permissão para ver estas anotações.', 'permissao');
  }
  if (!response.ok) {
    throw new ErroAnotacao(mensagemDoCorpo(corpo) ?? `Erro ${response.status} ao falar com o servidor`, 'servidor');
  }
  return corpo as T;
}

export function listarAnotacoes(clienteId: number) {
  return requisicao<Anotacao[]>(`${API_BASE_URL}/clientes/${clienteId}/anotacoes`);
}

export function criarAnotacao(clienteId: number, dados: AnotacaoForm) {
  return requisicao<Anotacao>(`${API_BASE_URL}/clientes/${clienteId}/anotacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
}

export function atualizarAnotacao(anotacaoId: number, dados: AnotacaoForm) {
  return requisicao<Anotacao>(`${API_BASE_URL}/anotacoes/${anotacaoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
}

export function desativarAnotacao(anotacaoId: number) {
  return requisicao<null>(`${API_BASE_URL}/anotacoes/${anotacaoId}`, { method: 'DELETE' });
}
