import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FichaClienteAcessos from './FichaClienteAcessos';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ can: () => true }),
}));

vi.mock('@/lib/acessos', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/acessos')>();
  return {
    ...original,
    listarAcessosAbertos: vi.fn().mockResolvedValue([
      {
        id: 1, clienteId: 2, sistema: 'Gov.br', url: null, login: '—', senha: '—',
        observacao: 'GOV\nCPF 000.000.000-00\nSENHA: ficticia1', setor: null, origem: 'TRELLO',
        atualizadoPorNome: 'Administrador', atualizadoEm: null,
      },
      {
        id: 2, clienteId: 2, sistema: 'e-CAC', url: 'https://cav.exemplo.test', login: 'joao', senha: 'segredo-2',
        observacao: null, setor: 'FISCAL', origem: 'MANUAL', atualizadoPorNome: null, atualizadoEm: null,
      },
    ]),
  };
});

vi.mock('@/lib/anotacoes', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/anotacoes')>();
  return { ...original, listarAnotacoes: vi.fn().mockResolvedValue([]) };
});

function renderizar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <FichaClienteAcessos clienteId={2} clienteNome="Açai Timbu" />
    </QueryClientProvider>,
  );
}

describe('FichaClienteAcessos', () => {
  it('abre a ficha já mostrando os acessos, sem precisar revelar', async () => {
    renderizar();
    expect(await screen.findByText(/SENHA: ficticia1/)).toBeTruthy();
    expect(screen.getByText('segredo-2')).toBeTruthy();
    expect(screen.getByText('joao')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Revelar/ })).toBeNull();
  });

  it('não mostra login e senha de marcador quando o texto todo está na observação', async () => {
    renderizar();
    await screen.findByText(/SENHA: ficticia1/);
    expect(screen.queryByText('—')).toBeNull();
    expect(screen.getAllByRole('button', { name: /Copiar senha/ })).toHaveLength(1);
  });
});
