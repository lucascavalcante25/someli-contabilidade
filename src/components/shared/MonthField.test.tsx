import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MonthField from './MonthField';

describe('MonthField', () => {
  it('mostra placeholder quando vazio', () => {
    render(<MonthField onChange={vi.fn()} placeholder="Competência (opcional)" />);
    expect(screen.getByRole('button', { name: /Competência \(opcional\)/ })).toBeTruthy();
  });

  it('exibe a competência em português', () => {
    render(<MonthField value="2026-09" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Setembro de 2026/ })).toBeTruthy();
  });

  it('escolhe o mês no ano exibido', () => {
    const onChange = vi.fn();
    render(<MonthField value="2026-09" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Setembro de 2026/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Março' }));

    expect(onChange).toHaveBeenCalledWith('2026-03');
  });

  it('navega para o ano anterior antes de escolher', () => {
    const onChange = vi.fn();
    render(<MonthField value="2026-09" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Setembro de 2026/ }));

    fireEvent.click(screen.getByLabelText('Ano anterior'));
    fireEvent.click(screen.getByRole('button', { name: 'Dezembro' }));

    expect(onChange).toHaveBeenCalledWith('2025-12');
  });

  it('limpa o valor', () => {
    const onChange = vi.fn();
    render(<MonthField value="2026-09" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Setembro de 2026/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    expect(onChange).toHaveBeenCalledWith('');
  });
});
