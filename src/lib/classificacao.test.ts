import { describe, expect, it } from 'vitest';
import { REGIME_OPCOES, rotuloRegime, rotuloTipoObrigacao, TIPOS_OBRIGACAO } from './classificacao';

describe('tipos de obrigação', () => {
  it('tem as áreas do escritório', () => {
    expect(TIPOS_OBRIGACAO.map((t) => t.value)).toEqual(['FISCAL', 'CONTABIL', 'PESSOAL', 'SOCIETARIO', 'LICENCA', 'OUTROS']);
  });

  it('rótulo legível, e o valor cru quando desconhecido', () => {
    expect(rotuloTipoObrigacao('CONTABIL')).toBe('Contábil');
    expect(rotuloTipoObrigacao('SOCIETARIO')).toBe('Societário');
    expect(rotuloTipoObrigacao('LICENCA')).toBe('Licença');
    expect(rotuloTipoObrigacao('XYZ')).toBe('XYZ');
  });
});

describe('regime', () => {
  it('inclui Lucro Real', () => {
    expect(REGIME_OPCOES.map((r) => r.value)).toContain('LUCRO_REAL');
    expect(rotuloRegime('LUCRO_REAL')).toBe('Lucro Real');
    expect(rotuloRegime('SIMPLES_NACIONAL')).toBe('Simples Nacional');
  });

  it('vazio vira traço', () => {
    expect(rotuloRegime(undefined)).toBe('—');
    expect(rotuloRegime('')).toBe('—');
  });
});
