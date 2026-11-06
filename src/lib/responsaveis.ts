import { API_BASE_URL } from '@/lib/api';
import { apiFetch } from '@/lib/http';

/** Responsável de cada setor do cliente (usuário do sistema) e carteira de cada usuário. */

export const SETORES_DO_CLIENTE = [
  { value: 'FISCAL', label: 'Responsável fiscal' },
  { value: 'DEPARTAMENTO_PESSOAL', label: 'Responsável pessoal' },
  { value: 'CONTABIL', label: 'Responsável contábil' },
  { value: 'SOCIETARIO', label: 'Responsável societário' },
] as const;

/** setor → id do usuário (null = sem responsável) */
export type ResponsaveisPorSetor = Record<string, number | null>;

export interface CarteiraSetor {
  setor: string;
  setorLabel: string;
  clientes: { id: number; nome: string }[];
}

async function requisicao<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(url, init);
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.');
  }
  const corpo: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const mensagem =
      corpo && typeof corpo === 'object' && 'message' in corpo && typeof corpo.message === 'string'
        ? corpo.message
        : `Erro ${response.status} ao falar com o servidor`;
    throw new Error(mensagem);
  }
  return corpo as T;
}

export async function carregarResponsaveis(clienteId: number): Promise<ResponsaveisPorSetor> {
  const lista = await requisicao<{ setor: string; usuarioId: number | null }[]>(
    `${API_BASE_URL}/clientes/${clienteId}/responsaveis`
  );
  return Object.fromEntries(lista.map((r) => [r.setor, r.usuarioId ?? null]));
}

/** Grava só os setores que mudaram (o servidor guarda o histórico de cada troca). */
export async function salvarResponsaveis(
  clienteId: number,
  novos: ResponsaveisPorSetor,
  antigos: ResponsaveisPorSetor
): Promise<void> {
  for (const [setor, usuarioId] of Object.entries(novos)) {
    if ((antigos[setor] ?? null) === (usuarioId ?? null)) continue;
    await requisicao(`${API_BASE_URL}/clientes/${clienteId}/responsaveis`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setor, usuarioId: usuarioId ?? null }),
    });
  }
}

export function carregarCarteira(usuarioId: number) {
  return requisicao<CarteiraSetor[]>(`${API_BASE_URL}/usuarios/${usuarioId}/carteira`);
}

export async function transferirCarteira(usuarioId: number, destinos: Record<string, number>): Promise<number> {
  const r = await requisicao<{ transferidos: number }>(`${API_BASE_URL}/usuarios/${usuarioId}/carteira/transferir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destinos }),
  });
  return r.transferidos;
}
