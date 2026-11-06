import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock('@/lib/http', () => ({ apiFetch: apiFetchMock }));

import { ACEITOS_DOCUMENTO, carregarPrevia, ErroPrevia, tipoPrevia } from './documentoPrevia';

describe('tipoPrevia', () => {
  it('PDF e imagens abrem direto', () => {
    expect(tipoPrevia('nota.PDF')).toBe('pdf');
    expect(tipoPrevia('foto.jpeg')).toBe('imagem');
    expect(tipoPrevia('foto.webp')).toBe('imagem');
  });

  it('extratos e planilhas em texto aparecem como texto', () => {
    expect(tipoPrevia('extrato.ofx')).toBe('texto');
    expect(tipoPrevia('lancamentos.csv')).toBe('texto');
    expect(tipoPrevia('extrato.txt')).toBe('texto');
    expect(tipoPrevia('nota.xml')).toBe('texto');
  });

  it('formatos do Office e ODF não têm prévia', () => {
    expect(tipoPrevia('planilha.xlsx')).toBeNull();
    expect(tipoPrevia('texto.odt')).toBeNull();
    expect(tipoPrevia('sem-extensao')).toBeNull();
  });
});

describe('ACEITOS_DOCUMENTO', () => {
  it('aceita planilhas, documentos e extratos', () => {
    for (const ext of ['.pdf', '.xls', '.xlsx', '.ods', '.odt', '.doc', '.docx', '.ofx', '.csv', '.txt']) {
      expect(ACEITOS_DOCUMENTO.split(',')).toContain(ext);
    }
  });
});

describe('carregarPrevia', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('PDF vira endereço local com o tipo certo, mesmo se o servidor mandar outro', async () => {
    apiFetchMock.mockResolvedValue(new Response(new Blob(['%PDF-1.4']), { status: 200 }));
    const criar = vi.fn((_arquivo: Blob | MediaSource) => 'blob:x');
    URL.createObjectURL = criar; // jsdom não implementa

    const p = await carregarPrevia(3, { id: 9, nomeArquivo: 'nota.pdf' });

    expect(p).toEqual({ tipo: 'pdf', url: 'blob:x' });
    expect((criar.mock.calls[0][0] as Blob).type).toBe('application/pdf');
    expect(String(apiFetchMock.mock.calls[0][0])).toContain('/clientes/3/documentos/9');
  });

  it('texto é lido como texto', async () => {
    apiFetchMock.mockResolvedValue(new Response('OFXHEADER:100', { status: 200 }));

    const p = await carregarPrevia(3, { id: 9, nomeArquivo: 'extrato.ofx' });

    expect(p).toEqual({ tipo: 'texto', texto: 'OFXHEADER:100', cortado: false });
  });

  it('separa falha de rede de erro do servidor', async () => {
    apiFetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(carregarPrevia(3, { id: 9, nomeArquivo: 'nota.pdf' })).rejects.toMatchObject({ tipo: 'rede' });

    apiFetchMock.mockResolvedValue(new Response('', { status: 404 }));
    const erro = await carregarPrevia(3, { id: 9, nomeArquivo: 'nota.pdf' }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroPrevia);
    expect(erro).toMatchObject({ tipo: 'servidor' });
  });
});
