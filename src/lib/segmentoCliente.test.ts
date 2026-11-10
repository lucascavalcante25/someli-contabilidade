import { describe, expect, it } from 'vitest';
import { segmentoDasTags, segmentoPeloCnae } from './segmentoCliente';

describe('segmentoPeloCnae', () => {
  it('comércio (divisões 45 a 47) e indústria (05 a 33) vão para Comércio e Indústria', () => {
    expect(segmentoPeloCnae('47.11-3-01')).toBe('COMERCIO_INDUSTRIA');
    expect(segmentoPeloCnae('45.30-7-03')).toBe('COMERCIO_INDUSTRIA');
    expect(segmentoPeloCnae('10.91-1-02')).toBe('COMERCIO_INDUSTRIA');
    expect(segmentoPeloCnae('0710-3/01')).toBe('COMERCIO_INDUSTRIA');
  });

  it('o resto (serviços, saúde, alimentação, construção...) vai para Serviços', () => {
    expect(segmentoPeloCnae('56.11-2-01')).toBe('SERVICOS');
    expect(segmentoPeloCnae('86.30-5-03')).toBe('SERVICOS');
    expect(segmentoPeloCnae('41.20-4-00')).toBe('SERVICOS');
  });

  it('sem CNAE válido não sugere nada', () => {
    expect(segmentoPeloCnae('')).toBeUndefined();
    expect(segmentoPeloCnae('-')).toBeUndefined();
    expect(segmentoPeloCnae(undefined)).toBeUndefined();
    expect(segmentoPeloCnae('00.00-0-00')).toBeUndefined();
  });
});

describe('segmentoDasTags', () => {
  it('acha o segmento entre as tags do cliente', () => {
    expect(segmentoDasTags([{ nome: 'SIMPLES_NACIONAL' }, { nome: 'COMERCIO_INDUSTRIA' }])).toBe('COMERCIO_INDUSTRIA');
    expect(segmentoDasTags([{ nome: 'SIMPLES_NACIONAL' }])).toBeUndefined();
    expect(segmentoDasTags(undefined)).toBeUndefined();
  });
});
