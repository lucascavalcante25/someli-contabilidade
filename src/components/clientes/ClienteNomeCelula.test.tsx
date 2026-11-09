import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import ClienteNomeCelula from './ClienteNomeCelula';

const cliente = {
  razaoSocial: 'JOSE ALIGHIELDE CARLOS ROSARIO',
  nomeFantasia: 'Eudinho',
  ativo: true,
  tags: [{ id: 1, nome: 'SIMPLES_NACIONAL', automatica: true }],
};

function renderCelula(aberto = false, onAlternar = vi.fn()) {
  render(
    <TooltipProvider>
      <table><tbody><tr>
        <ClienteNomeCelula cliente={cliente} aberto={aberto} onAlternarDocumentos={onAlternar} />
      </tr></tbody></table>
    </TooltipProvider>,
  );
  return onAlternar;
}

describe('ClienteNomeCelula', () => {
  it('fica congelada à esquerda com fundo opaco ao rolar para os lados', () => {
    renderCelula();
    const celula = screen.getByRole('cell');
    expect(celula.className).toContain('sticky');
    expect(celula.className).toContain('left-0');
    expect(celula.className).toContain('bg-card');
  });

  it('mostra razão social, nome fantasia e tags', () => {
    renderCelula();
    expect(screen.getByText('JOSE ALIGHIELDE CARLOS ROSARIO')).toBeTruthy();
    expect(screen.getByText('Eudinho')).toBeTruthy();
    expect(screen.getByText('SIMPLES NACIONAL')).toBeTruthy();
  });

  it('o botão de documentos continua na célula congelada', () => {
    const onAlternar = renderCelula();
    fireEvent.click(screen.getByRole('button', { name: 'Ver documentos' }));
    expect(onAlternar).toHaveBeenCalledTimes(1);
  });
});
