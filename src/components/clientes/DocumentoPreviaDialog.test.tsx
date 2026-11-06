import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const { carregarPreviaMock } = vi.hoisted(() => ({ carregarPreviaMock: vi.fn() }));
vi.mock('@/lib/documentoPrevia', async (original) => ({
  ...(await original<typeof import('@/lib/documentoPrevia')>()),
  carregarPrevia: carregarPreviaMock,
}));

import DocumentoPreviaDialog from './DocumentoPreviaDialog';

// jsdom não implementa URLs de blob
URL.revokeObjectURL = vi.fn();

function abrir(nomeArquivo: string, onBaixar = vi.fn()) {
  render(
    <DocumentoPreviaDialog
      clienteId={3}
      documento={{ id: 9, nomeArquivo }}
      onFechar={vi.fn()}
      onBaixar={onBaixar}
    />,
  );
  return onBaixar;
}

describe('DocumentoPreviaDialog', () => {
  it('mostra o texto do extrato', async () => {
    carregarPreviaMock.mockResolvedValue({ tipo: 'texto', texto: 'OFXHEADER:100', cortado: false });
    abrir('extrato.ofx');
    expect(await screen.findByText('OFXHEADER:100')).toBeTruthy();
  });

  it('mostra o PDF num quadro', async () => {
    carregarPreviaMock.mockResolvedValue({ tipo: 'pdf', url: 'blob:x' });
    abrir('nota.pdf');
    expect((await screen.findByTitle('Pré-visualização de nota.pdf')).getAttribute('src')).toBe('blob:x');
  });

  it('formato sem prévia oferece baixar', async () => {
    const onBaixar = abrir('planilha.xlsx');
    fireEvent.click(await screen.findByRole('button', { name: /Baixar arquivo/ }));
    expect(onBaixar).toHaveBeenCalled();
    expect(carregarPreviaMock).not.toHaveBeenCalledWith(3, expect.objectContaining({ nomeArquivo: 'planilha.xlsx' }));
  });

  it('Esc fecha só a prévia, não a janela do cliente por baixo', async () => {
    carregarPreviaMock.mockResolvedValue({ tipo: 'texto', texto: 'abc', cortado: false });
    const janelaDeBaixo = vi.fn();
    window.addEventListener('keydown', janelaDeBaixo);
    const onFechar = vi.fn();
    render(
      <DocumentoPreviaDialog clienteId={3} documento={{ id: 9, nomeArquivo: 'a.txt' }} onFechar={onFechar} onBaixar={vi.fn()} />,
    );
    await screen.findByText('abc');

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    expect(onFechar).toHaveBeenCalled();
    expect(janelaDeBaixo).not.toHaveBeenCalled();
    window.removeEventListener('keydown', janelaDeBaixo);
  });

  it('erro aparece com a mensagem', async () => {
    carregarPreviaMock.mockRejectedValue(new Error('Sem conexão com o servidor.'));
    abrir('nota2.pdf');
    expect(await screen.findByText(/Sem conexão com o servidor/)).toBeTruthy();
  });
});
