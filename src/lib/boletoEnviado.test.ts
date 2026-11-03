import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock('@/lib/http', () => ({ apiFetch: apiFetchMock }));

import { alterarBoletoEnviado, descreverEnvioBoleto, ErroBoleto } from './boletoEnviado';

describe('descreverEnvioBoleto', () => {
  it('diz quando e quem enviou', () => {
    expect(descreverEnvioBoleto(true, '2026-11-03T09:30:00', 'Karol')).toBe('Enviado em 03/11 às 09:30 por Karol');
  });

  it('sem quem/quando ainda informa que foi enviado', () => {
    expect(descreverEnvioBoleto(true, null, null)).toBe('Boleto enviado');
  });

  it('não enviado', () => {
    expect(descreverEnvioBoleto(false, null, null)).toBe('Boleto ainda não enviado');
  });
});

describe('alterarBoletoEnviado', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('envia PUT com mês, ano e o novo estado', async () => {
    apiFetchMock.mockResolvedValue(
      new Response(JSON.stringify({ clienteId: 7, mes: 11, ano: 2026, enviado: true, enviadoEm: null, enviadoPor: 'Karol' }), {
        status: 200,
      }),
    );

    const r = await alterarBoletoEnviado(7, 11, 2026, true);

    expect(r.enviadoPor).toBe('Karol');
    const [url, init] = apiFetchMock.mock.calls[0];
    expect(String(url)).toContain('/financeiro/pagamentos/7/boleto-enviado?mes=11&ano=2026');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ enviado: true });
  });

  it('separa falha de rede de erro do servidor', async () => {
    apiFetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(alterarBoletoEnviado(7, 11, 2026, true)).rejects.toMatchObject({ tipo: 'rede' });

    apiFetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'Sem alçada' }), { status: 403 }));
    const erro = await alterarBoletoEnviado(7, 11, 2026, true).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroBoleto);
    expect(erro).toMatchObject({ tipo: 'servidor', message: 'Sem alçada' });
  });
});
