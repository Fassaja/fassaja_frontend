import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Minus, Plus, SlidersHorizontal, X } from 'lucide-react';
import {
  DURACOES_RAPIDAS,
  MAX_MINUTOS,
  MIN_MINUTOS,
  limitarMinutos,
  rotuloDeDuracao,
} from '@/utils/focoCoach';

const SUAVE = { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const };
/** Passo do +/-. Cinco minutos é o ajuste que alguém realmente pensa. */
const PASSO = 5;

/**
 * Por quanto tempo focar.
 *
 * Os três atalhos ficam, porque na maior parte das vezes a resposta é um
 * deles e escolher tem de ser um clique. Mas eles deixam de ser a única
 * opção: "Outro tempo" abre um ajuste livre até 3 horas, com passos de 5
 * minutos e digitação direta.
 *
 * A régua e o número andam juntos de propósito — a régua dá a noção de
 * "quanto é isso" que um campo de texto não dá, e o campo dá a precisão que a
 * régua não dá.
 */
export const SeletorDeTempo: React.FC<{
  sugerida: number;
  desabilitado?: boolean;
  onEscolher: (minutos: number) => void;
}> = ({ sugerida, desabilitado, onEscolher }) => {
  const [livre, setLivre] = useState(false);
  /*
   * Qual botão foi clicado.
   *
   * `desabilitado` sozinho apaga os três ao mesmo tempo e não diz qual está
   * trabalhando: no tempo da resposta do servidor a tela parecia congelada.
   * Guardando o escolhido, só ele mostra o giro — o resto apenas espera.
   */
  const [escolhido, setEscolhido] = useState<number | null>(null);
  // Abre em 45: fica entre o maior atalho (50) e o teto (60), então a régua
  // já nasce num lugar em que dá para ir para os dois lados.
  const [minutos, setMinutos] = useState(45);

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">
        Por quanto tempo?
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {!livre ? (
          <motion.div
            key="atalhos"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SUAVE}
            className="flex w-full flex-col items-center gap-2"
          >
            <div className="flex w-full gap-2">
              {DURACOES_RAPIDAS.map((m, i) => (
                <motion.button
                  key={m}
                  type="button"
                  disabled={desabilitado}
                  onClick={() => {
                    setEscolhido(m);
                    onEscolher(m);
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  // Entram em cascata: a sequência conduz o olho da esquerda
                  // para a direita, na ordem em que se lê.
                  transition={{ ...SUAVE, delay: i * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 rounded-xl border py-3 text-sm font-bold transition-colors disabled:opacity-50 min-h-[52px] ${
                    m === sugerida
                      ? 'border-primary-vibrant bg-primary-vibrant text-white hover:bg-primary-hover'
                      : 'border-border bg-surface text-text-secondary hover:border-primary-vibrant/40 hover:text-primary-vibrant'
                  }`}
                >
                  {desabilitado && escolhido === m ? (
                    <Loader2 size={16} className="mx-auto animate-spin" />
                  ) : (
                    `${m} min`
                  )}
                </motion.button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLivre(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-soft transition-colors hover:text-primary-vibrant"
            >
              <SlidersHorizontal size={13} /> Outro tempo
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="livre"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SUAVE}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-soft">
                Tempo livre
              </span>
              <button
                type="button"
                onClick={() => setLivre(false)}
                aria-label="Voltar aos tempos rápidos"
                className="rounded-lg p-1 text-text-soft transition-colors hover:text-text-primary"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Diminuir 5 minutos"
                onClick={() => setMinutos(m => limitarMinutos(m - PASSO))}
                className="grid h-10 w-10 place-items-center rounded-full border border-border text-text-secondary transition-colors hover:border-primary-vibrant/50 hover:text-primary-vibrant"
              >
                <Minus size={16} />
              </button>

              {/* O número troca com uma passada curta: o valor muda, e a
                  transição diz que mudou sem roubar a atenção. */}
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={minutos}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="min-w-[6rem] text-center text-3xl font-bold tabular-nums text-text-primary"
                >
                  {rotuloDeDuracao(minutos)}
                </motion.span>
              </AnimatePresence>

              <button
                type="button"
                aria-label="Aumentar 5 minutos"
                onClick={() => setMinutos(m => limitarMinutos(m + PASSO))}
                className="grid h-10 w-10 place-items-center rounded-full border border-border text-text-secondary transition-colors hover:border-primary-vibrant/50 hover:text-primary-vibrant"
              >
                <Plus size={16} />
              </button>
            </div>

            <input
              type="range"
              min={MIN_MINUTOS}
              max={MAX_MINUTOS}
              step={1}
              value={minutos}
              onChange={e => setMinutos(limitarMinutos(Number(e.target.value)))}
              aria-label="Duração em minutos"
              className="w-full accent-primary-vibrant"
            />
            <div className="flex w-full justify-between text-[11px] text-text-soft">
              <span>1 min</span>
              <span>1h</span>
            </div>

            <motion.button
              type="button"
              disabled={desabilitado}
              onClick={() => {
                setEscolhido(minutos);
                onEscolher(limitarMinutos(minutos));
              }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center rounded-xl bg-primary-vibrant py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-50 min-h-[52px]"
            >
              {desabilitado ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                `Focar por ${rotuloDeDuracao(minutos)}`
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
