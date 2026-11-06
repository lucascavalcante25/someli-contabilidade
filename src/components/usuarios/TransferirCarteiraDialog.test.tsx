import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TransferirCarteiraDialog from './TransferirCarteiraDialog';

const carteira = [
  { setor: 'FISCAL', setorLabel: 'Fiscal', clientes: [{ id: 1, nome: 'Fra Carnes' }, { id: 2, nome: 'Açai Timbu' }] },
  { setor: 'DEPARTAMENTO_PESSOAL', setorLabel: 'Departamento Pessoal', clientes: [{ id: 1, nome: 'Fra Carnes' }] },
];
const destinos = [{ id: 6, nome: 'Ana Karoline' }];

describe('TransferirCarteiraDialog', () => {
  it('mostra cada setor com seus clientes', () => {
    render(<TransferirCarteiraDialog usuarioNome="Karol" carteira={carteira} destinos={destinos} salvando={false}
      onConfirmar={vi.fn()} onFechar={vi.fn()} />);
    expect(screen.getByText(/Karol responde por 2 cliente/)).toBeTruthy();
    expect(screen.getByText('Fiscal (2)')).toBeTruthy();
    expect(screen.getByText('Departamento Pessoal (1)')).toBeTruthy();
    expect(screen.getByText('Fra Carnes, Açai Timbu')).toBeTruthy();
  });

  it('só libera quando todo setor tem destino; "mesma pessoa para todos" preenche tudo', () => {
    const onConfirmar = vi.fn();
    render(<TransferirCarteiraDialog usuarioNome="Karol" carteira={carteira} destinos={destinos} salvando={false}
      onConfirmar={onConfirmar} onFechar={vi.fn()} />);
    const botao = screen.getByRole('button', { name: /Transferir e desativar/ });
    expect((botao as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Ana Karoline para todos' }));
    expect((botao as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(botao);
    expect(onConfirmar).toHaveBeenCalledWith({ FISCAL: 6, DEPARTAMENTO_PESSOAL: 6 });
  });
});
