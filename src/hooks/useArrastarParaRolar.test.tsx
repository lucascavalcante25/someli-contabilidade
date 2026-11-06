import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useArrastarParaRolar } from './useArrastarParaRolar';

function Area({ onClicar = vi.fn() }: { onClicar?: () => void }) {
  const props = useArrastarParaRolar<HTMLDivElement>();
  return (
    <div data-testid="area" {...props}>
      <span data-testid="celula">célula</span>
      <button type="button" onClick={onClicar}>caixa</button>
    </div>
  );
}

describe('useArrastarParaRolar', () => {
  it('arrastar para a esquerda leva a tabela para a direita', () => {
    render(<Area />);
    const area = screen.getByTestId('area');
    area.scrollLeft = 50;
    fireEvent.mouseDown(screen.getByTestId('celula'), { button: 0, clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 180 });
    fireEvent.mouseUp(window);
    expect(area.scrollLeft).toBe(170);
  });

  it('clique simples na caixa continua funcionando', () => {
    const onClicar = vi.fn();
    render(<Area onClicar={onClicar} />);
    const caixa = screen.getByRole('button', { name: 'caixa' });
    fireEvent.mouseDown(caixa, { button: 0, clientX: 100 });
    fireEvent.mouseUp(window);
    fireEvent.click(caixa);
    expect(onClicar).toHaveBeenCalled();
  });

  it('depois de arrastar, o clique de soltar não marca nada', () => {
    const onClicar = vi.fn();
    render(<Area onClicar={onClicar} />);
    const caixa = screen.getByRole('button', { name: 'caixa' });
    fireEvent.mouseDown(caixa, { button: 0, clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 200 });
    fireEvent.mouseUp(window);
    fireEvent.click(caixa);
    expect(onClicar).not.toHaveBeenCalled();
  });

  it('movimento pequeno não é arraste', () => {
    render(<Area />);
    const area = screen.getByTestId('area');
    area.scrollLeft = 50;
    fireEvent.mouseDown(screen.getByTestId('celula'), { button: 0, clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 297 });
    fireEvent.mouseUp(window);
    expect(area.scrollLeft).toBe(50);
  });
});
