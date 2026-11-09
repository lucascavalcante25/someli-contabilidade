/** Periodicidade e vencimento padrão de um tipo de obrigação (vem de GET /obrigacoes). */
export interface VencimentoPadrao {
  periodicidadePadrao?: string | null;
  diaVencimentoPadrao?: number | null;
  mesVencimentoPadrao?: number | null;
}

export const PERIODICIDADES = [
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'ANUAL', label: 'Anual' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
  { value: 'UNICA', label: 'Única (não se repete)' },
];

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
].map((label, i) => ({ value: String(i + 1), label }));

const pad = (n: number) => String(n).padStart(2, '0');

function dataNoMes(ano: number, mes: number, dia: number): Date {
  const ultimo = new Date(ano, mes, 0).getDate();
  return new Date(ano, mes - 1, Math.min(Math.max(dia, 1), ultimo));
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function semHora(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Próxima data padrão a partir de hoje (inclusive), ou null quando o tipo não tem data fixa. */
export function proximaDataPadrao(v: VencimentoPadrao | undefined, hoje: Date = new Date()): string | null {
  if (!v?.diaVencimentoPadrao) return null;
  const base = semHora(hoje);
  const dia = v.diaVencimentoPadrao;
  if (v.periodicidadePadrao === 'ANUAL') {
    if (!v.mesVencimentoPadrao) return null;
    const neste = dataNoMes(base.getFullYear(), v.mesVencimentoPadrao, dia);
    return iso(neste < base ? dataNoMes(base.getFullYear() + 1, v.mesVencimentoPadrao, dia) : neste);
  }
  if (v.periodicidadePadrao === 'MENSAL') {
    const neste = dataNoMes(base.getFullYear(), base.getMonth() + 1, dia);
    return iso(neste < base ? dataNoMes(base.getFullYear(), base.getMonth() + 2, dia) : neste);
  }
  return null;
}

/** Anual com mês padrão (DEFIS, 13º) usa a própria data; as demais usam a data escolhida no formulário. */
export function dataParaObrigacao(v: VencimentoPadrao | undefined, escolhida: string, hoje: Date = new Date()): string {
  if (v?.periodicidadePadrao === 'ANUAL' && v.mesVencimentoPadrao) {
    return proximaDataPadrao(v, hoje) ?? escolhida;
  }
  return escolhida;
}

export function temDataPropria(v: VencimentoPadrao | undefined): boolean {
  return v?.periodicidadePadrao === 'ANUAL' && !!v.mesVencimentoPadrao && !!v.diaVencimentoPadrao;
}

export function rotuloVencimento(v: VencimentoPadrao | undefined): string {
  switch (v?.periodicidadePadrao) {
    case 'ANUAL':
      return v.mesVencimentoPadrao && v.diaVencimentoPadrao
        ? `Anual · ${pad(v.diaVencimentoPadrao)}/${pad(v.mesVencimentoPadrao)}`
        : 'Anual · data de cada cliente';
    case 'MENSAL':
      return v.diaVencimentoPadrao ? `Mensal · dia ${v.diaVencimentoPadrao}` : 'Mensal';
    case 'TRIMESTRAL':
      return 'Trimestral';
    case 'SEMESTRAL':
      return 'Semestral';
    default:
      return 'Única';
  }
}
