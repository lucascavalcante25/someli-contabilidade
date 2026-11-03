import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import BoletoEnviadoCheckbox from './BoletoEnviadoCheckbox';

function renderizar(props: Partial<Parameters<typeof BoletoEnviadoCheckbox>[0]> = {}) {
  const onAlterar = vi.fn();
  render(
    <TooltipProvider>
      <BoletoEnviadoCheckbox
        enviado={false}
        enviadoEm={null}
        enviadoPor={null}
        salvando={false}
        onAlterar={onAlterar}
        {...props}
      />
    </TooltipProvider>,
  );
  return onAlterar;
}

describe('BoletoEnviadoCheckbox', () => {
  it('marca como enviado ao clicar', () => {
    const onAlterar = renderizar();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Marcar boleto como enviado' }));
    expect(onAlterar).toHaveBeenCalledWith(true);
  });

  it('já enviado: mostra marcado e permite desmarcar', () => {
    const onAlterar = renderizar({ enviado: true, enviadoPor: 'Karol', enviadoEm: '2026-11-03T09:30:00' });
    const caixa = screen.getByRole('checkbox', { name: 'Desmarcar boleto enviado' });
    expect(caixa.getAttribute('data-state')).toBe('checked');
    fireEvent.click(caixa);
    expect(onAlterar).toHaveBeenCalledWith(false);
  });

  it('salvando: fica desabilitado', () => {
    renderizar({ salvando: true });
    expect((screen.getByRole('checkbox') as HTMLButtonElement).disabled).toBe(true);
  });
});
