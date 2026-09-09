import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import OcorrenciaWorkList, { type OcorrenciaItem } from '@/components/obrigacoes/OcorrenciaWorkList';

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
});
