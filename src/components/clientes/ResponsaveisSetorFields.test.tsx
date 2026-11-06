import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResponsaveisSetorFields from './ResponsaveisSetorFields';

const usuarios = [
  { id: 5, nome: 'Karol' },
  { id: 6, nome: 'Ana Karoline' },
];

describe('ResponsaveisSetorFields', () => {
  it('um campo por setor, mostrando quem é o responsável', () => {
    render(<ResponsaveisSetorFields value={{ FISCAL: 5, DEPARTAMENTO_PESSOAL: 6 }} usuarios={usuarios} onChange={vi.fn()} />);
    for (const rotulo of ['Responsável fiscal', 'Responsável pessoal', 'Responsável contábil', 'Responsável societário']) {
      expect(screen.getByText(rotulo)).toBeTruthy();
    }
    const caixas = screen.getAllByRole('combobox').map((c) => c.textContent);
    expect(caixas).toEqual(['Karol', 'Ana Karoline', 'Sem responsável', 'Sem responsável']);
  });

  it('sem permissão fica só leitura', () => {
    render(<ResponsaveisSetorFields value={{ FISCAL: 5 }} usuarios={usuarios} onChange={vi.fn()} somenteLeitura />);
    expect(screen.getAllByRole('combobox').every((c) => (c as HTMLButtonElement).disabled)).toBe(true);
  });
});
