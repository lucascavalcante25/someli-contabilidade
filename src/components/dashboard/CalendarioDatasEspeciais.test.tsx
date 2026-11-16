import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CalendarioDatasEspeciais from './CalendarioDatasEspeciais';
import DatasEspeciaisCard from './DatasEspeciaisCard';
import type { DataEspecial } from '@/lib/datasEspeciais';

const carregar = vi.fn();
// Falha simulada fora do espião (o vi.fn guardaria a promessa rejeitada e o Vitest a trataria como erro do teste)
const simulacao = vi.hoisted(() => ({ falha: null as Error | null, chamadas: 0 }));
vi.mock('@/lib/datasEspeciais', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/datasEspeciais')>();
  return {
    ...original,
    carregarDatasEspeciais: (ano: number, mes: number) => {
      simulacao.chamadas += 1;
      return simulacao.falha ? Promise.reject(simulacao.falha) : carregar(ano, mes);
    },
  };
});

const evento = (o: Partial<DataEspecial>): DataEspecial => ({
  data: '2026-11-20', tipo: 'DIA_PROFISSAO', clienteId: 1, clienteNome: 'Sorriso', pessoa: 'Ana Souza',
  profissao: 'Dentista', anos: null, telefone: '(85) 98888-7777', ...o,
});

function comQuery(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const HOJE = new Date(2026, 10, 16);

describe('CalendarioDatasEspeciais', () => {
  beforeEach(() => carregar.mockReset());

  it('mostra o mês atual e destaca o dia com data especial', async () => {
    carregar.mockResolvedValue([
      evento({}),
      evento({ tipo: 'ANIVERSARIO_RESPONSAVEL', clienteNome: 'Bom Pão', pessoa: 'João Lima' }),
    ]);
    comQuery(<CalendarioDatasEspeciais hoje={HOJE} />);
    expect(screen.getByText('Novembro 2026')).toBeTruthy();
    const dia = await screen.findByRole('button', { name: /20 de novembro: 2 datas especiais/ });
    expect(dia.className).toMatch(/bg-/);
    expect(carregar).toHaveBeenCalledWith(2026, 11);
  });

  it('ao clicar no dia mostra o balão com quem comemora e o botão de parabéns', async () => {
    carregar.mockResolvedValue([evento({}), evento({ tipo: 'ANIVERSARIO_RESPONSAVEL', clienteNome: 'Bom Pão', pessoa: 'João Lima' })]);
    comQuery(<CalendarioDatasEspeciais hoje={HOJE} />);
    fireEvent.click(await screen.findByRole('button', { name: /20 de novembro/ }));
    const balao = await screen.findByRole('dialog');
    expect(within(balao).getByText('Dia do Dentista: Sorriso')).toBeTruthy();
    expect(within(balao).getByText('Aniversário de João Lima (Bom Pão)')).toBeTruthy();
    const links = within(balao).getAllByRole('link', { name: /Mandar parabéns/ });
    expect(links[0].getAttribute('href')).toContain('https://wa.me/5585988887777?text=');
  });

  it('troca de mês pelas setas', async () => {
    carregar.mockResolvedValue([]);
    comQuery(<CalendarioDatasEspeciais hoje={HOJE} />);
    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByText('Dezembro 2026')).toBeTruthy();
    expect(carregar).toHaveBeenLastCalledWith(2026, 12);
  });

  it('mês sem datas avisa e explica onde cadastrar', async () => {
    carregar.mockResolvedValue([]);
    comQuery(<CalendarioDatasEspeciais hoje={HOJE} />);
    expect(await screen.findByText(/Nenhuma data especial neste mês/)).toBeTruthy();
  });

  it('erro do servidor aparece na hora (sem repetir a chamada) com "Tentar de novo"', async () => {
    const { ErroPainel } = await import('@/lib/painelMensal');
    simulacao.falha = new ErroPainel('Sem permissão: CLIENTES_VISUALIZAR', 'servidor');
    simulacao.chamadas = 0;
    try {
      comQuery(<CalendarioDatasEspeciais hoje={HOJE} />);
      expect(await screen.findByText('Sem permissão: CLIENTES_VISUALIZAR')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeTruthy();
      expect(simulacao.chamadas).toBe(1);
    } finally {
      simulacao.falha = null;
    }
  });
});

describe('DatasEspeciaisCard', () => {
  beforeEach(() => carregar.mockReset());

  it('lista hoje e os próximos 7 dias, inclusive na virada do mês', async () => {
    carregar.mockImplementation(async (_ano: number, mes: number) => (mes === 11
      ? [evento({ data: '2026-11-16', tipo: 'ANIVERSARIO_EMPRESA', anos: 7 }), evento({ data: '2026-11-28' })]
      : [evento({ data: '2026-12-01', tipo: 'ANIVERSARIO_RESPONSAVEL', clienteNome: 'Bom Pão', pessoa: 'João Lima' })]));
    comQuery(<DatasEspeciaisCard hoje={new Date(2026, 10, 26)} />);
    expect(await screen.findByText('Aniversário de João Lima (Bom Pão)')).toBeTruthy();
    expect(screen.getByText('Dia do Dentista: Sorriso')).toBeTruthy();
    expect(screen.queryByText(/faz 7 anos/)).toBeNull();
  });

  it('nada na semana mostra o estado vazio', async () => {
    carregar.mockResolvedValue([]);
    comQuery(<DatasEspeciaisCard hoje={HOJE} />);
    expect(await screen.findByText(/Nenhuma data especial nos próximos 7 dias/)).toBeTruthy();
  });
});
