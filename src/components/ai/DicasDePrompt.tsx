import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EXEMPLOS_DE_COMANDO } from '@/utils/exemplosDeComando';

/**
 * Setinha torta que revela exemplos de comando.
 *
 * Antes as cinco frases ficavam soltas acima do balão, sempre. Ensinavam, mas
 * cobravam a leitura das cinco antes de a pessoa poder fazer qualquer coisa —
 * e cobravam de novo em toda visita, inclusive de quem já sabe o que quer.
 *
 * Aqui elas viram uma oferta: aparecem quando o ponteiro chega perto e ficam
 * fora do caminho no resto do tempo. Quem já sabe, escreve; quem travou, acha.
 */
export const DicasDePrompt: React.FC<{
  /** O ponteiro está sobre o balão (ou sobre esta própria dica). */
  visivel: boolean;
  onEscolher: (exemplo: string) => void;
}> = ({ visivel, onEscolher }) => {
  const [aberto, setAberto] = useState(false);
  const [focado, setFocado] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);

  /*
   * Some ao tirar o ponteiro, MAS não enquanto o menu está aberto nem com o
   * foco do teclado nela — desaparecer debaixo do que a pessoa acabou de abrir,
   * ou sob o cursor de quem chegou por Tab, é perder o lugar sem aviso.
   */
  const mostrar = visivel || aberto || focado;

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (!caixaRef.current?.contains(e.target as Node)) setAberto(false);
    };
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  return (
    <div ref={caixaRef} className="relative flex justify-start">
      <motion.button
        type="button"
        onClick={() => setAberto(v => !v)}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        aria-expanded={aberto}
        /*
         * Fica SEMPRE no DOM, só com opacidade zero: elemento removido não é
         * alcançável pelo Tab, e quem navega por teclado ficaria sem as dicas.
         * `pointerEvents` desligado enquanto invisível para não pegar cliques
         * de quem nem a está vendo.
         *
         * A entrada sobe um fio e a saída desce o mesmo fio — um gesto só, em
         * 0,2s. É curto de propósito: dica que demora a sumir vira sujeira na
         * tela quando a pessoa já seguiu adiante.
         */
        initial={false}
        animate={{ opacity: mostrar ? 1 : 0, y: mostrar ? 0 : 4 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ pointerEvents: mostrar ? 'auto' : 'none' }}
        className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg text-xs font-medium hover:text-primary-vibrant focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-light ${
          aberto ? 'text-primary-vibrant' : 'text-text-soft'
        }`}
      >
        {/* Setinha saindo do BALÃO (embaixo) e subindo até o texto.
            O sentido importa: ela indica de onde a pessoa está vindo para onde
            olhar. Antes apontava para o balão — o contrário do que o gesto
            precisa dizer, já que o balão é o lugar onde ela JÁ está.

            Um arco único, sem inflexão. A versão anterior mudava de curvatura
            no meio e por isso parecia torta; aqui a curva sai vertical e chega
            horizontal, que é o traço que a mão faz naturalmente.

            A ponta e as barbas saem da tangente do fim do arco, para a seta
            nascer da linha em vez de ser um "V" encostado nela. */}
        <svg
          width="24"
          height="20"
          viewBox="0 0 24 20"
          fill="none"
          aria-hidden
          className="shrink-0 -mb-2 opacity-80"
        >
          <path
            d="M3.5 18C3.5 9.5 8 4.5 17 4.1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M12.3 1.4 17.2 4.1 12.5 7.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        dicas de prompt
      </motion.button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            /* Abre para CIMA: o balão está colado no rodapé da tela, e para
               baixo não há espaço. */
            className="absolute bottom-full left-0 mb-1.5 z-20 w-[min(22rem,calc(100vw-3rem))] rounded-xl border border-border bg-surface/95 backdrop-blur-md p-1.5 shadow-xl"
          >
            {EXEMPLOS_DE_COMANDO.map(exemplo => (
              <button
                key={exemplo}
                type="button"
                onClick={() => {
                  onEscolher(exemplo);
                  setAberto(false);
                }}
                className="block w-full rounded-lg px-2.5 py-2 text-left text-xs text-text-secondary hover:bg-bg-secondary hover:text-primary-vibrant transition-colors"
              >
                {exemplo}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
