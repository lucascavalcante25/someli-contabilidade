import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FichaClienteAcessos, { AcessosLista } from './FichaClienteAcessos';

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

  it('erro do servidor (ex.: cofre sem chave, 409) aparece na hora, sem ficar em "Carregando" tentando de novo', async () => {
    const { listarAcessosAbertos, ErroAcesso } = await import('@/lib/acessos');
    const mock = vi.mocked(listarAcessosAbertos);
    mock.mockClear();
    mock.mockRejectedValueOnce(new ErroAcesso('Cofre de acessos não configurado', 'servidor'));
    // QueryClient com as opções padrão do app (que tentam de novo 3 vezes)
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AcessosLista clienteId={2} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Cofre de acessos não configurado')).toBeTruthy();
    expect(screen.queryByText(/Carregando acessos/)).toBeNull();
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('mostra acessos e anotações do Trello sem o Markdown (```, **, links duplicados)', async () => {
    const { listarAcessosAbertos } = await import('@/lib/acessos');
    const { listarAnotacoes } = await import('@/lib/anotacoes');
    vi.mocked(listarAcessosAbertos).mockResolvedValueOnce([{
      id: 9, clienteId: 2, sistema: 'Acessos (Trello)', url: null, login: '—', senha: '—',
      observacao: 'Login: FULANO\nSenha: exemplo1        \\*\\*SISTEMA\\*\\*\n[https://exemplo.test/x](https://exemplo.test/x "")',
      setor: null, origem: 'TRELLO', atualizadoPorNome: null, atualizadoEm: null,
    }]);
    vi.mocked(listarAnotacoes).mockResolvedValueOnce([
      { id: 3, clienteId: 2, titulo: 'Descrição', texto: '```\n        **ISS CURITIBA**\n```', setor: null, fixada: false, autorNome: null, atualizadoEm: null } as never,
    ]);
    renderizar();
    expect(await screen.findByText((_t, el) => el?.tagName === 'P' && el.textContent === 'Login: FULANO\nSenha: exemplo1 SISTEMA\nhttps://exemplo.test/x')).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Anotações/ }));
    expect(await screen.findByText('ISS CURITIBA')).toBeTruthy();
    expect(screen.queryByText(/```/)).toBeNull();
  });

  it('anotação que fica vazia depois da limpeza nem aparece', async () => {
    const { listarAnotacoes } = await import('@/lib/anotacoes');
    vi.mocked(listarAnotacoes).mockResolvedValueOnce([
      { id: 4, clienteId: 2, titulo: 'Descrição', texto: '```\n   \n```', setor: null, fixada: false, origem: 'TRELLO', atualizadoPorNome: null, atualizadoEm: null },
      { id: 5, clienteId: 2, titulo: 'obrigações', texto: 'legalização', setor: null, fixada: false, origem: 'TRELLO', atualizadoPorNome: null, atualizadoEm: null },
    ]);
    renderizar();
    fireEvent.mouseDown(await screen.findByRole('tab', { name: /Anotações/ }));
    expect(await screen.findByText('legalização')).toBeTruthy();
    expect(screen.queryByText('Descrição')).toBeNull();
    expect(screen.queryByText('Sem texto')).toBeNull();
  });

  it('se todas estiverem vazias, mostra "Nenhuma anotação cadastrada"', async () => {
    const { listarAnotacoes } = await import('@/lib/anotacoes');
    vi.mocked(listarAnotacoes).mockResolvedValueOnce([
      { id: 4, clienteId: 2, titulo: 'Descrição', texto: '   ', setor: null, fixada: false, origem: 'TRELLO', atualizadoPorNome: null, atualizadoEm: null },
    ]);
    renderizar();
    fireEvent.mouseDown(await screen.findByRole('tab', { name: /Anotações/ }));
    expect(await screen.findByText('Nenhuma anotação cadastrada')).toBeTruthy();
  });

  it('não mostra login e senha de marcador quando o texto todo está na observação', async () => {
    renderizar();
    await screen.findByText(/SENHA: ficticia1/);
    expect(screen.queryByText('—')).toBeNull();
    expect(screen.getAllByRole('button', { name: /Copiar senha/ })).toHaveLength(1);
  });
});
