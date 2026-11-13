import { useEffect, useRef, useState } from 'react';

/**
 * "Este elemento já apareceu na tela?" — uma vez só, e com UM observador para
 * o app inteiro.
 *
 * Cada `IntersectionObserver` custa pouco, mas uma página de relatórios com
 * trinta blocos revelados criaria trinta. Aqui todos os elementos entram no
 * mesmo observador e saem dele assim que aparecem: depois da entrada não
 * sobra nada escutando.
 */
type Aviso = () => void;

const avisos = new WeakMap<Element, Aviso>();
let observador: IntersectionObserver | null = null;

function observadorCompartilhado(): IntersectionObserver {
  if (!observador) {
    observador = new IntersectionObserver(
      entradas => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          avisos.get(entrada.target)?.();
          avisos.delete(entrada.target);
          observador?.unobserve(entrada.target);
        }
      },
      // A margem negativa embaixo faz a entrada começar quando o bloco já
      // está um pouco dentro da tela, e não com um pixel aparecendo.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
  }
  return observador;
}

export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visto) return;
    // Sem a API (navegador muito antigo, teste em Node): mostra direto. O
    // conteúdo nunca pode depender da animação para existir.
    if (typeof IntersectionObserver === 'undefined') {
      setVisto(true);
      return;
    }
    const obs = observadorCompartilhado();
    avisos.set(el, () => setVisto(true));
    obs.observe(el);
    return () => {
      avisos.delete(el);
      obs.unobserve(el);
    };
  }, [visto]);

  return { ref, visto };
}
