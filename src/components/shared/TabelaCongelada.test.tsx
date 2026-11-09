import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TabelaCongelada from './TabelaCongelada';

describe('TabelaCongelada', () => {
  it('limita a altura para a barra de rolagem lateral ficar sempre à vista', () => {
    render(
      <TabelaCongelada rotulo="Lista de clientes">
        <table><tbody><tr><td>Açaí Timbu</td></tr></tbody></table>
      </TabelaCongelada>,
    );
    const area = screen.getByRole('region', { name: 'Lista de clientes' });
    expect(area.className).toContain('overflow-auto');
    expect(area.className).toMatch(/max-h-/);
    expect(screen.getByText('Açaí Timbu')).toBeTruthy();
  });

  it('cabeçalho e coluna congelados não passam por cima do menu lateral nem do topo', () => {
    render(
      <TabelaCongelada rotulo="Lista de clientes">
        <table><tbody><tr><td>Açaí Timbu</td></tr></tbody></table>
      </TabelaCongelada>,
    );
    // isolate cria um contexto de empilhamento próprio: o z-30 do cabeçalho vale só dentro da tabela
    expect(screen.getByRole('region', { name: 'Lista de clientes' }).className).toContain('isolate');
  });

  it('arrastar com o mouse rola para os lados', () => {
    render(
      <TabelaCongelada rotulo="Lista de clientes">
        <table><tbody><tr><td>Açaí Timbu</td></tr></tbody></table>
      </TabelaCongelada>,
    );
    const area = screen.getByRole('region', { name: 'Lista de clientes' });
    area.scrollLeft = 100;
    fireEvent.mouseDown(area, { button: 0, clientX: 300 });
    fireEvent.mouseMove(window, { clientX: 240 });
    fireEvent.mouseUp(window);
    expect(area.scrollLeft).toBe(160);
  });
});
