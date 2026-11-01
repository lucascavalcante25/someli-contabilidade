import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import OcorrenciaWorkList, { type OcorrenciaItem } from '@/components/obrigacoes/OcorrenciaWorkList';

const { apiFetchMock, toastErrorMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/lib/http', () => ({ apiFetch: apiFetchMock }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastErrorMock } }));

const proximas: OcorrenciaItem[] = [
  {
    id: 1,
    clienteId: 5,
    clienteNome: 'Clínica Saúde Total Ltda',
    obrigacaoNome: 'eSocial',
    urlPortal: 'https://login.esocial.gov.br/login.aspx',
    setor: 'DEPARTAMENTO_PESSOAL',
    competencia: '2026-08',
    dataVencimento: '2026-09-15',
    status: 'PENDENTE',
    docsOk: false,
  },
];

const atrasadas: OcorrenciaItem[] = [
  {
    id: 10,
    clienteId: 1,
    clienteNome: 'ABC Tecnologia Ltda',
    obrigacaoNome: 'PGDAS-D',
    setor: 'FISCAL',
    competencia: '2026-10',
    dataVencimento: '2026-10-15',
    status: 'ATRASADA',
    docsOk: false,
    apurado: false,
  },
  {
    id: 20,
    clienteId: 2,
    clienteNome: 'Outra Empresa',
    obrigacaoNome: 'eSocial',
    setor: 'DEPARTAMENTO_PESSOAL',
    competencia: '2026-10',
    dataVencimento: '2026-10-10',
    status: 'ATRASADA',
    docsOk: false,
  },
];

function renderList(ui: React.ReactElement) {
  return render(
    <TooltipProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </TooltipProvider>
  );
}

describe('OcorrenciaWorkList — Meu Trabalho', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('não mostra coluna vazia; usa abas Urgentes/Próximas/Todas', () => {
    renderList(<OcorrenciaWorkList atrasadas={[]} proximas={proximas} />);

    expect(screen.getByRole('tab', { name: /Urgentes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Próximas/i })).toBeInTheDocument();
    expect(screen.getByTestId('fila-grid')).toBeInTheDocument();
    expect(screen.getByTestId('fila-grid').className).toMatch(/xl:grid-cols-4/);
    expect(screen.getByText('eSocial')).toBeInTheDocument();
    expect(screen.getByText('DP')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Portal/i })).toHaveAttribute(
      'href',
      'https://login.esocial.gov.br/login.aspx'
    );
    expect(screen.queryByText(/Nenhuma obrigação atrasada/i)).not.toBeInTheDocument();
  });

  it('aba Urgentes vazia mostra mensagem e troca para Próximas', () => {
    renderList(<OcorrenciaWorkList atrasadas={[]} proximas={proximas} />);

    fireEvent.click(screen.getByRole('tab', { name: /Urgentes/i }));
    expect(screen.getByText(/Nenhuma obrigação atrasada ou urgente/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Próximas/i }));
    expect(screen.getByText('eSocial')).toBeInTheDocument();
  });

  it('modo ficha do cliente (items) não mostra abas do painel', () => {
    renderList(<OcorrenciaWorkList items={proximas} showCliente={false} />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByTestId('fila-lista')).toBeInTheDocument();
    expect(screen.getByText('eSocial')).toBeInTheDocument();
  });

  it('checklist atualiza localmente sem chamar onUpdated (evita remount/reordenação)', async () => {
    const onUpdated = vi.fn();
    apiFetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    renderList(
      <OcorrenciaWorkList atrasadas={atrasadas} proximas={[]} onUpdated={onUpdated} />
    );

    const cards = screen.getAllByRole('listitem');
    expect(cards[0]).toHaveTextContent('PGDAS-D');
    expect(cards[1]).toHaveTextContent('eSocial');

    const docsOk = screen.getAllByLabelText('Docs OK')[0] as HTMLInputElement;
    expect(docsOk).not.toBeChecked();
    fireEvent.click(docsOk);

    await waitFor(() => expect(docsOk).toBeChecked());
    expect(onUpdated).not.toHaveBeenCalled();
    expect(apiFetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/ocorrencias\/10\/checklist$/),
      expect.objectContaining({ method: 'PUT' })
    );

    // ordem dos cards permanece estável após o patch local
    const cardsAfter = screen.getAllByRole('listitem');
    expect(cardsAfter[0]).toHaveTextContent('PGDAS-D');
    expect(cardsAfter[1]).toHaveTextContent('eSocial');
  });

  it('checklist reverte e mostra erro quando o PUT falha', async () => {
    apiFetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Falha ao atualizar checklist' }),
    });

    renderList(<OcorrenciaWorkList atrasadas={atrasadas} proximas={[]} />);

    const docsOk = screen.getAllByLabelText('Docs OK')[0] as HTMLInputElement;
    fireEvent.click(docsOk);

    await waitFor(() => expect(docsOk).not.toBeChecked());
    expect(toastErrorMock).toHaveBeenCalled();
  });

  it('clicar no nome do cliente chama onOpenCliente (sem navegar)', () => {
    const onOpenCliente = vi.fn();
    renderList(
      <OcorrenciaWorkList atrasadas={atrasadas} proximas={[]} onOpenCliente={onOpenCliente} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'ABC Tecnologia Ltda' }));
    expect(onOpenCliente).toHaveBeenCalledWith(1);
  });
});
