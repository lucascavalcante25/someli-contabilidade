import { describe, expect, it } from 'vitest';
import { limparTextoTrello } from './textoTrello';

describe('limparTextoTrello', () => {
  it('tira o bloco de código (```) e o recuo, deixando só o título', () => {
    expect(limparTextoTrello('```\n                GOV\n```')).toBe('GOV');
    expect(limparTextoTrello('```\n           **ISS CURITIBA**\n```')).toBe('ISS CURITIBA');
  });

  it('tira negrito, inclusive o escapado (\\*\\*SISTEMA\\*\\*)', () => {
    expect(limparTextoTrello('Senha: exemplo1               \\*\\*SISTEMA\\*\\*')).toBe('Senha: exemplo1 SISTEMA');
  });

  it('link do Trello vira só o endereço', () => {
    expect(limparTextoTrello('Acesso: [https://exemplo.test/web/](https://exemplo.test/web/ "smartCard-inline")'))
      .toBe('Acesso: https://exemplo.test/web/');
    expect(limparTextoTrello('[https://exemplo.test/a?x=1](https://exemplo.test/a?x=1 "")')).toBe('https://exemplo.test/a?x=1');
  });

  it('link quebrado em duas linhas ("url]" e "(url") vira um endereço só', () => {
    expect(limparTextoTrello('https://exemplo.test/a?x=1]\n(https://exemplo.test/a?x=1\nLogin: fulano'))
      .toBe('https://exemplo.test/a?x=1\nLogin: fulano');
  });

  it('link com texto diferente do endereço vira "texto (endereço)"', () => {
    expect(limparTextoTrello('[Portal ISS](https://exemplo.test/iss)')).toBe('Portal ISS (https://exemplo.test/iss)');
  });

  it('não repete a mesma linha seguida e junta linhas em branco', () => {
    expect(limparTextoTrello('CNPJ 00000000000100\n\n\n\nCNPJ 00000000000100\nsenha: abc')).toBe('CNPJ 00000000000100\n\nsenha: abc');
  });

  it('texto normal não muda (só o espaço nas pontas)', () => {
    expect(limparTextoTrello('  acompanhar sistema  ')).toBe('acompanhar sistema');
    expect(limparTextoTrello('Senha: a*b_c')).toBe('Senha: a*b_c');
  });
});
