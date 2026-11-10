import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SegmentoClienteField from './SegmentoClienteField';

describe('SegmentoClienteField', () => {
  it('mostra o segmento atual e troca com um clique', () => {
    const onChange = vi.fn();
    render(<SegmentoClienteField value="SERVICOS" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Serviços' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Comércio e Indústria' }));
    expect(onChange).toHaveBeenCalledWith('COMERCIO_INDUSTRIA');
  });

  it('sem segmento nenhum fica marcado e avisa que vai para Serviços', () => {
    render(<SegmentoClienteField value="" onChange={vi.fn()} />);
    expect(screen.getAllByRole('radio').every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
    expect(screen.getByText(/Sem segmento, o cartão fica em Serviços/)).toBeTruthy();
  });

  it('quando veio da consulta do CNPJ, diz que foi sugerido pelo CNAE', () => {
    render(<SegmentoClienteField value="COMERCIO_INDUSTRIA" onChange={vi.fn()} sugeridoPeloCnae />);
    expect(screen.getByText(/Sugerido pelo CNAE principal/)).toBeTruthy();
  });
});
