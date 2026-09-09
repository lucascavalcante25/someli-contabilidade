/** Cores e rótulos curtos por setor — rastreabilidade visual na fila de trabalho. */

export const SETOR_META: Record<
  string,
  { label: string; className: string }
> = {
  FISCAL: {
    label: 'Fiscal',
    className: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  DEPARTAMENTO_PESSOAL: {
    label: 'DP',
    className: 'bg-violet-100 text-violet-800 border-violet-200',
  },
  CONTABIL: {
    label: 'Contábil',
    className: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  FINANCEIRO: {
    label: 'Financeiro',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  GERENTE_CONTA: {
    label: 'Gerente',
    className: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  SOCIETARIO: {
    label: 'Societário',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  OUTROS: {
    label: 'Outros',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export function setorMeta(setor?: string | null) {
  if (!setor) return null;
  return (
    SETOR_META[setor] || {
      label: setor.replace(/_/g, ' '),
      className: 'bg-muted text-muted-foreground border-border',
    }
  );
}

export function isHttpUrl(url?: string | null): url is string {
  if (!url) return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
