import { useEffect, useState } from 'react';

/**
 * Quanto do fundo da tela o teclado virtual está cobrindo, em px (0 sem
 * teclado).
 *
 * No Chrome do Android e no Safari do iPhone o teclado não encolhe a página:
 * ele passa POR CIMA, e um painel `fixed; bottom: 0` fica escondido atrás
 * dele. A `visualViewport` diz o pedaço que continua visível; a diferença
 * para a janela inteira é o teclado. Quem usa (a folha do Modal) sobe essa
 * distância e fica colada ao teclado.
 *
 * Só escuta enquanto `ativo` — o modal aberto.
 */
export function useAlturaDoTeclado(ativo: boolean): number {
  const [altura, setAltura] = useState(0);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!ativo || !vv) {
      setAltura(0);
      return;
    }
    const medir = () => {
      const coberto = window.innerHeight - vv.height - vv.offsetTop;
      // Abaixo de ~80px é barra do navegador mexendo, não teclado.
      setAltura(coberto > 80 ? Math.round(coberto) : 0);
    };
    medir();
    vv.addEventListener('resize', medir);
    vv.addEventListener('scroll', medir);
    return () => {
      vv.removeEventListener('resize', medir);
      vv.removeEventListener('scroll', medir);
    };
  }, [ativo]);

  return altura;
}
