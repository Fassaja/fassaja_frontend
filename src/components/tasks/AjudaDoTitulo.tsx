import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

const SUAVE = { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const };

/**
 * O "?" ao lado do título: como escrever prazo, prioridade e etiqueta.
 *
 * Antes isto era uma linha fixa abaixo do campo — "Dica: escreva amanhã,
 * !alta ou #tag...". Ensinava, mas cobrava a leitura em TODA criação de
 * tarefa, inclusive de quem já sabe, e empurrava o formulário para baixo num
 * modal que já estava cheio.
 *
 * Como "?" ela vira oferta: fica fora do caminho e responde quando perguntam.
 * Os exemplos ficam nas duas colunas para a relação "escreva isto → vira
 * aquilo" ser lida de uma vez, sem texto corrido.
 */
const EXEMPLOS: { escreva: string; vira: string }[] = [
  { escreva: 'amanhã', vira: 'prazo para amanhã' },
  { escreva: 'sexta', vira: 'a próxima sexta' },
  { escreva: 'dia 20', vira: 'o próximo dia 20' },
  { escreva: '15/09', vira: 'essa data' },
  { escreva: '!alta', vira: 'prioridade alta' },
  { escreva: '#trabalho', vira: 'a etiqueta trabalho' },
];

export const AjudaDoTitulo: React.FC = () => {
  const [aberto, setAberto] = useState(false);
  const caixaRef = useRef<HTMLDivElement>(null);

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
    <div ref={caixaRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        aria-expanded={aberto}
        aria-label="Como escrever prazo, prioridade e etiqueta no título"
        className={`grid h-7 w-7 place-items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-light ${
          aberto
            ? 'bg-primary-light text-primary-vibrant'
            : 'text-text-soft hover:bg-bg-secondary hover:text-primary-vibrant'
        }`}
      >
        <HelpCircle size={16} />
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={SUAVE}
            /* Ancorado à direita: o botão fica no canto do campo, e abrir para
               a esquerda mantém o balão dentro do modal em tela estreita. */
            className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-3rem))] rounded-xl border border-border bg-surface p-3 shadow-xl"
          >
            <p className="mb-2 text-xs text-text-secondary">
              Escreva no título e vira campo sozinho:
            </p>
            <ul className="flex flex-col gap-1.5">
              {EXEMPLOS.map(({ escreva, vira }) => (
                <li key={escreva} className="flex items-center gap-2 text-xs">
                  <code className="shrink-0 rounded-md border border-border bg-bg-secondary px-1.5 py-0.5 font-semibold text-text-primary">
                    {escreva}
                  </code>
                  <span className="text-text-soft">→</span>
                  <span className="text-text-secondary">{vira}</span>
                </li>
              ))}
            </ul>
            {/* A ressalva que evita a frustração mais provável: a pessoa digita
                #algo que não existe e acha que o recurso falhou. */}
            <p className="mt-2.5 border-t border-border pt-2 text-[11px] leading-snug text-text-soft">
              A etiqueta só é reconhecida se já existir. Horas ficam no título —
              o prazo guarda o dia, não a hora.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
