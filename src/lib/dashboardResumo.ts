import { AGUARDANDO_CLIENTE, estaFeita, NAO_APLICAVEL, type OcorrenciaPainel } from '@/lib/painelMensal';

/**
 * Números do Dashboard a partir das mesmas atividades do Painel do mês (competência de trabalho),
 * para não contradizer o painel.
 */

export interface ResumoDeHoje {
  atrasadas: number;
  vencemHoje: number;
  proximos7Dias: number;
  aguardandoCliente: number;
}

function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(a, m - 1, d + dias);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** Cada atividade em aberto entra em um só número; aguardando cliente fica separado (não é atraso do escritório). */
export function resumoDeHoje(ocorrencias: OcorrenciaPainel[], hoje: string): ResumoDeHoje {
  const limite = somarDias(hoje, 7);
  const r: ResumoDeHoje = { atrasadas: 0, vencemHoje: 0, proximos7Dias: 0, aguardandoCliente: 0 };
  for (const o of ocorrencias) {
    if (estaFeita(o) || o.status === NAO_APLICAVEL) continue;
    if (o.status === AGUARDANDO_CLIENTE) r.aguardandoCliente++;
    else if (!o.dataVencimento) continue;
    else if (o.dataVencimento < hoje) r.atrasadas++;
    else if (o.dataVencimento === hoje) r.vencemHoje++;
    else if (o.dataVencimento <= limite) r.proximos7Dias++;
  }
  return r;
}

const ROTULO_SETOR: Record<string, string> = {
  FISCAL: 'Fiscal',
  DEPARTAMENTO_PESSOAL: 'Pessoal',
  CONTABIL: 'Contábil',
  SOCIETARIO: 'Societário',
};

export interface AndamentoSetor {
  setor: string;
  rotulo: string;
  feitas: number;
  total: number;
  percentual: number;
}

export interface AndamentoDoMes {
  feitas: number;
  total: number;
  percentual: number;
  setores: AndamentoSetor[];
}

const pct = (feitas: number, total: number) => (total ? Math.round((feitas / total) * 100) : 0);

export function andamentoDoMes(ocorrencias: OcorrenciaPainel[]): AndamentoDoMes {
  const porSetor = new Map<string, { feitas: number; total: number }>();
  let feitas = 0;
  let total = 0;
  for (const o of ocorrencias) {
    if (o.status === NAO_APLICAVEL) continue;
    const chave = o.setor ?? 'OUTROS';
    const s = porSetor.get(chave) ?? { feitas: 0, total: 0 };
    s.total++;
    total++;
    if (estaFeita(o)) {
      s.feitas++;
      feitas++;
    }
    porSetor.set(chave, s);
  }
  const setores = [...porSetor.entries()]
    .map(([setor, s]) => ({ setor, rotulo: ROTULO_SETOR[setor] ?? 'Outros', feitas: s.feitas, total: s.total, percentual: pct(s.feitas, s.total) }))
    .sort((a, b) => b.total - a.total);
  return { feitas, total, percentual: pct(feitas, total), setores };
}
