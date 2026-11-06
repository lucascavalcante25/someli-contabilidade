import { rotuloRegime } from '@/lib/classificacao';

/** Busca da listagem de clientes: sem acento, sem diferença de maiúsculas, CNPJ com ou sem pontuação. */

export interface ClienteBuscavel {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  proprietario?: string;
  email?: string;
  regimeTributario?: string;
  tags?: { nome: string }[];
}

function normalizar(texto: string | undefined | null): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function correspondeBusca(cliente: ClienteBuscavel, termo: string): boolean {
  const q = normalizar(termo);
  if (!q) return true;
  const campos = [
    cliente.razaoSocial,
    cliente.nomeFantasia,
    cliente.proprietario,
    cliente.email,
    cliente.regimeTributario ? rotuloRegime(cliente.regimeTributario) : '',
    ...(cliente.tags ?? []).map((t) => t.nome),
  ];
  if (campos.some((c) => normalizar(c).includes(q))) return true;
  const digitos = termo.replace(/\D/g, '');
  // Só compara CNPJ quando o termo é numérico (com ou sem . / -)
  return digitos.length >= 3 && /^[\d.\-/\s]+$/.test(termo.trim()) && (cliente.cnpj || '').includes(digitos);
}
