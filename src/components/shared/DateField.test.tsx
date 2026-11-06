import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DateField from './DateField';

const feriados = { '2026-11-20': 'Dia da Consciência Negra' };

describe('DateField com feriados', () => {
  it('avisa que a obrigação fiscal vai para o próximo dia útil', () => {
    render(<DateField value="2026-11-20" onChange={vi.fn()} feriados={feriados} antecipa={false} />);
    expect(screen.getByText(/20\/11 é feriado \(Dia da Consciência Negra\)/)).toBeTruthy();
    expect(screen.getByText(/prorroga para 23\/11\/2026/)).toBeTruthy();
  });

  it('avisa que a do Pessoal antecipa', () => {
    render(<DateField value="2026-11-20" onChange={vi.fn()} feriados={feriados} antecipa />);
    expect(screen.getByText(/antecipa para 19\/11\/2026/)).toBeTruthy();
  });

  it('obrigações misturadas mostram as duas datas', () => {
    render(<DateField value="2026-11-20" onChange={vi.fn()} feriados={feriados} antecipa="misto" />);
    expect(screen.getByText(/Pessoal antecipam para 19\/11\/2026 e as demais prorrogam para 23\/11\/2026/)).toBeTruthy();
  });

  it('dia útil não mostra aviso', () => {
    render(<DateField value="2026-11-18" onChange={vi.fn()} feriados={feriados} antecipa={false} />);
    expect(screen.queryByText(/feriado/)).toBeNull();
  });

  it('calendário marca o feriado com o nome e mostra a legenda do mês', () => {
    render(<DateField value="2026-11-18" onChange={vi.fn()} feriados={feriados} antecipa={false} />);
    fireEvent.click(screen.getByRole('button', { name: /18\/11\/2026/ }));
    expect(screen.getByTitle('Dia da Consciência Negra')).toBeTruthy();
    expect(screen.getByText('20/11 — Dia da Consciência Negra')).toBeTruthy();
  });

  it('sem feriados funciona como antes', () => {
    render(<DateField value="2026-11-20" onChange={vi.fn()} />);
    expect(screen.queryByText(/feriado/)).toBeNull();
  });
});
