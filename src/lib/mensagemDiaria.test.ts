import { describe, expect, it } from 'vitest';
import { montarMensagem } from './mensagemDiaria';

describe('montarMensagem', () => {
  it('junta texto e referência bíblica sem quebrar a referência', () => {
    expect(montarMensagem('Bem-aventurados os que têm fome', 'Mateus 5:6')).toBe('Bem-aventurados os que têm fome.\u00A0—\u00A0Mateus\u00A05:6');
  });

  it('ignora o rótulo genérico "Mensagem de ânimo"', () => {
    expect(montarMensagem('Coragem!', 'Mensagem de ânimo')).toBe('Coragem!');
  });

  it('sem texto devolve vazio', () => {
    expect(montarMensagem('  ', 'João 14:2')).toBe('');
  });
});
