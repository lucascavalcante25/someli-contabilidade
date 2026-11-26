import { describe, expect, it } from 'vitest';
import {
  anexoDaAtividade,
  avisoSimulacao,
  montarOperacaoRegimeRegular,
  montarOperacaoSimples,
  relatorioHtml,
  resumirResultado,
  resumoParaCsv,
  type FormRegimeRegular,
  type FormSimples,
} from './simuladorRtc';

const baseRR: FormRegimeRegular = {
  data: '2027-03-10',
  municipio: '2304400',
  uf: 'CE',
  tpDoc: '',
  aliquotas: { cbs: '8.8', ibsEstadual: '0.05', ibsMunicipal: '0.05' },
  itens: [{ ncm: '', nbs: '122011200', cst: '200', cClassTrib: '200028', baseCalculo: '1200,00' }],
};

describe('montarOperacaoRegimeRegular', () => {
  it('a partir de 2027 leva as alíquotas nominais em cada item (exigência da calculadora)', () => {
    const op = montarOperacaoRegimeRegular(baseRR, 'sim-1');
    expect(op).toMatchObject({
      id: 'sim-1',
      versao: '1.0.0',
      dhFatoGerador: '2027-03-10T12:00:00-03:00',
      municipio: 2304400,
      uf: 'CE',
    });
    expect(op.itens[0]).toEqual({
      numero: 1,
      nbs: '122011200',
      cst: '200',
      cClassTrib: '200028',
      baseCalculo: 1200,
      aliquotasNominais: { cbs: 8.8, ibsEstadual: 0.05, ibsMunicipal: 0.05 },
    });
    expect(op).not.toHaveProperty('tpDoc');
  });

  it('em 2026 não manda alíquota (a calculadora proíbe e usa a tabela dela)', () => {
    const op = montarOperacaoRegimeRegular({ ...baseRR, data: '2026-06-01' }, 'sim-2');
    expect(op.itens[0]).not.toHaveProperty('aliquotasNominais');
  });

  it('item com Imposto Seletivo leva o grupo e a alíquota ad valorem', () => {
    const op = montarOperacaoRegimeRegular({
      ...baseRR,
      itens: [{
        ncm: '22030000', nbs: '', cst: '000', cClassTrib: '000001', baseCalculo: '',
        quantidade: '12', unidade: 'LT',
        impostoSeletivo: { cst: '000', cClassTrib: '000001', baseCalculo: '150', impostoInformado: '15', aliquotaAdValorem: '10' },
      }],
    }, 'sim-3');
    expect(op.itens[0]).toEqual({
      numero: 1, ncm: '22030000', cst: '000', cClassTrib: '000001', quantidade: 12, unidade: 'LT',
      impostoSeletivo: { cst: '000', cClassTrib: '000001', baseCalculo: 150, quantidade: 12, unidade: 'LT', impostoInformado: 15 },
      aliquotasNominais: { cbs: 8.8, ibsEstadual: 0.05, ibsMunicipal: 0.05, impostoSeletivo: { adValorem: 10 } },
    });
  });

  it('tipo de documento vai como número quando escolhido', () => {
    expect(montarOperacaoRegimeRegular({ ...baseRR, tpDoc: '55' }, 'x').tpDoc).toBe(55);
  });
});

const baseSN: FormSimples = {
  data: '2027-03-15',
  documento: '55',
  fatorR: false,
  impedimentoSublimite: false,
  aliquotaCbs: '2,3591',
  aliquotaIbs: '0.0260',
  itens: [{ cAtivSN: '1', cClassTrib: '000001', ncm: '22030000', nbs: '', baseCalculo: '950', valorImpostoSeletivo: '' }],
};

describe('anexoDaAtividade', () => {
  it('segue o catálogo de atividades do Simples da calculadora', () => {
    expect(anexoDaAtividade('01', false)).toBe('anexoI');
    expect(anexoDaAtividade('04', false)).toBe('anexoII');
    expect(anexoDaAtividade('07', false)).toBe('anexoIII');
    expect(anexoDaAtividade('09', false)).toBe('anexoV');
    expect(anexoDaAtividade('09', true)).toBe('anexoIII');
    expect(anexoDaAtividade('14', false)).toBe('anexoIV');
    expect(anexoDaAtividade('90', false)).toBeNull();
  });
});

