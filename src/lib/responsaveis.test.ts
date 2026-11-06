import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock('@/lib/http', () => ({ apiFetch: apiFetchMock }));

import {
  carregarCarteira,
  carregarResponsaveis,
  salvarResponsaveis,
  SETORES_DO_CLIENTE,
  transferirCarteira,
} from './responsaveis';

const ok = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200 });

describe('responsáveis do cliente', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('setores do formulário', () => {
    expect(SETORES_DO_CLIENTE.map((s) => s.value)).toEqual(['FISCAL', 'DEPARTAMENTO_PESSOAL', 'CONTABIL', 'SOCIETARIO']);
  });

  it('carrega um usuário por setor (vazio = sem responsável)', async () => {
    apiFetchMock.mockResolvedValue(ok([
      { setor: 'FISCAL', usuarioId: 5 },
      { setor: 'CONTABIL', usuarioId: null },
      { setor: 'FINANCEIRO', usuarioId: 9 },
    ]));
    expect(await carregarResponsaveis(30)).toEqual({ FISCAL: 5, CONTABIL: null, FINANCEIRO: 9 });
  });

  it('salva só os setores que mudaram', async () => {
    apiFetchMock.mockResolvedValue(ok({}));
    await salvarResponsaveis(30, { FISCAL: 6, DEPARTAMENTO_PESSOAL: 5, CONTABIL: null }, { FISCAL: 5, DEPARTAMENTO_PESSOAL: 5 });
    const corpos = apiFetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(corpos).toEqual([{ setor: 'FISCAL', usuarioId: 6 }]);
    expect(String(apiFetchMock.mock.calls[0][0])).toContain('/clientes/30/responsaveis');
    expect(apiFetchMock.mock.calls[0][1].method).toBe('PUT');
  });

  it('remover responsável manda vazio', async () => {
    apiFetchMock.mockResolvedValue(ok({}));
    await salvarResponsaveis(30, { CONTABIL: null }, { CONTABIL: 7 });
    expect(JSON.parse(apiFetchMock.mock.calls[0][1].body)).toEqual({ setor: 'CONTABIL', usuarioId: null });
  });
});

describe('carteira do usuário', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('carrega e transfere', async () => {
    apiFetchMock.mockResolvedValueOnce(ok([{ setor: 'FISCAL', setorLabel: 'Fiscal', clientes: [{ id: 1, nome: 'Fra' }] }]));
    expect((await carregarCarteira(5))[0].clientes).toHaveLength(1);
    apiFetchMock.mockResolvedValueOnce(ok({ transferidos: 1 }));
    expect(await transferirCarteira(5, { FISCAL: 6 })).toBe(1);
    expect(JSON.parse(apiFetchMock.mock.calls[1][1].body)).toEqual({ destinos: { FISCAL: 6 } });
  });

  it('erro do servidor vira mensagem', async () => {
    apiFetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'Escolha quem assume os clientes de: Contábil' }), { status: 409 }));
    await expect(transferirCarteira(5, {})).rejects.toThrow('Contábil');
  });
});
