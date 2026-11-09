import { describe, expect, it } from 'vitest';
import { dataParaObrigacao, proximaDataPadrao, rotuloVencimento } from './vencimentoPadrao';

const hoje = new Date(2026, 10, 9); // 09/11/2026

describe('vencimentoPadrao', () => {
  it('anual com mês usa a próxima data desse mês', () => {
    expect(proximaDataPadrao({ periodicidadePadrao: 'ANUAL', diaVencimentoPadrao: 31, mesVencimentoPadrao: 3 }, hoje)).toBe('2027-03-31');
    expect(proximaDataPadrao({ periodicidadePadrao: 'ANUAL', diaVencimentoPadrao: 30, mesVencimentoPadrao: 11 }, hoje)).toBe('2026-11-30');
    expect(proximaDataPadrao({ periodicidadePadrao: 'ANUAL', diaVencimentoPadrao: 20, mesVencimentoPadrao: 12 }, hoje)).toBe('2026-12-20');
    expect(proximaDataPadrao({ periodicidadePadrao: 'ANUAL', diaVencimentoPadrao: 31, mesVencimentoPadrao: 2 }, hoje)).toBe('2027-02-28');
  });

  it('mensal usa o dia neste mês ou no próximo', () => {
    expect(proximaDataPadrao({ periodicidadePadrao: 'MENSAL', diaVencimentoPadrao: 15 }, hoje)).toBe('2026-11-15');
    expect(proximaDataPadrao({ periodicidadePadrao: 'MENSAL', diaVencimentoPadrao: 5 }, hoje)).toBe('2026-12-05');
  });

  it('sem data padrão (alvará, bombeiros) não sugere', () => {
    expect(proximaDataPadrao({ periodicidadePadrao: 'ANUAL', diaVencimentoPadrao: null, mesVencimentoPadrao: null }, hoje)).toBeNull();
    expect(proximaDataPadrao({ periodicidadePadrao: 'UNICA' }, hoje)).toBeNull();
  });

  it('ao vincular várias de uma vez, a anual com data própria ignora a data escolhida', () => {
    const defis = { periodicidadePadrao: 'ANUAL', diaVencimentoPadrao: 31, mesVencimentoPadrao: 3 };
    const das = { periodicidadePadrao: 'MENSAL', diaVencimentoPadrao: 20 };
    expect(dataParaObrigacao(defis, '2026-11-20', hoje)).toBe('2027-03-31');
    expect(dataParaObrigacao(das, '2026-11-20', hoje)).toBe('2026-11-20');
    expect(dataParaObrigacao(undefined, '2026-11-20', hoje)).toBe('2026-11-20');
  });

  it('rótulo curto para a tabela', () => {
    expect(rotuloVencimento({ periodicidadePadrao: 'ANUAL', diaVencimentoPadrao: 31, mesVencimentoPadrao: 3 })).toBe('Anual · 31/03');
    expect(rotuloVencimento({ periodicidadePadrao: 'ANUAL' })).toBe('Anual · data de cada cliente');
    expect(rotuloVencimento({ periodicidadePadrao: 'MENSAL', diaVencimentoPadrao: 15 })).toBe('Mensal · dia 15');
    expect(rotuloVencimento({ periodicidadePadrao: 'UNICA' })).toBe('Única');
  });
});
