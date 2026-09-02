export type SortDir = 'asc' | 'desc';

export const STATUS_PAGAMENTO_SORT_ORDER: Record<string, number> = {
  em_dia: 0,
  pendente: 1,
  proximo_vencimento: 2,
  atrasado: 3,
  nao_iniciado: 4,
  inativo: 5,
};

export interface PagamentoSortFields {
  status?: string;
  mesesPendentes?: number;
  valorPendente?: number;
  ativo?: boolean;
}

/** Inativos sempre por último; desc = mais atrasados primeiro entre os ativos. */
export function comparePagamentoStatus(
  a: PagamentoSortFields,
  b: PagamentoSortFields,
  dir: SortDir
): number {
  const aIn = a.ativo === false ? 1 : 0;
  const bIn = b.ativo === false ? 1 : 0;
  if (aIn !== bIn) return aIn - bIn;

  const aSt = STATUS_PAGAMENTO_SORT_ORDER[a.status ?? ''] ?? 9;
  const bSt = STATUS_PAGAMENTO_SORT_ORDER[b.status ?? ''] ?? 9;

  if (dir === 'desc') {
    let cmp = bSt - aSt;
    if (cmp === 0) cmp = (b.mesesPendentes ?? 0) - (a.mesesPendentes ?? 0);
    if (cmp === 0) cmp = (b.valorPendente ?? 0) - (a.valorPendente ?? 0);
    return cmp;
  }

  let cmp = aSt - bSt;
  if (cmp === 0) cmp = (a.mesesPendentes ?? 0) - (b.mesesPendentes ?? 0);
  if (cmp === 0) cmp = (a.valorPendente ?? 0) - (b.valorPendente ?? 0);
  return cmp;
}
