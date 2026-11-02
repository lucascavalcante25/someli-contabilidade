import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EnviarDocumento from './EnviarDocumento';

const PEDIDO = {
  empresa: 'Padaria Bom Pão',
  titulo: 'Extrato de outubro',
  competencia: '2026-10',
  expiraEm: '2026-11-08T10:00:00',
  arquivosRecebidos: 0,
  arquivosRestantes: 10,
};

const resposta = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/enviar/token-teste']}>
      <Routes>
        <Route path="/enviar/:token" element={<EnviarDocumento />} />
      </Routes>
    </MemoryRouter>,
  );
}

const arquivo = (nome: string, tamanho = 10) => {
  const file = new File(['x'], nome, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: tamanho });
  return file;
};

async function selecionar(...arquivos: File[]) {
  await screen.findByText('Extrato de outubro');
  fireEvent.change(screen.getByLabelText('Arquivos'), { target: { files: arquivos } });
}

describe('EnviarDocumento', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('mostra o pedido do cliente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(PEDIDO)));

    renderizar();

    expect(await screen.findByText('Extrato de outubro')).toBeTruthy();
    expect(screen.getByText('Competência 10/2026')).toBeTruthy();
  });

  it('link inválido não mostra formulário', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta({}, 404)));

    renderizar();

    expect(await screen.findByText('Link inválido ou expirado')).toBeTruthy();
    expect(screen.queryByText('Selecionar arquivos')).toBeNull();
  });

  it('selecionar arquivos não envia até clicar em Enviar', async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(PEDIDO));
    vi.stubGlobal('fetch', fetchMock);
    renderizar();

    await selecionar(arquivo('a.pdf'), arquivo('b.pdf'));

    expect(screen.getByText('a.pdf')).toBeTruthy();
    expect(screen.getByText('b.pdf')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Enviar 2 documentos' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('permite remover arquivo antes de enviar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(PEDIDO)));
    renderizar();
    await selecionar(arquivo('a.pdf'), arquivo('b.pdf'));

    fireEvent.click(screen.getByLabelText('Remover a.pdf'));

    expect(screen.queryByText('a.pdf')).toBeNull();
    expect(screen.getByRole('button', { name: 'Enviar 1 documento' })).toBeTruthy();
  });

  it('confirma com clareza após enviar tudo', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(resposta(PEDIDO))
      .mockResolvedValueOnce(resposta({ ...PEDIDO, arquivosRecebidos: 1, arquivosRestantes: 9 }))
      .mockResolvedValueOnce(resposta({ ...PEDIDO, arquivosRecebidos: 2, arquivosRestantes: 8 }));
    vi.stubGlobal('fetch', fetchMock);
    renderizar();
    await selecionar(arquivo('a.pdf'), arquivo('b.pdf'));

    fireEvent.click(screen.getByRole('button', { name: 'Enviar 2 documentos' }));

    expect(await screen.findByText('Documentos enviados com sucesso!')).toBeTruthy();
    expect(screen.getByText(/O escritório já foi avisado/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('em falha parcial, avisa e mantém só o que falhou para tentar de novo', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(resposta(PEDIDO))
      .mockResolvedValueOnce(resposta({ ...PEDIDO, arquivosRecebidos: 1, arquivosRestantes: 9 }))
      .mockResolvedValueOnce(resposta({ message: 'Tipo não permitido' }, 409)));
    renderizar();
    await selecionar(arquivo('a.pdf'), arquivo('b.pdf'));

    fireEvent.click(screen.getByRole('button', { name: 'Enviar 2 documentos' }));

    expect(await screen.findByText(/1 enviado, 1 com erro/)).toBeTruthy();
    expect(screen.getByText('Tipo não permitido')).toBeTruthy();
    expect(screen.queryByText('Documentos enviados com sucesso!')).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar 1 documento' })).toBeTruthy());
  });

  it('arquivo acima de 15 MB é recusado antes do envio', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(PEDIDO)));
    renderizar();

    await selecionar(arquivo('grande.pdf', 16 * 1024 * 1024));

    expect(screen.getByRole('alert').textContent).toContain('grande.pdf');
    expect(screen.queryByRole('button', { name: /^Enviar/ })).toBeNull();
  });

  it('respeita o limite de envios restantes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta({ ...PEDIDO, arquivosRestantes: 1 })));
    renderizar();

    await selecionar(arquivo('a.pdf'), arquivo('b.pdf'));

    expect(screen.getByRole('alert').textContent).toContain('1 arquivo');
    expect(screen.getByRole('button', { name: 'Enviar 1 documento' })).toBeTruthy();
  });
});
