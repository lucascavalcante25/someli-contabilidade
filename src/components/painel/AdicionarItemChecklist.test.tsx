import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdicionarItemChecklist from './AdicionarItemChecklist';

const { catalogoMock, adicionarMock, criarTipoMock, podeMock } = vi.hoisted(() => ({
  catalogoMock: vi.fn(),
  adicionarMock: vi.fn(),
  criarTipoMock: vi.fn(),
  podeMock: vi.fn((_p: string) => true),
}));
vi.mock('@/lib/painelMensal', async (original) => ({
  ...(await original<typeof import('@/lib/painelMensal')>()),
  carregarCatalogo: catalogoMock,
  adicionarAoChecklist: adicionarMock,
  criarTipoObrigacao: criarTipoMock,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ can: podeMock }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const catalogo = [
  { id: 10, nome: 'PGDAS-D', tipo: 'FISCAL', periodicidadePadrao: 'MENSAL', diaVencimentoPadrao: 20 },
  { id: 11, nome: 'Empréstimo consignado', tipo: 'PESSOAL', periodicidadePadrao: 'MENSAL', diaVencimentoPadrao: 20 },
  { id: 12, nome: '13º salário', tipo: 'PESSOAL', periodicidadePadrao: 'ANUAL', diaVencimentoPadrao: 20, mesVencimentoPadrao: 12 },
];

function renderizar(onAdicionado = vi.fn()) {
  render(
    <AdicionarItemChecklist clienteId={7} competencia="2026-10" jaNoChecklist={['PGDAS-D']} onAdicionado={onAdicionado} />,
  );
  return onAdicionado;
}

describe('AdicionarItemChecklist', () => {
  beforeEach(() => {
    catalogoMock.mockReset().mockResolvedValue(catalogo);
    adicionarMock.mockReset().mockResolvedValue({ id: 99 });
    criarTipoMock.mockReset();
    podeMock.mockReset().mockReturnValue(true);
  });

  it('liga ao cliente uma obrigação do catálogo, vencendo no mês desta competência', async () => {
    const onAdicionado = renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));
    const campo = await screen.findByLabelText('Obrigação');
    await screen.findByRole('option', { name: 'Empréstimo consignado' });
    // O que já está no checklist não aparece de novo
    expect(screen.queryByRole('option', { name: 'PGDAS-D' })).toBeNull();
    fireEvent.change(campo, { target: { value: '11' } });
    expect((screen.getByLabelText('Vencimento') as HTMLInputElement).value).toBe('2026-11-20');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao checklist' }));
    await waitFor(() => expect(adicionarMock).toHaveBeenCalledWith(7, 11, '2026-11-20'));
    expect(onAdicionado).toHaveBeenCalled();
  });

  it('avisa quando a data cai em outra competência (anual com data própria)', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));
    await screen.findByRole('option', { name: '13º salário' });
    fireEvent.change(screen.getByLabelText('Obrigação'), { target: { value: '12' } });
    expect(screen.getByText(/aparece no painel de Novembro\/2026/)).toBeTruthy();
  });

  it('cria uma obrigação nova no catálogo e já liga ao cliente', async () => {
    criarTipoMock.mockResolvedValue({ id: 50, nome: 'Parcelamento ICMS', tipo: 'FISCAL', periodicidadePadrao: 'MENSAL', diaVencimentoPadrao: 20 });
    const onAdicionado = renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));
    await screen.findByRole('option', { name: 'Empréstimo consignado' });
    fireEvent.change(screen.getByLabelText('Obrigação'), { target: { value: 'novo' } });
    fireEvent.change(screen.getByLabelText('Nome da obrigação nova'), { target: { value: 'Parcelamento ICMS' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao checklist' }));
    await waitFor(() => expect(criarTipoMock).toHaveBeenCalledWith({ nome: 'Parcelamento ICMS', tipo: 'FISCAL', diaVencimentoPadrao: 20 }));
    await waitFor(() => expect(adicionarMock).toHaveBeenCalledWith(7, 50, '2026-11-20'));
    expect(onAdicionado).toHaveBeenCalled();
  });

  it('sem permissão de gerenciar tipos não oferece criar obrigação nova', async () => {
    podeMock.mockImplementation((p: string) => p !== 'OBRIGACOES_TIPOS_GERENCIAR');
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));
    await screen.findByRole('option', { name: 'Empréstimo consignado' });
    expect(screen.queryByRole('option', { name: /Nova obrigação/ })).toBeNull();
  });

  it('sem permissão de criar obrigações não mostra o botão', () => {
    podeMock.mockReturnValue(false);
    renderizar();
    expect(screen.queryByRole('button', { name: 'Adicionar item' })).toBeNull();
  });
});