describe('montarOperacaoSimples', () => {
  it('NF-e: CRT 1, valores em texto e a alíquota no anexo da atividade', () => {
    const op = montarOperacaoSimples(baseSN, 'sn-1');
    expect(op).toEqual({
      id: 'sn-1',
      versao: '3.0.0',
      data: '2027-03-15',
      tpDoc: '55',
      CRT: '1',
      aliquotasEfetivas: {
        fatorR: false,
        impedimentoSublimite: false,
        anexoI: { pCBSSN: '2.3591', pIBSSN: '0.0260' },
      },
      itens: [{
        numero: 1, cAtivSN: '01', cClassTrib: '000001', ncm: '22030000',
        baseCalculo: '950.00', valorImpostoSeletivo: '0.00',
      }],
    });
  });

  it('NFS-e: campos do regime da DPS, sem CRT e sem IS', () => {
    const op = montarOperacaoSimples({
      ...baseSN,
      documento: '91',
      itens: [{ cAtivSN: '14', cClassTrib: '000001', ncm: '', nbs: '114051000', baseCalculo: '10000', valorImpostoSeletivo: '', tribISSQN: '1', tpRetISSQN: '1' }],
    }, 'sn-2');
    expect(op).toMatchObject({ tpDoc: '91', opSimpNac: '3', regApIBSCBSSN: '1', regApTribSN: '1' });
    expect(op).not.toHaveProperty('CRT');
    expect(op.aliquotasEfetivas).toHaveProperty('anexoIV');
    expect(op.itens[0]).toEqual({
      numero: 1, cAtivSN: '14', cClassTrib: '000001', nbs: '114051000', baseCalculo: '10000.00',
      tribISSQN: '1', tpRetISSQN: '1',
    });
  });
});

describe('resumirResultado', () => {
  it('regime regular: lê o exemplo oficial (item 3, educação com redução de 60%) e o erro do item 4', () => {
    const resposta = {
      objetos: [
        {
          nObj: 3, estadoItem: 'CALCULO_SIMULADO',
          tribCalc: { IBSCBS: { CST: '200', cClassTrib: '200028', gIBSCBS: {
            vBC: '1200.00',
            gIBSUF: { pIBSUF: '0.05', gRed: { pRedAliq: '60.00', pAliqEfet: '0.02' }, vIBSUF: '0.24' },
            gIBSMun: { pIBSMun: '0.05', gRed: { pRedAliq: '60.00', pAliqEfet: '0.02' }, vIBSMun: '0.24' },
            vIBS: '0.48',
            gCBS: { pCBS: '8.80', gRed: { pRedAliq: '60.00', pAliqEfet: '3.52' }, vCBS: '42.24' },
          }, memoriaCalculo: { cbs: 'CBS = R$ 1.200,00 × 3,52%' } } },
        },
        {
          nObj: 4, estadoItem: 'INCONSISTENCIA_ENTRADA',
          erros: [{ code: 'REG-011', title: 'NCM não vinculada', detail: 'NCM de código 02013000 não vinculada' }],
        },
      ],
      total: { tribCalc: { ISTot: { vIS: '15.00' }, IBSCBSTot: { vBCIBSCBS: '1465.00', gIBS: { vIBS: '0.64' }, gCBS: { vCBS: '56.76' } } } },
    };

    const r = resumirResultado('REGIME_REGULAR', resposta);

    expect(r.itens[0]).toMatchObject({
      numero: 3, estado: 'CALCULO_SIMULADO', calculado: true, base: 1200, cbs: 42.24, ibsUf: 0.24, ibsMun: 0.24,
      ibs: 0.48, aliquotaCbs: 3.52, reducao: 60,
    });
    expect(r.itens[0].memoria).toBe('CBS: CBS = R$ 1.200,00 × 3,52%');
    expect(r.itens[1]).toMatchObject({ numero: 4, calculado: false });
    expect(r.itens[1].erros[0]).toContain('REG-011');
    expect(r.total).toEqual({ base: 1465, cbs: 56.76, ibs: 0.64, is: 15, totalTributos: 72.4 });
  });

  it('Simples: lê CBS e IBS do item e os totais', () => {
    const r = resumirResultado('SIMPLES_NACIONAL', {
      objetos: [{ nObj: 1, estadoItem: 'CALCULADO', tribCalc: {
        vRBSNitem: '950.00', vBC: '950.00', pIBSSN: '0.0260', vIBSSN: '0.25', pCBSSN: '2.3591', vCBSSN: '22.41',
        IS: { valor: '0.00' }, totalItem: '22.66', memoriaCalculo: { cbs: 'CBS', ibs: 'IBS' } } }],
      total: { vRBSNtot: '950.00', vBC: '950.00', vIBSSNtot: '0.25', vCBSSNtot: '22.41', totalIs: '0.00', totalTributos: '22.66' },
    });
    expect(r.itens[0]).toMatchObject({ numero: 1, calculado: true, base: 950, cbs: 22.41, ibs: 0.25, aliquotaCbs: 2.3591, aliquotaIbs: 0.026 });
    expect(r.total).toEqual({ base: 950, cbs: 22.41, ibs: 0.25, is: 0, totalTributos: 22.66 });
  });

  it('Simples: item não calculado mostra o motivo', () => {
    const r = resumirResultado('SIMPLES_NACIONAL', {
      objetos: [{ nObj: 1, estadoItem: 'NAO_CALCULADO', motivoEstado: { codigo: 'CATIVSN_AUSENTE', descricao: 'Atividade não informada' } }],
    });
    expect(r.itens[0].calculado).toBe(false);
    expect(r.itens[0].erros[0]).toContain('Atividade não informada');
    expect(r.total).toBeNull();
  });
});

