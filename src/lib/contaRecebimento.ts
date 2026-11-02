/** Conta em que o honorário é recebido (coluna "S" da planilha). */
export const CONTA_RECEBIMENTO_OPCOES = [
  { value: '', label: 'Não informado' },
  { value: 'SOMELI', label: 'Someli' },
  { value: 'PATRICIA', label: 'Patrícia' },
];

export function rotuloContaRecebimento(conta?: string | null): string {
  return CONTA_RECEBIMENTO_OPCOES.find((o) => o.value && o.value === conta)?.label ?? '—';
}
