import { describe, expect, it } from 'vitest';
import { formatarTelefone, linkWhatsApp } from './whatsapp';

describe('linkWhatsApp', () => {
  it('celular com DDD vira link com o 55 do Brasil', () => {
    expect(linkWhatsApp('(85) 98888-7777')).toBe('https://wa.me/5585988887777');
    expect(linkWhatsApp('85 3333-4444')).toBe('https://wa.me/558533334444');
  });

  it('número que já tem 55 não duplica', () => {
    expect(linkWhatsApp('+55 85 98888-7777')).toBe('https://wa.me/5585988887777');
  });

  it('vazio ou incompleto não gera link', () => {
    expect(linkWhatsApp('')).toBeNull();
    expect(linkWhatsApp(undefined)).toBeNull();
    expect(linkWhatsApp('98888-7777')).toBeNull();
  });
});

describe('formatarTelefone', () => {
  it('formata celular e fixo', () => {
    expect(formatarTelefone('85988887777')).toBe('(85) 98888-7777');
    expect(formatarTelefone('8533334444')).toBe('(85) 3333-4444');
    expect(formatarTelefone('123')).toBe('123');
  });
});
