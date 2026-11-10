import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PainelFinanceiroAnual from './PainelFinanceiroAnual';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock('@/lib/http', () => ({ apiFetch: apiFetchMock }));

function painel(inadimplentes: { clienteId: number; nome: string; valor: number; meses: number }[]) {
  return {
    ok: true,
    json: async () => ({
      recebidoNoAno: 1000,
      despesasNoAno: 200,
      resultadoNoAno: 800,
      margemPercentual: 80,
      totalEmAberto: inadimplentes.reduce((s, i) => s + i.valor, 0),
      inadimplentes,
      reajustes: [],
    }),
  };
}

function renderizar(versao: number) {
  return (
    <MemoryRouter>
      <PainelFinanceiroAnual ano={2026} versao={versao} />
    </MemoryRouter>
  );
}

describe('PainelFinanceiroAnual', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('recarrega os maiores valores em aberto quando um pagamento é marcado, sem recarregar a página', async () => {
    apiFetchMock
      .mockResolvedValueOnce(painel([{ clienteId: 7, nome: 'Açaí Timbu', valor: 450, meses: 3 }]))
      .mockResolvedValueOnce(painel([]));

    const { rerender } = render(renderizar(0));
    expect(await screen.findByText('Açaí Timbu')).toBeTruthy();

    // A tela do Financeiro avisa que um pagamento mudou
    rerender(renderizar(1));

    expect(await screen.findByText('Nenhum valor em aberto.')).toBeTruthy();
    expect(screen.queryByText('Açaí Timbu')).toBeNull();
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
  });

  it('ao recarregar mantém a lista anterior na tela (não pisca "Carregando")', async () => {
    let resolver: (v: unknown) => void = () => undefined;
    apiFetchMock
      .mockResolvedValueOnce(painel([{ clienteId: 7, nome: 'Açaí Timbu', valor: 450, meses: 3 }]))
      .mockReturnValueOnce(new Promise((r) => { resolver = r; }));

    const { rerender } = render(renderizar(0));
    expect(await screen.findByText('Açaí Timbu')).toBeTruthy();
    rerender(renderizar(1));

    expect(screen.queryByText(/Carregando painel/)).toBeNull();
    expect(screen.getByText('Açaí Timbu')).toBeTruthy();
    resolver(painel([]));
    await waitFor(() => expect(screen.getByText('Nenhum valor em aberto.')).toBeTruthy());
  });
});
