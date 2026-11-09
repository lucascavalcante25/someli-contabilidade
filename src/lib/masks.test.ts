import { describe, expect, it } from 'vitest';
import { maskCnpj } from './masks';

describe('maskCnpj', () => {
  it('formata CNPJ completo e parcial', () => {
    expect(maskCnpj('21835649000100')).toBe('21.835.649/0001-00');
    expect(maskCnpj('218356')).toBe('21.835.6');
  });
});
