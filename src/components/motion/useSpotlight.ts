import { useEffect } from 'react';

/**
 * Alimenta TODOS os `.fx-spotlight` da página com a posição do ponteiro,
 * usando um único ouvinte no documento.
 *
 * O jeito comum de fazer este efeito é um `onMouseMove` + `useState` em cada
 * cartão: cada movimento do mouse vira um render do React, multiplicado pelos
 * cartões da tela. Aqui não há estado nem render — o ouvinte acha o cartão sob
 * o ponteiro, e escreve duas variáveis CSS nele, no máximo uma vez por quadro.
 *
 * Só liga onde existe hover de verdade: no celular não há ponteiro para
 * seguir, então nem o ouvinte é registrado.
 *
 * Chame UMA vez, na raiz do app.
 */
export function useSpotlight(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const hover = window.matchMedia('(hover: hover)');
    const calmo = window.matchMedia('(prefers-reduced-motion: reduce)');

    let quadro = 0;
    let alvo: HTMLElement | null = null;
    let x = 0;
    let y = 0;

    const pintar = () => {
      quadro = 0;
      if (!alvo) return;
      const caixa = alvo.getBoundingClientRect();
      alvo.style.setProperty('--fx-mx', `${x - caixa.left}px`);
      alvo.style.setProperty('--fx-my', `${y - caixa.top}px`);
    };

    const aoMover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const el = e.target instanceof Element ? e.target.closest<HTMLElement>('.fx-spotlight') : null;
      if (!el) {
        alvo = null;
        return;
      }
      alvo = el;
      x = e.clientX;
      y = e.clientY;
      if (!quadro) quadro = requestAnimationFrame(pintar);
    };

    let ligado = false;
    const sincronizar = () => {
      const deve = hover.matches && !calmo.matches;
      if (deve === ligado) return;
      ligado = deve;
      if (deve) document.addEventListener('pointermove', aoMover, { passive: true });
      else document.removeEventListener('pointermove', aoMover);
    };

    sincronizar();
    hover.addEventListener('change', sincronizar);
    calmo.addEventListener('change', sincronizar);
    return () => {
      hover.removeEventListener('change', sincronizar);
      calmo.removeEventListener('change', sincronizar);
      document.removeEventListener('pointermove', aoMover);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, []);
}
