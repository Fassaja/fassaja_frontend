import { useEffect, useRef, useState } from 'react';

/**
 * Evita o "flicker" do skeleton: só mostra se o carregamento passar de `delay`,
 * e mantém visível por pelo menos `minVisible` uma vez exibido.
 *
 * - Carga rápida (< delay): nunca mostra skeleton → conteúdo aparece direto.
 * - Carga lenta (>= delay): mostra o skeleton e o mantém estável.
 */
export function useDeferredLoading(loading: boolean, delay = 200, minVisible = 350): boolean {
  const [show, setShow] = useState(false);
  const shownAt = useRef<number | null>(null);
  const showRef = useRef(false);
  showRef.current = show;

  useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    if (loading) {
      delayTimer = setTimeout(() => {
        shownAt.current = Date.now();
        setShow(true);
      }, delay);
    } else if (showRef.current && shownAt.current) {
      const elapsed = Date.now() - shownAt.current;
      hideTimer = setTimeout(() => {
        shownAt.current = null;
        setShow(false);
      }, Math.max(0, minVisible - elapsed));
    } else {
      setShow(false);
    }

    return () => {
      clearTimeout(delayTimer);
      clearTimeout(hideTimer);
    };
  }, [loading, delay, minVisible]);

  return show;
}
