import { estaFeita, NAO_APLICAVEL, type LinhaPainel, type OcorrenciaPainel, type Segmento } from '@/lib/painelMensal';
import type { VencimentoPadrao } from '@/lib/vencimentoPadrao';

/**
 * Painel V2 (teste): o mesmo painel do mês em formato de quadro, como o Trello.
 * Cada cliente é um cartão; as listas mostram o andamento do checklist do mês.
 * Os dados são os mesmos do painel V1 (marcar num aparece no outro).
 */

export type Etapa = 'a-fazer' | 'em-andamento' | 'concluidos';

export interface ListaQuadro {
  id: string;
  etapa: Etapa;
  /** Segmento da lista; null em Concluídos (lista única). */
  segmento: Segmento | null;
  titulo: string;
  cartoes: LinhaPainel[];
}

const ROTULO_ETAPA: Record<Etapa, string> = { 'a-fazer': 'A fazer', 'em-andamento': 'Em andamento', concluidos: 'Concluídos' };
export const ROTULO_SEGMENTO: Record<Segmento, string> = {
  COMERCIO_INDUSTRIA: 'Comércio e Indústria',
  SERVICOS: 'Serviços',
};
export const ORDEM_SEGMENTOS: Segmento[] = ['COMERCIO_INDUSTRIA', 'SERVICOS'];
/** Cliente sem tag de segmento entra em Serviços (a maioria no Trello) até alguém arrastar o cartão. */
export const SEGMENTO_PADRAO: Segmento = 'SERVICOS';

export const segmentoDe = (clienteId: number, segmentos: Record<number, Segmento>): Segmento =>
  segmentos[clienteId] ?? SEGMENTO_PADRAO;

function etapaDe(l: LinhaPainel): Etapa {
  if (l.feitas >= l.total) return 'concluidos';
  return l.feitas === 0 ? 'a-fazer' : 'em-andamento';
}

/**
 * Como no Trello delas: A fazer e Em andamento separados por segmento (Comércio e Indústria / Serviços),
 * e um Concluídos só. Sempre 5 listas.
 */
export function agruparEmListas(linhas: LinhaPainel[], segmentos: Record<number, Segmento> = {}): ListaQuadro[] {
  const listas: ListaQuadro[] = [];
  for (const etapa of ['a-fazer', 'em-andamento'] as const) {
    for (const seg of ORDEM_SEGMENTOS) {
      const cartoes = linhas.filter((l) => etapaDe(l) === etapa && segmentoDe(l.clienteId, segmentos) === seg);
      listas.push({ id: `${etapa}-${seg}`, etapa, segmento: seg, titulo: `${ROTULO_ETAPA[etapa]} · ${ROTULO_SEGMENTO[seg]}`, cartoes });
    }
  }
  listas.push({
    id: 'concluidos', etapa: 'concluidos', segmento: null, titulo: ROTULO_ETAPA.concluidos,
    cartoes: linhas.filter((l) => etapaDe(l) === 'concluidos'),
  });
  return listas;
}

/** Atividades do cliente na ordem das colunas do painel (as mais comuns primeiro). */
export function itensDoCartao(linha: LinhaPainel, colunas: string[]): OcorrenciaPainel[] {
  return colunas.map((c) => linha.celulas[c]).filter((o): o is OcorrenciaPainel => !!o);
}

export function estaAtrasada(o: OcorrenciaPainel, hoje: string): boolean {
  return !estaFeita(o) && o.status !== NAO_APLICAVEL && !!o.dataVencimento && o.dataVencimento < hoje;
}

export function temAtrasada(linha: LinhaPainel, hoje: string): boolean {
  return Object.values(linha.celulas).some((o) => estaAtrasada(o, hoje));
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function dataNoMes(ano: number, mes: number, dia: number): string {
  const ultimo = new Date(ano, mes, 0).getDate();
  return `${ano}-${pad2(mes)}-${pad2(Math.min(Math.max(dia, 1), ultimo))}`;
}

/**
 * Vencimento para um item novo do checklist entrar no painel desta competência:
 * mês seguinte à competência, no dia padrão do tipo (ou 20). Anual com data própria (13º, DEFIS) usa a sua.
 */
export function vencimentoNaCompetencia(tipo: VencimentoPadrao, competencia: string): string {
  const [ano, mes] = competencia.split('-').map(Number);
  const venc = new Date(ano, mes, 1); // 1º dia do mês seguinte à competência
  if (tipo.periodicidadePadrao === 'ANUAL' && tipo.mesVencimentoPadrao && tipo.diaVencimentoPadrao) {
    const neste = dataNoMes(venc.getFullYear(), tipo.mesVencimentoPadrao, tipo.diaVencimentoPadrao);
    const inicio = `${venc.getFullYear()}-${pad2(venc.getMonth() + 1)}-01`;
    return neste >= inicio ? neste : dataNoMes(venc.getFullYear() + 1, tipo.mesVencimentoPadrao, tipo.diaVencimentoPadrao);
  }
  return dataNoMes(venc.getFullYear(), venc.getMonth() + 1, tipo.diaVencimentoPadrao ?? 20);
}

/** Competência em que a atividade aparece no painel: mês anterior ao vencimento (mesma regra do backend). */
export function competenciaDoVencimento(vencimento: string): string {
  const [ano, mes] = vencimento.split('-').map(Number);
  const d = new Date(ano, mes - 2, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
