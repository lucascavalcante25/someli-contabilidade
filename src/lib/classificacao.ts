/** Rótulos de regime tributário e de tipo (área) de obrigação. O backend valida os mesmos valores. */

export const TIPOS_OBRIGACAO = [
  { value: 'FISCAL', label: 'Fiscal' },
  { value: 'CONTABIL', label: 'Contábil' },
  { value: 'PESSOAL', label: 'Pessoal' },
  { value: 'SOCIETARIO', label: 'Societário' },
  { value: 'LICENCA', label: 'Licença' },
  { value: 'OUTROS', label: 'Outros' },
] as const;

export function rotuloTipoObrigacao(tipo: string | null | undefined): string {
  return TIPOS_OBRIGACAO.find((t) => t.value === tipo)?.label ?? tipo ?? '—';
}

export const REGIME_OPCOES = [
  { value: '', label: 'Não informado' },
  { value: 'MEI', label: 'MEI' },
  { value: 'SIMPLES_NACIONAL', label: 'Simples Nacional' },
  { value: 'LUCRO_PRESUMIDO', label: 'Lucro Presumido' },
  { value: 'LUCRO_REAL', label: 'Lucro Real' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

export function rotuloRegime(regime: string | null | undefined): string {
  if (!regime) return '—';
  return REGIME_OPCOES.find((r) => r.value === regime)?.label ?? regime;
}
