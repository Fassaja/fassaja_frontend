import { useEffect, useState } from 'react';

/**
 * O dispositivo tem um ponteiro capaz de hover (mouse/trackpad)?
 *
 * A pergunta é de CSS, não de largura de tela: um tablet grande não tem hover
 * e um notebook pequeno tem. `(hover: hover)` responde exatamente isso, e
 * acompanha o usuário plugando ou tirando um mouse.
 *
 * O padrão é `true` para que, em qualquer ambiente sem `matchMedia` (SSR, um
 * teste em Node), o efeito comece recolhido em vez de aberto — que é o estado
 * visualmente correto no desktop, o caso mais comum.
 */
export function useHoverCapable(): boolean {
  const [hoverCapable, setHoverCapable] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(hover: hover)');
    setHoverCapable(query.matches);

    const onChange = (e: MediaQueryListEvent) => setHoverCapable(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return hoverCapable;
}
