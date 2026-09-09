import { describe, expect, it } from 'vitest';
import { isHttpUrl, setorMeta, SETOR_META } from '@/lib/setorStyles';

describe('setorStyles', () => {
  it('tem cor distinta para cada setor conhecido', () => {
    const classes = Object.values(SETOR_META).map((m) => m.className);
    expect(new Set(classes).size).toBe(classes.length);
    expect(setorMeta('DEPARTAMENTO_PESSOAL')?.label).toBe('DP');
    expect(setorMeta('FISCAL')?.className).toContain('rose');
    expect(setorMeta('OUTROS')?.label).toBe('Outros');
  });

  it('valida URL de portal http(s)', () => {
    expect(isHttpUrl('https://login.esocial.gov.br/login.aspx')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
  });
});
