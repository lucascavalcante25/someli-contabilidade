import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BuscaRapidaCliente from './BuscaRapidaCliente';

const clientes = [
  { id: 1, razaoSocial: 'MARIA TAINARA SILVA DE ALMEIDA LTDA', nomeFantasia: 'Tainara', cnpj: '54247625000181', regimeTributario: 'SIMPLES_NACIONAL' },
  { id: 2, razaoSocial: 'FLAVIO LOPES ALMEIDA LTDA', nomeFantasia: 'Estrela Ester Curitiba', cnpj: '56293580000107' },
  { id: 3, razaoSocial: 'TIMBU ACAITERIA LTDA', nomeFantasia: 'Açai Timbu', cnpj: '64379255000190' },
];

function digitar(texto: string) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Buscar empresa' }), { target: { value: texto } });
}

describe('BuscaRapidaCliente', () => {
  it('acha pelo nome e abre a empresa ao clicar', () => {
    const onAbrir = vi.fn();
    render(<BuscaRapidaCliente clientes={clientes} onAbrir={onAbrir} />);
    digitar('maria tainara');
    fireEvent.click(screen.getByRole('option', { name: /Tainara/ }));
    expect(onAbrir).toHaveBeenCalledWith(1);
  });

  it('Enter abre o primeiro resultado', () => {
    const onAbrir = vi.fn();
    render(<BuscaRapidaCliente clientes={clientes} onAbrir={onAbrir} />);
    digitar('acai');
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Buscar empresa' }), { key: 'Enter' });
    expect(onAbrir).toHaveBeenCalledWith(3);
  });

  it('sem resultado avisa', () => {
    render(<BuscaRapidaCliente clientes={clientes} onAbrir={vi.fn()} />);
    digitar('zzz');
    expect(screen.getByText('Nenhuma empresa encontrada')).toBeTruthy();
  });

  it('vazio não mostra lista', () => {
    render(<BuscaRapidaCliente clientes={clientes} onAbrir={vi.fn()} />);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
