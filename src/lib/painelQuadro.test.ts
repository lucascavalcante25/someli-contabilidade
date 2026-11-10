import { describe, expect, it } from 'vitest';
import { montarMatriz, type OcorrenciaPainel } from './painelMensal';
import { agruparEmListas, competenciaDoVencimento, itensDoCartao, temAtrasada, vencimentoNaCompetencia } from './painelQuadro';

describe('vencimentoNaCompetencia', () => {
  it('mensal: vence no mês seguinte à competência, no dia padrão do tipo', () => {
    expect(vencimentoNaCompetencia({ periodicidadePadrao: 'MENSAL', diaVencimentoPadrao: 15 }, '2026-10')).toBe('2026-11-15');
  });

  it('sem dia padrão usa o dia 20', () => {
    expect(vencimentoNaCompetencia({}, '2026-10')).toBe('2026-11-20');
  });

  it('dia 31 em mês curto vira o último dia', () => {
    expect(vencimentoNaCompetencia({ periodicidadePadrao: 'MENSAL', diaVencimentoPadrao: 31 }, '2027-01')).toBe('2027-02-28');
  });

  it('anual com data própria usa a sua (13º em 20/12), mesmo fora desta competência', () => {
    expect(vencimentoNaCompetencia({ periodicidadePadrao: 'ANUAL', diaVencimentoPadrao: 20, mesVencimentoPadrao: 12 }, '2026-10')).toBe('2026-12-20');
    expect(vencimentoNaCompetencia({ periodicidadePadrao: 'ANUAL', diaVencimentoPadrao: 31, mesVencimentoPadrao: 3 }, '2026-10')).toBe('2027-03-31');
  });
});

describe('competenciaDoVencimento', () => {
  it('é o mês anterior ao vencimento, como no backend', () => {
    expect(competenciaDoVencimento('2026-11-20')).toBe('2026-10');
    expect(competenciaDoVencimento('2027-01-05')).toBe('2026-12');
  });
});

const base = (o: Partial<OcorrenciaPainel>): OcorrenciaPainel => ({
  id: 1, clienteId: 1, clienteNome: 'Fra Carnes', obrigacaoNome: 'PGDAS-D', setor: 'FISCAL', competencia: '2026-10',
  dataVencimento: '2026-11-20', status: 'PENDENTE', concluidaEm: null, concluidaPorNome: null, ...o,
});

const matriz = montarMatriz([
  // Fra Carnes: 1 de 2 → em andamento
  base({ id: 1, status: 'CONCLUIDA' }),
  base({ id: 2, obrigacaoNome: 'Pró-labore', dataVencimento: '2026-11-05' }),
  // Açai Timbu: 0 de 1 → a fazer
  base({ id: 3, clienteId: 2, clienteNome: 'Açai Timbu' }),
  // Clínica: tudo feito (N/A não conta) → concluídos
  base({ id: 4, clienteId: 3, clienteNome: 'Clínica Miranda', status: 'CONCLUIDA' }),
  base({ id: 5, clienteId: 3, clienteNome: 'Clínica Miranda', obrigacaoNome: 'Pró-labore', status: 'NAO_APLICAVEL' }),
]);

describe('agruparEmListas', () => {
  it('separa A fazer e Em andamento por segmento (como os dois quadros do Trello) e junta tudo em Concluídos', () => {
    // Fra Carnes e Clínica: Comércio e Indústria; Açai Timbu: Serviços
    const listas = agruparEmListas(matriz.linhas, { 1: 'COMERCIO_INDUSTRIA', 2: 'SERVICOS', 3: 'COMERCIO_INDUSTRIA' });
    expect(listas.map((l) => l.titulo)).toEqual([
      'A fazer · Comércio e Indústria',
      'A fazer · Serviços',
      'Em andamento · Comércio e Indústria',
      'Em andamento · Serviços',
      'Concluídos',
    ]);
    const nomes = (i: number) => listas[i].cartoes.map((c) => c.clienteNome);
    expect(nomes(0)).toEqual([]);
    expect(nomes(1)).toEqual(['Açai Timbu']);
    expect(nomes(2)).toEqual(['Fra Carnes']);
    expect(nomes(3)).toEqual([]);
    expect(nomes(4)).toEqual(['Clínica Miranda']);
  });

  it('são sempre só 5 listas: cliente sem segmento entra em Serviços (a maioria no Trello) até alguém arrastar', () => {
    const listas = agruparEmListas(matriz.linhas, { 1: 'COMERCIO_INDUSTRIA' });
    expect(listas).toHaveLength(5);
    expect(listas.map((l) => l.titulo).join()).not.toMatch(/Sem segmento/);
    expect(listas[1].cartoes.map((c) => c.clienteNome)).toEqual(['Açai Timbu']);
    expect(listas[1].segmento).toBe('SERVICOS');
    expect(listas[4].segmento).toBeNull();
  });
});

describe('itensDoCartao', () => {
  it('lista as atividades do cliente na ordem das colunas do painel', () => {
    const fra = matriz.linhas.find((l) => l.clienteId === 1)!;
    expect(itensDoCartao(fra, matriz.colunas).map((o) => o.obrigacaoNome)).toEqual(['PGDAS-D', 'Pró-labore']);
  });
});

describe('temAtrasada', () => {
  it('avisa quando há atividade pendente com vencimento passado', () => {
    const fra = matriz.linhas.find((l) => l.clienteId === 1)!;
    expect(temAtrasada(fra, '2026-11-10')).toBe(true);
    expect(temAtrasada(fra, '2026-11-04')).toBe(false);
  });
});
