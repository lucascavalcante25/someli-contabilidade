import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContaRecebimentoField from './ContaRecebimentoField';

describe('ContaRecebimentoField', () => {
  it('mostra a conta escolhida', () => {
    render(<ContaRecebimentoField value="PATRICIA" onChange={vi.fn()} />);
    expect(screen.getByText('Conta de recebimento')).toBeTruthy();
    expect(screen.getByRole('combobox').textContent).toContain('Patrícia');
  });

  it('sem conta mostra Não informado', () => {
    render(<ContaRecebimentoField value="" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox').textContent).toContain('Não informado');
  });
});
