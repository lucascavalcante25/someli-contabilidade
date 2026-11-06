import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock('@/lib/http', () => ({ apiFetch: apiFetchMock }));

import {
  alterarConclusao,
  carregarPainel,
  carregarSegmentos,
  competenciaDeTrabalho,
  deslocarCompetencia,
  montarMatriz,
  rotuloCompetencia,
  type OcorrenciaPainel,
} from './painelMensal';

const base = (o: Partial<OcorrenciaPainel>): OcorrenciaPainel => ({
  id: 1, clienteId: 1, clienteNome: 'Fra Carnes', obrigacaoNome: 'PGDAS-D', setor: 'FISCAL', competencia: '2026-10',
  dataVencimento: '2026-11-20', status: 'PENDENTE', concluidaEm: null, concluidaPorNome: null, ...o,
});

describe('competência', () => {
  it('em novembro trabalha-se a competência de outubro', () => {
    expect(competenciaDeTrabalho(new Date(2026, 10, 6))).toBe('2026-10');
    expect(competenciaDeTrabalho(new Date(2027, 0, 10))).toBe('2026-12');
  });

  it('navega entre meses e mostra rótulo', () => {
    expect(deslocarCompetencia('2026-12', 1)).toBe('2027-01');
    expect(deslocarCompetencia('2026-01', -1)).toBe('2025-12');
    expect(rotuloCompetencia('2026-10')).toBe('Outubro/2026');
  });
});

describe('montarMatriz', () => {
  it('uma linha por cliente, colunas pelas atividades mais comuns e progresso', () => {
    const m = montarMatriz([
      base({ id: 1, clienteId: 1, clienteNome: 'Fra Carnes', obrigacaoNome: 'PGDAS-D', status: 'CONCLUIDA' }),
      base({ id: 2, clienteId: 1, clienteNome: 'Fra Carnes', obrigacaoNome: 'Pró-labore', setor: 'DEPARTAMENTO_PESSOAL' }),
      base({ id: 3, clienteId: 2, clienteNome: 'Açai Timbu', obrigacaoNome: 'PGDAS-D' }),
      base({ id: 4, clienteId: 2, clienteNome: 'Açai Timbu', obrigacaoNome: 'Encerramento fiscal (ISS)', status: 'NAO_APLICAVEL' }),
    ]);
    expect(m.colunas[0]).toBe('PGDAS-D');
    expect(m.linhas.map((l) => l.clienteNome)).toEqual(['Açai Timbu', 'Fra Carnes']);
    const fra = m.linhas[1];
    expect(fra.celulas['PGDAS-D'].id).toBe(1);
    expect([fra.feitas, fra.total]).toEqual([1, 2]);
    // Não aplicável não conta no total
    expect([m.linhas[0].feitas, m.linhas[0].total]).toEqual([0, 1]);
    expect([m.feitas, m.total]).toEqual([1, 3]);
  });
});

describe('nome do cliente', () => {
  it('usa o nome fantasia quando vem da API', () => {
    const m = montarMatriz([base({ clienteNome: '21.835.649 JOSE ALIGHIELDE', clienteNomeFantasia: 'Eudinho' })]);
    expect(m.linhas[0].clienteNome).toBe('Eudinho');
  });
});

describe('API', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('carrega a competência', async () => {
    apiFetchMock.mockResolvedValue(new Response(JSON.stringify([base({})]), { status: 200 }));
    expect(await carregarPainel('2026-10')).toHaveLength(1);
    expect(String(apiFetchMock.mock.calls[0][0])).toContain('/ocorrencias?competencia=2026-10');
  });

  it('marcar conclui e desmarcar volta para pendente', async () => {
    apiFetchMock.mockResolvedValue(new Response(JSON.stringify(base({ status: 'CONCLUIDA' })), { status: 200 }));
    await alterarConclusao(7, true);
    expect(JSON.parse(apiFetchMock.mock.calls[0][1].body)).toEqual({ status: 'CONCLUIDA' });
    await alterarConclusao(7, false);
    expect(JSON.parse(apiFetchMock.mock.calls[1][1].body)).toEqual({ status: 'PENDENTE' });
  });

  it('segmento vem da tag do cliente', async () => {
    apiFetchMock.mockResolvedValue(new Response(JSON.stringify([
      { id: 1, tags: [{ nome: 'SERVICOS' }, { nome: 'SIMPLES_NACIONAL' }] },
      { id: 2, tags: [{ nome: 'COMERCIO_INDUSTRIA' }] },
      { id: 3, tags: [] },
    ]), { status: 200 }));
    expect(await carregarSegmentos()).toEqual({ 1: 'SERVICOS', 2: 'COMERCIO_INDUSTRIA' });
  });

  it('separa falha de rede de erro do servidor', async () => {
    apiFetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(carregarPainel('2026-10')).rejects.toMatchObject({ tipo: 'rede' });
    apiFetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'Sem permissão para reabrir' }), { status: 403 }));
    await expect(alterarConclusao(7, false)).rejects.toMatchObject({ tipo: 'servidor', message: 'Sem permissão para reabrir' });
  });
});
