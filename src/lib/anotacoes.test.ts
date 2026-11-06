import { describe, expect, it } from 'vitest';
import { partesDoTexto } from '@/lib/anotacoes';

describe('partesDoTexto', () => {
  it('deixa o link clicável e o resto como texto', () => {
    const partes = partesDoTexto('Manual em https://exemplo.test/guia e fim');
    expect(partes.map((p) => p.tipo)).toEqual(['texto', 'link', 'texto']);
    expect(partes[1].valor).toBe('https://exemplo.test/guia');
  });
});