describe('relatorioHtml', () => {
  it('escapa o texto digitado e leva aviso, licença e versão', () => {
    const html = relatorioHtml({
      titulo: '<script>alert(1)</script>',
      regime: 'SIMPLES_NACIONAL',
      versao: '1.0.2',
      versaoBase: 'V0073',
      resumo: { itens: [], total: null },
    });
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('versão 1.0.2');
    expect(html).toContain('licença MIT');
    expect(html).toContain('V0073');
  });
});

describe('aviso e exportação', () => {
  it('aviso fixo com a versão da calculadora', () => {
    expect(avisoSimulacao('1.7.2')).toBe(
      'Simulação com a calculadora oficial da Receita Federal (versão 1.7.2). Conferir enquadramento e classificação antes de orientar o cliente.',
    );
    expect(avisoSimulacao(null)).toContain('(versão não informada)');
  });

  it('planilha CSV com ; vírgula decimal, aviso e sem quebrar com aspas', () => {
    const csv = resumoParaCsv({
      titulo: 'Cenário "teste"',
      regime: 'REGIME_REGULAR',
      versao: '1.7.2',
      resumo: {
        itens: [{ numero: 1, estado: 'CALCULADO', calculado: true, base: 1200, cbs: 42.24, ibsUf: 0.24, ibsMun: 0.24, ibs: 0.48, is: null, aliquotaCbs: 3.52, aliquotaIbs: null, reducao: 60, memoria: '', erros: [] }],
        total: { base: 1200, cbs: 42.24, ibs: 0.48, is: 0, totalTributos: 42.72 },
      },
    });
    const linhas = csv.split('\r\n');
    expect(linhas[0]).toBe('﻿"Cenário ""teste"""');
    expect(csv).toContain('Simulação com a calculadora oficial da Receita Federal (versão 1.7.2)');
    expect(csv).toContain('1;CALCULADO;1200,00;42,24;0,24;0,24;0,48;;');
    expect(csv).toContain('Total;;1200,00;42,24;;;0,48;0,00;42,72');
  });
});
