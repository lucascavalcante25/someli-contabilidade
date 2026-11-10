import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DashboardOperacao from './DashboardOperacao';
import { CertificadosCard, InadimplentesCard } from './DashboardAtencao';
import DashboardFinanceiro from './DashboardFinanceiro';
import type { OcorrenciaPainel } from '@/lib/painelMensal';

vi.mock('recharts', async (original) => ({
  ...(await original<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 600, height: 280 }}>{children}</div>,
}));

const o = (p: Partial<OcorrenciaPainel>): OcorrenciaPainel => ({
  id: 1, clienteId: 1, clienteNome: 'Fra Carnes', obrigacaoNome: 'PGDAS-D', setor: 'FISCAL', competencia: '2026-10',
  dataVencimento: '2026-11-20', status: 'PENDENTE', concluidaEm: null, concluidaPorNome: null, ...p,
});

function comRotas(ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={ui} />
        <Route path="/painel-mensal" element={<p>Tela do Painel do mês</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DashboardOperacao', () => {
  const ocorrencias = [
    o({ id: 1, dataVencimento: '2026-11-05' }),
    o({ id: 2, dataVencimento: '2026-11-10' }),
    o({ id: 3, status: 'CONCLUIDA' }),
  ];

  it('mostra Hoje e o andamento do mês com os números do Painel', () => {
    comRotas(<DashboardOperacao ocorrencias={ocorrencias} competencia="2026-10" hoje="2026-11-10" carregando={false} erro={null} onTentarDeNovo={vi.fn()} />);
    const hoje = screen.getByRole('region', { name: 'Hoje' });
    expect(within(within(hoje).getByRole('button', { name: /Atrasadas/ })).getByText('1')).toBeTruthy();
    expect(within(within(hoje).getByRole('button', { name: /Vencem hoje/ })).getByText('1')).toBeTruthy();
    const andamento = screen.getByRole('region', { name: 'Andamento do mês' });
    expect(within(andamento).getByText(/1 de 3 feitas/)).toBeTruthy();
    expect(within(andamento).getByText(/Outubro\/2026/)).toBeTruthy();
  });

  it('clicar num número abre o Painel do mês', () => {
    comRotas(<DashboardOperacao ocorrencias={ocorrencias} competencia="2026-10" hoje="2026-11-10" carregando={false} erro={null} onTentarDeNovo={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Atrasadas/ }));
    expect(screen.getByText('Tela do Painel do mês')).toBeTruthy();
  });

  it('carregando e erro (com tentar de novo)', () => {
    const onTentar = vi.fn();
    const { unmount } = comRotas(<DashboardOperacao ocorrencias={[]} competencia="2026-10" hoje="2026-11-10" carregando erro={null} onTentarDeNovo={onTentar} />);
    expect(screen.getByText(/Carregando/)).toBeTruthy();
    unmount();
    comRotas(<DashboardOperacao ocorrencias={[]} competencia="2026-10" hoje="2026-11-10" carregando={false} erro="Sem conexão com o servidor." onTentarDeNovo={onTentar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onTentar).toHaveBeenCalled();
  });
});

describe('Inadimplentes e Certificados', () => {
  it('inadimplentes em ordem do maior valor; clicar abre a inadimplência do cliente', () => {
    const onAbrir = vi.fn();
    render(
      <InadimplentesCard
        inadimplentes={[
          { id: 5, razaoSocial: 'Bom Pão', mesesPendentes: 2, valorPendente: 760 },
          { id: 6, razaoSocial: 'Horizonte', mesesPendentes: 14, valorPendente: 30800 },
        ]}
        mascarar={(v) => v}
        onAbrir={onAbrir}
      />,
    );
    const inad = screen.getByRole('region', { name: 'Inadimplentes' });
    const botoes = within(inad).getAllByRole('button');
    expect(botoes[0].textContent).toMatch(/Horizonte/);
    fireEvent.click(botoes[1]);
    expect(onAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }));
  });

  it('sem inadimplentes o card fica no lugar, zerado', () => {
    render(<InadimplentesCard inadimplentes={[]} mascarar={(v) => v} onAbrir={vi.fn()} />);
    expect(within(screen.getByRole('region', { name: 'Inadimplentes' })).getByText('Nenhum cliente em atraso')).toBeTruthy();
  });

  it('certificados: clicar abre o cliente; vazio mostra mensagem', () => {
    const onAbrir = vi.fn();
    const { unmount } = render(
      <CertificadosCard certificados={[{ clienteId: 4, razaoSocial: 'Clínica Miranda', status: 'VENCENDO', certificadoVencimento: '2026-11-30' }]} onAbrirCliente={onAbrir} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Clínica Miranda/ }));
    expect(onAbrir).toHaveBeenCalledWith(4);
    unmount();
    render(<CertificadosCard certificados={[]} onAbrirCliente={vi.fn()} />);
    expect(screen.getByText('Nenhum certificado vencendo')).toBeTruthy();
  });
});

describe('DashboardFinanceiro', () => {
  it('quatro números do mês e o gráfico, com valores mascaráveis', () => {
    render(
      <DashboardFinanceiro
        resumo={{ receitaTotal: 1000, receitaRecebida: 600, receitaPendente: 400, despesaTotal: 300, saldo: 300 }}
        grafico={[{ mes: 'Nov', receita: 1000, despesa: 300 }]}
        mascarar={() => '••••'}
      />,
    );
    const fin = screen.getByRole('region', { name: 'Financeiro do mês' });
    for (const rotulo of ['Receita do mês', 'Recebido', 'Em aberto', 'Saldo']) {
      expect(within(fin).getByText(rotulo)).toBeTruthy();
    }
    expect(within(fin).getAllByText('••••')).toHaveLength(4);
  });
});
