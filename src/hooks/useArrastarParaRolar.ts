import { useCallback, useRef, type MouseEvent as ReactMouseEvent } from 'react';

/** A partir de quantos pixels o movimento vira arraste (abaixo disso é clique). */
const LIMIAR = 5;

/**
 * Arrastar com o mouse em qualquer ponto da área rola na horizontal (tabelas largas).
 * Clique simples continua funcionando; o clique que encerra um arraste é descartado.
 * Toque no celular já rola nativamente, então só trata o mouse.
 */
export function useArrastarParaRolar<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const arrastou = useRef(false);

  const onMouseDown = useCallback((e: ReactMouseEvent<T>) => {
    const el = ref.current;
    if (!el || e.button !== 0) return;
    const inicioX = e.clientX;
    const inicioScroll = el.scrollLeft;
    arrastou.current = false;

    const mover = (ev: MouseEvent) => {
      const dx = ev.clientX - inicioX;
      if (!arrastou.current && Math.abs(dx) < LIMIAR) return;
      arrastou.current = true;
      el.scrollLeft = inicioScroll - dx;
      el.classList.add('cursor-arrastando'); // mão fechada em lilás (src/index.css)
      ev.preventDefault();
    };
    const soltar = () => {
      el.classList.remove('cursor-arrastando');
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', soltar);
    };
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
  }, []);

  const onClickCapture = useCallback((e: ReactMouseEvent<T>) => {
    if (arrastou.current) {
      e.preventDefault();
      e.stopPropagation();
      arrastou.current = false;
    }
  }, []);

  return { ref, onMouseDown, onClickCapture };
}
