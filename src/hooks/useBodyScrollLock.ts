import { useEffect } from 'react';

// Counter so múltiplos overlays abertos ao mesmo tempo não destravem cedo.
let lockCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

/**
 * Trava o scroll do body enquanto `locked` for true e compensa a largura da
 * barra de rolagem para o conteúdo não "pular". Restaura tudo no último unlock.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      previousOverflow = document.body.style.overflow;
      previousPaddingRight = document.body.style.paddingRight;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
        document.body.style.paddingRight = previousPaddingRight;
      }
    };
  }, [locked]);
}
