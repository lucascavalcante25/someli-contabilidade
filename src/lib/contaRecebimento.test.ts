import { describe, expect, it } from 'vitest';
import { CONTA_RECEBIMENTO_OPCOES, rotuloContaRecebimento } from './contaRecebimento';

describe('conta de recebimento', () => {
  it('mostra o nome da conta', () => {
    expect(rotuloContaRecebimento('SOMELI')).toBe('Someli');
    expect(rotuloContaRecebimento('PATRICIA')).toBe('Patrícia');
  });

  it('sem conta informada mostra traço', () => {
    expect(rotuloContaRecebimento(undefined)).toBe('—');
    expect(rotuloContaRecebimento('')).toBe('—');
  });

  it('oferece as duas contas e a opção de não informar', () => {
    expect(CONTA_RECEBIMENTO_OPCOES.map((o) => o.value)).toEqual(['', 'SOMELI', 'PATRICIA']);
  });
});
