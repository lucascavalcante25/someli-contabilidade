import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock('@/lib/http', () => ({ apiFetch: apiFetchMock }));

import {
  ErroNfse,
  carregarStatusNfse,
  enviarCertificadoA1,
  resumoSincronizacao,
  situacaoNfse,
  validarArquivoCertificado,
  type NfseAdnStatus,
} from './nfseAdn';

const base: NfseAdnStatus = {
  habilitado: true,
  agendamentoLigado: true,
  certificado: null,
  ativo: false,
  ultimoNsu: null,
  ultimaConsulta: null,
  proximaConsulta: null,
  ultimoStatus: null,
  ultimaMensagem: null,
  notasImportadas: 0,
};

const certificado = {
  cnpj: '11222333000181',
  titular: 'EMPRESA TESTE LTDA',
  validoAte: '2027-05-10',
  vencido: false,
  enviadoEm: '2026-11-02T10:00:00',
};

describe('situacaoNfse', () => {
  it('servidor sem chave mestra: desligado', () => {
    expect(situacaoNfse({ ...base, habilitado: false }).tom).toBe('neutro');
    expect(situacaoNfse({ ...base, habilitado: false }).rotulo).toMatch(/desligad/i);
  });

  it('sem certificado', () => {
    expect(situacaoNfse(base).rotulo).toBe('Sem certificado');
  });

  it('certificado vencido tem prioridade sobre o status da busca', () => {
    const s = situacaoNfse({ ...base, ativo: true, ultimoStatus: 'EM_DIA', certificado: { ...certificado, vencido: true } });
    expect(s.rotulo).toBe('Certificado vencido');
    expect(s.tom).toBe('erro');
  });

  it('pausada', () => {
    expect(situacaoNfse({ ...base, certificado, ativo: false }).rotulo).toBe('Busca pausada');
  });

  it.each([
    ['EM_DIA', 'Em dia', 'ok'],
    ['ERRO', 'Erro na última busca', 'erro'],
    ['LIMITE', 'Aguardando o Portal Nacional', 'alerta'],
    [null, 'Aguardando primeira busca', 'neutro'],
  ])('ativa com status %s', (status, rotulo, tom) => {
    const s = situacaoNfse({ ...base, certificado, ativo: true, ultimoStatus: status });
    expect(s.rotulo).toBe(rotulo);
    expect(s.tom).toBe(tom);
  });
});

describe('validarArquivoCertificado', () => {
  const arquivo = (nome: string, tamanho = 3000) => new File([new Uint8Array(tamanho)], nome);

  it('aceita .pfx e .p12 em qualquer caixa', () => {
    expect(validarArquivoCertificado(arquivo('empresa.pfx'))).toBeNull();
    expect(validarArquivoCertificado(arquivo('EMPRESA.P12'))).toBeNull();
  });

  it('recusa outra extensão', () => {
    expect(validarArquivoCertificado(arquivo('empresa.cer'))).toMatch(/\.pfx/);
  });

  it('recusa acima de 100 KB', () => {
    expect(validarArquivoCertificado(arquivo('a.pfx', 100 * 1024 + 1))).toMatch(/100 KB/);
  });

  it('exige arquivo', () => {
    expect(validarArquivoCertificado(null)).toMatch(/Selecione/);
  });
});

describe('resumoSincronizacao', () => {
  it('descreve notas novas e canceladas', () => {
    expect(resumoSincronizacao({ status: 'EM_DIA', mensagem: '', novas: 3, canceladas: 1 })).toBe(
      '3 notas novas e 1 cancelada.',
    );
    expect(resumoSincronizacao({ status: 'EM_DIA', mensagem: '', novas: 1, canceladas: 0 })).toBe('1 nota nova.');
    expect(resumoSincronizacao({ status: 'EM_DIA', mensagem: '', novas: 0, canceladas: 0 })).toBe('Nenhuma nota nova.');
  });

  it('erro usa a mensagem do servidor', () => {
    expect(resumoSincronizacao({ status: 'ERRO', mensagem: 'E1235: Certificado não autorizado', novas: 0, canceladas: 0 })).toBe(
      'E1235: Certificado não autorizado',
    );
  });
});

describe('chamadas à API', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('falha de rede vira ErroNfse tipo rede, separado de erro do servidor', async () => {
    apiFetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const erro = await carregarStatusNfse('7').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroNfse);
    expect((erro as ErroNfse).tipo).toBe('rede');
    expect((erro as ErroNfse).message).toMatch(/conexão/i);
  });

  it('erro HTTP traz a mensagem do backend', async () => {
    apiFetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Senha incorreta ou arquivo de certificado inválido' }), { status: 409 }),
    );
    const erro = await enviarCertificadoA1('7', new File([new Uint8Array(10)], 'a.pfx'), 'x').catch((e: unknown) => e);
    expect((erro as ErroNfse).tipo).toBe('servidor');
    expect((erro as ErroNfse).message).toBe('Senha incorreta ou arquivo de certificado inválido');
  });

  it('envia certificado como multipart com arquivo e senha', async () => {
    apiFetchMock.mockResolvedValue(new Response(JSON.stringify({ ...base, certificado }), { status: 200 }));
    const status = await enviarCertificadoA1('7', new File([new Uint8Array(10)], 'a.pfx'), 'segredo');
    const [url, init] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/clientes\/7\/nfse-adn\/certificado$/);
    expect(init.method).toBe('POST');
    const body = init.body as FormData;
    expect(body.get('senha')).toBe('segredo');
    expect(body.get('arquivo')).toBeInstanceOf(File);
    expect(status.certificado?.titular).toBe('EMPRESA TESTE LTDA');
  });
});
