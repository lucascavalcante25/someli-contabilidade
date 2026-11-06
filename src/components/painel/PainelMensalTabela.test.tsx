import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import PainelMensalTabela from './PainelMensalTabela';
import { montarMatriz, type OcorrenciaPainel } from '@/lib/painelMensal';

const base = (o: Partial<OcorrenciaPainel>): OcorrenciaPainel => ({
  id: 1, clienteId: 1, clienteNome: 'Fra Carnes', obrigacaoNome: 'PGDAS-D', setor: 'FISCAL', competencia: '2026-10',
  dataVencimento: '2026-11-20', status: 'PENDENTE', concluidaEm: null, concluidaPorNome: null, ...o,
});

const matriz = montarMatriz([
  base({ id: 1, status: 'CONCLUIDA', concluidaPorNome: 'Ana Karoline', concluidaEm: '2026-11-06T14:05:00' }),
  base({ id: 2, obrigacaoNome: 'Pró-labore', dataVencimento: '2026-11-05' }),
  base({ id: 3, clienteId: 2, clienteNome: 'Açai Timbu', obrigacaoNome: 'PGDAS-D', status: 'NAO_APLICAVEL' }),
]);

function renderizar(onAlternar = vi.fn()) {
  render(
    <TooltipProvider>
      <PainelMensalTabela matriz={matriz} hoje="2026-11-10" salvando={new Set()} onAlternar={onAlternar} />
    </TooltipProvider>,
  );
  return onAlternar;
}

describe('PainelMensalTabela', () => {
  it('mostra o andamento de cada cliente', () => {
    renderizar();
    expect(screen.getByText('1/2')).toBeTruthy();
  });

  it('marcar uma pendente conclui', () => {
    const onAlternar = renderizar();
    fireEvent.click(screen.getByRole('checkbox', { name: /Pró-labore · Fra Carnes/ }));
    expect(onAlternar).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }), true);
  });

  it('concluída mostra quem fez e quando', () => {
    renderizar();
    const caixa = screen.getByRole('checkbox', { name: /PGDAS-D · Fra Carnes/ });
    expect(caixa.getAttribute('data-state')).toBe('checked');
    expect(caixa.getAttribute('aria-label')).toContain('feito por Ana Karoline em 06/11 14:05');
  });

  it('vencida e pendente aparece como atrasada', () => {
    renderizar();
    expect(screen.getByRole('checkbox', { name: /Pró-labore · Fra Carnes/ }).getAttribute('aria-label')).toContain('atrasada');
  });

  it('não aplicável e atividade inexistente não têm caixa', () => {
    renderizar();
    expect(screen.getByText('N/A')).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /Açai Timbu/ })).toBeNull();
  });

  it('abre a ficha no clique e mostra quando há acessos', () => {
    const abrir = vi.fn();
    render(
      <TooltipProvider>
        <PainelMensalTabela
          matriz={matriz}
          hoje="2026-11-10"
          salvando={new Set()}
          onAlternar={vi.fn()}
          onAbrirFicha={abrir}
          contagens={{ 1: { acessos: 2, anotacoes: 1 } }}
        />
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Ficha de Fra Carnes, 2 acessos/ }));
    expect(abrir).toHaveBeenCalledWith({ clienteId: 1, clienteNome: 'Fra Carnes' });
  });
});
