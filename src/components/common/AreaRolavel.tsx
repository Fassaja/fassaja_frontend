import React, { useCallback, useEffect, useRef, useState } from 'react';
import { haMaisAbaixo } from '@/utils/rolagem';

/**
 * Área que rola por dentro e AVISA quando ainda há conteúdo abaixo.
 *
 * Uma lista cortada no limite da caixa parece ter acabado ali: sem a sombra na
 * borda, quem olha conclui que viu tudo e não rola. O aviso só aparece quando
 * há de fato o que ver — sombra permanente vira decoração e deixa de informar.
 */
export const AreaRolavel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [temMais, setTemMais] = useState(false);

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setTemMais(haMaisAbaixo(el.scrollTop, el.scrollHeight, el.clientHeight));
  }, []);

  useEffect(() => {
    medir();
    const el = ref.current;
    if (!el) return;
    /*
     * `ResizeObserver` no elemento E no conteúdo: a altura muda tanto quando a
     * janela muda quanto quando um card é adicionado, removido ou editado.
     * Só ouvir o scroll deixaria a sombra desatualizada justamente nas mexidas
     * que a tela toda existe para permitir.
     */
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    if (el.firstElementChild) obs.observe(el.firstElementChild);
    return () => obs.disconnect();
  }, [medir, children]);

  return (
    <div className={`relative min-h-0 ${className}`}>
      {/* A rolagem interna só existe onde a altura é travada (lg+). Abaixo
          disso a página inteira rola, e prender a altura aqui faria a caixa
          colapsar — `height: 100%` sobre um pai de altura automática não
          resolve para nada útil. */}
      <div ref={ref} onScroll={medir} className="lg:h-full lg:overflow-y-auto pr-0.5">
        <div>{children}</div>
      </div>

      {/* Degradê preso ao rodapé da caixa. `pointer-events-none` para não
          roubar o clique dos cards que passam por baixo dele. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-bg-main to-transparent transition-opacity duration-200 ${
          temMais ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
