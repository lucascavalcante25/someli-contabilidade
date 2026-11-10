import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import ClienteDetalheModalCabecalho from './ClienteDetalheModalCabecalho';

function renderizar(props: Partial<Parameters<typeof ClienteDetalheModalCabecalho>[0]> = {}) {
  render(
    <TooltipProvider>
      <ClienteDetalheModalCabecalho razaoSocial="Delta Serviços Contábeis Ltda" onFechar={vi.fn()} {...props} />
    </TooltipProvider>,
  );
}

describe('ClienteDetalheModalCabecalho', () => {
  it('tem o botão Editar antes do olhinho, que abre a edição sem sair da página', () => {
    const onEditar = vi.fn();
    renderizar({ onEditar });
    const botoes = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(botoes.indexOf('Editar cliente')).toBeLessThan(botoes.findIndex((l) => /valores/i.test(l ?? '')));
    fireEvent.click(screen.getByRole('button', { name: 'Editar cliente' }));
    expect(onEditar).toHaveBeenCalledTimes(1);
  });

  it('sem onEditar (ex.: Dashboard) não mostra o botão', () => {
    renderizar();
    expect(screen.queryByRole('button', { name: 'Editar cliente' })).toBeNull();
    expect(screen.getByText('Delta Serviços Contábeis Ltda')).toBeTruthy();
  });
});
