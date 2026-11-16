import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DatasEspeciaisCampos, { type ValoresDatasEspeciais } from './DatasEspeciaisCampos';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));
vi.mock('@/lib/datasEspeciais', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/datasEspeciais')>();
  return {
    ...original,
    listarProfissoes: vi.fn().mockResolvedValue([
      { id: 1, nome: 'Dentista', dia: 25, mes: 10, cnaePrefixos: '8630504', ativo: true },
      { id: 2, nome: 'Nutricionista', dia: 31, mes: 8, cnaePrefixos: '8650002', ativo: true },
      { id: 3, nome: 'Antiga', dia: 1, mes: 1, cnaePrefixos: null, ativo: false },
    ]),
  };
});

const vazio: ValoresDatasEspeciais = { dataNascimentoResponsavel: '', dataAbertura: '', profissaoId: null };

function renderizar(valores = vazio, cnae?: string) {
  const onChange = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <DatasEspeciaisCampos valores={valores} onChange={onChange} cnaePrincipal={cnae} />
    </QueryClientProvider>,
  );
  return onChange;
}

describe('DatasEspeciaisCampos', () => {
  it('aniversário do dono é digitado (dd/mm/aaaa) e vira data', () => {
    const onChange = renderizar();
    fireEvent.change(screen.getByLabelText('Aniversário do responsável'), { target: { value: '20101985' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...vazio, dataNascimentoResponsavel: '1985-10-20' });
  });

  it('data incompleta ou impossível não é gravada e avisa', () => {
    const onChange = renderizar();
    const campo = screen.getByLabelText('Aniversário do responsável');
    fireEvent.change(campo, { target: { value: '31/02/1985' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...vazio, dataNascimentoResponsavel: '' });
    expect(screen.getByText('Data inválida')).toBeTruthy();
  });

  it('mostra a data já gravada no formato brasileiro', () => {
    renderizar({ ...vazio, dataAbertura: '2019-10-05' });
    expect((screen.getByLabelText('Abertura da empresa') as HTMLInputElement).value).toBe('05/10/2019');
  });

  it('sugere a profissão pelo CNAE quando ainda não tem', async () => {
    const onChange = renderizar(vazio, '86.30-5-04');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ ...vazio, profissaoId: 1 }));
  });

  it('não troca a profissão que já foi escolhida', async () => {
    const onChange = renderizar({ ...vazio, profissaoId: 2 }, '86.30-5-04');
    await screen.findByText('Dia do Nutricionista: 31/08');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a profissão mostra o dia comemorativo', async () => {
    renderizar({ ...vazio, profissaoId: 1 });
    expect(await screen.findByText('Dia do Dentista: 25/10')).toBeTruthy();
  });
});
