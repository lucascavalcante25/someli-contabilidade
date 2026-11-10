import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import InadimplenciaDialog from './InadimplenciaDialog';

const { marcarMock, desmarcarMock, podeMock } = vi.hoisted(() => ({
  marcarMock: vi.fn(),
  desmarcarMock: vi.fn(),
  podeMock: vi.fn((_p: string) => true),
}));
vi.mock('@/lib/pagamentos', () => ({ marcarPagamento: marcarMock, desmarcarPagamento: desmarcarMock }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ can: podeMock }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const cliente = {
  id: 5,
  razaoSocial: 'Bom Pão',
  mesesPendentes: 2,
  valorPendente: 760,
  honorario: 380,
  mesesAbertos: ['2026-09', '2026-10'],
};

function abrir(onFechar = vi.fn(), onVerFicha = vi.fn()) {
  render(<InadimplenciaDialog cliente={cliente} mascarar={(v) => v} onFechar={onFechar} onVerFicha={onVerFicha} />);
  return { dialogo: screen.getByRole('dialog'), onFechar, onVerFicha };
}

describe('InadimplenciaDialog', () => {
  beforeEach(() => {
    marcarMock.mockReset().mockResolvedValue(undefined);
    desmarcarMock.mockReset().mockResolvedValue(undefined);
    podeMock.mockReset().mockReturnValue(true);
  });

  it('mostra os meses em aberto com o valor de cada um e o total', () => {
    const { dialogo } = abrir();
    expect(within(dialogo).getByText('Setembro/2026')).toBeTruthy();
    expect(within(dialogo).getByText('Outubro/2026')).toBeTruthy();
    expect(within(dialogo).getByText(/Em aberto: R\$\s?760,00/)).toBeTruthy();
  });

  it('marcar como pago grava no Financeiro e baixa o total na hora', async () => {
    const { dialogo } = abrir();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Marcar Setembro/2026 como pago' }));
    await waitFor(() => expect(marcarMock).toHaveBeenCalledWith(5, 9, 2026));
    expect(await within(dialogo).findByText(/Em aberto: R\$\s?380,00/)).toBeTruthy();
    expect(within(dialogo).getByText('Pago')).toBeTruthy();
  });

  it('dá para desfazer o que marcou por engano', async () => {
    const { dialogo } = abrir();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Marcar Setembro/2026 como pago' }));
    fireEvent.click(await within(dialogo).findByRole('button', { name: 'Desfazer pagamento de Setembro/2026' }));
    await waitFor(() => expect(desmarcarMock).toHaveBeenCalledWith(5, 9, 2026));
    expect(await within(dialogo).findByText(/Em aberto: R\$\s?760,00/)).toBeTruthy();
  });

  it('se o servidor recusar, o mês continua em aberto', async () => {
    marcarMock.mockRejectedValueOnce(new Error('Sem permissão'));
    const { dialogo } = abrir();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Marcar Setembro/2026 como pago' }));
    await waitFor(() => expect(marcarMock).toHaveBeenCalled());
    expect(await within(dialogo).findByText(/Em aberto: R\$\s?760,00/)).toBeTruthy();
    expect(within(dialogo).queryByText('Pago')).toBeNull();
  });

  it('sem permissão de lançar pagamento, só mostra os meses', () => {
    podeMock.mockImplementation((p: string) => p !== 'FINANCEIRO_LANCAR');
    const { dialogo } = abrir();
    expect(within(dialogo).queryByRole('button', { name: /como pago/ })).toBeNull();
    expect(within(dialogo).getByText(/não tem permissão para lançar pagamentos/)).toBeTruthy();
  });

  it('fechar avisa se algo mudou, e o atalho abre a ficha do cliente', async () => {
    const { dialogo, onFechar, onVerFicha } = abrir();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Ver ficha do cliente' }));
    expect(onVerFicha).toHaveBeenCalledWith(5);
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Marcar Outubro/2026 como pago' }));
    await waitFor(() => expect(marcarMock).toHaveBeenCalled());
    fireEvent.keyDown(dialogo, { key: 'Escape' });
    await waitFor(() => expect(onFechar).toHaveBeenCalledWith(true));
  });
});
