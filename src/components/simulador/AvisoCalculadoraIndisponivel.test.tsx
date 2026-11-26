import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AvisoCalculadoraIndisponivel from './AvisoCalculadoraIndisponivel';

describe('AvisoCalculadoraIndisponivel', () => {
  it('explica em linguagem simples e deixa tentar de novo', () => {
    const tentar = vi.fn();
    render(<AvisoCalculadoraIndisponivel regime="SIMPLES_NACIONAL" mensagem="Calculadora da Receita indisponível no momento." onTentarDeNovo={tentar} />);
    expect(screen.getByRole('alert').textContent).toContain('calculadora do Simples Nacional não está respondendo');
    expect(screen.getByText(/O restante do sistema funciona normalmente/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }));
    expect(tentar).toHaveBeenCalledOnce();
  });
});
