import { describe, expect, it } from 'vitest';
import type { OcorrenciaPainel } from './painelMensal';
import { andamentoDoMes, resumoDeHoje } from './dashboardResumo';

const o = (p: Partial<OcorrenciaPainel>): OcorrenciaPainel => ({
  id: 1, clienteId: 1, clienteNome: 'Fra Carnes', obrigacaoNome: 'PGDAS-D', setor: 'FISCAL', competencia: '2026-10',
  dataVencimento: '2026-11-20', status: 'PENDENTE', concluidaEm: null, concluidaPorNome: null, ...p,
});

const lista = [
  o({ id: 1, dataVencimento: '2026-11-05' }), // atrasada
  o({ id: 2, dataVencimento: '2026-11-05', status: 'CONCLUIDA' }), // feita: não conta
  o({ id: 3, dataVencimento: '2026-11-10' }), // vence hoje
  o({ id: 4, dataVencimento: '2026-11-15', setor: 'DEPARTAMENTO_PESSOAL' }), // próximos 7 dias
  o({ id: 5, dataVencimento: '2026-11-18' }), // fora dos 7 dias
  o({ id: 6, dataVencimento: '2026-11-01', status: 'AGUARDANDO_CLIENTE' }), // aguardando (não conta como atrasada)
  o({ id: 7, dataVencimento: '2026-11-01', status: 'NAO_APLICAVEL' }), // não se aplica: some de tudo
];

describe('resumoDeHoje', () => {
  it('conta atrasadas, vencem hoje, próximos 7 dias e aguardando cliente, sem repetir item', () => {
    expect(resumoDeHoje(lista, '2026-11-10')).toEqual({ atrasadas: 1, vencemHoje: 1, proximos7Dias: 1, aguardandoCliente: 1 });
  });
});

describe('andamentoDoMes', () => {
  it('feitas de total (N/A não conta) e o andamento por setor', () => {
    const a = andamentoDoMes(lista);
    expect(a).toMatchObject({ feitas: 1, total: 6, percentual: 17 });
    expect(a.setores).toEqual([
      { setor: 'FISCAL', rotulo: 'Fiscal', feitas: 1, total: 5, percentual: 20 },
      { setor: 'DEPARTAMENTO_PESSOAL', rotulo: 'Pessoal', feitas: 0, total: 1, percentual: 0 },
    ]);
  });

  it('sem atividades fica zerado', () => {
    expect(andamentoDoMes([])).toEqual({ feitas: 0, total: 0, percentual: 0, setores: [] });
  });
});
