import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock('@/lib/http', () => ({ apiFetch: apiFetchMock }));

import { ajusteDiaUtil, antecipaPorTipo, carregarFeriados, feriadosLocais, limparCacheFeriados, regraDosTipos } from './feriados';

const consciencia = { '2026-11-20': 'Dia da Consciência Negra' };

describe('ajusteDiaUtil', () => {
  it('fiscal prorroga feriado de sexta para segunda', () => {
    expect(ajusteDiaUtil('2026-11-20', false, consciencia)).toEqual({
      data: '2026-11-23',
      motivo: '20/11 é feriado (Dia da Consciência Negra)',
    });
  });

  it('pessoal antecipa para quinta', () => {
    expect(ajusteDiaUtil('2026-11-20', true, consciencia).data).toBe('2026-11-19');
  });

  it('fim de semana também ajusta', () => {
    expect(ajusteDiaUtil('2026-09-12', false, {})).toEqual({ data: '2026-09-14', motivo: '12/09 é sábado' });
    expect(ajusteDiaUtil('2026-09-13', true, {}).data).toBe('2026-09-11');
  });

  it('dia útil fica como está', () => {
    expect(ajusteDiaUtil('2026-11-18', false, consciencia)).toEqual({ data: '2026-11-18', motivo: null });
  });
});

describe('antecipaPorTipo', () => {
  it('só Pessoal antecipa', () => {
    expect(antecipaPorTipo('PESSOAL')).toBe(true);
    expect(antecipaPorTipo('DEPARTAMENTO_PESSOAL')).toBe(true);
    expect(antecipaPorTipo('FISCAL')).toBe(false);
    expect(antecipaPorTipo(undefined)).toBe(false);
  });
});

describe('regraDosTipos', () => {
  it('todas do Pessoal antecipam, nenhuma prorroga, mistura avisa as duas', () => {
    expect(regraDosTipos(['PESSOAL', 'PESSOAL'])).toBe(true);
    expect(regraDosTipos(['FISCAL'])).toBe(false);
    expect(regraDosTipos([])).toBe(false);
    expect(regraDosTipos(['PESSOAL', 'FISCAL'])).toBe('misto');
  });
});

describe('feriados', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    limparCacheFeriados();
  });

  it('lista local tem Consciência Negra e Sexta-feira Santa', () => {
    const f = feriadosLocais(2026);
    expect(f['2026-11-20']).toBe('Dia da Consciência Negra');
    expect(f['2026-04-03']).toBe('Sexta-feira Santa');
  });

  it('usa a BrasilAPI pelo backend', async () => {
    apiFetchMock.mockResolvedValue(new Response(JSON.stringify([{ date: '2026-11-20', name: 'Dia da consciência negra' }])));
    expect(await carregarFeriados(2026)).toEqual({ '2026-11-20': 'Dia da consciência negra' });
    expect(String(apiFetchMock.mock.calls[0][0])).toContain('/integracoes/feriados/2026');
  });

  it('sem conexão usa a lista local', async () => {
    apiFetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect((await carregarFeriados(2026))['2026-12-25']).toBe('Natal');
  });
});
