import { useEffect, useState } from 'react';

/**
 * A página já saiu do topo?
 *
 * Serve para a barra do topo decidir quando ganhar fundo: parada no topo ela
 * não precisa de nenhum, porque não há nada passando por baixo. Só quando o
 * conteúdo começa a deslizar sob ela é que o fosco passa a existir para separar
 * um do outro.
 *
 * O estado é booleano, e não a posição: guardar o `scrollY` a cada quadro
 * renderizaria o componente dezenas de vezes por rolagem. Assim o React só
 * trabalha nas duas travessias do limite.
 *
 * A leitura acontece dentro de um requestAnimationFrame porque `scrollY`
 * força o navegador a recalcular layout; num listener de scroll cru isso é
 * uma vez por evento, e o evento dispara muito mais que uma vez por quadro.
 */
export function usePageScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      setScrolled(window.scrollY > threshold);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    // Mede uma vez na montagem: quem chega por um link com âncora, ou volta
    // para uma página que o navegador restaura rolada, já entra fora do topo.
    measure();

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}
