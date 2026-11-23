import { useEffect, useState } from 'react';

/**
 * A media query casa agora? Acompanha mudanças (girar o aparelho, redimensionar
 * a janela).
 *
 * O valor inicial é lido na hora, não depois de montar: quem usa isto para
 * escolher O QUE renderizar (o quadro de Tarefas no celular) não pode desenhar
 * a versão de desktop num primeiro quadro e trocar em seguida — no celular,
 * esse primeiro quadro é justamente o caro.
 *
 * Sem `matchMedia` (teste em Node), devolve `false`.
 */
export function useMediaQuery(query: string): boolean {
  const ler = () =>
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches;
  const [casa, setCasa] = useState(ler);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    setCasa(mq.matches);
    const aoMudar = (e: MediaQueryListEvent) => setCasa(e.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, [query]);

  return casa;
}
