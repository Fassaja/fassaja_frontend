import { useEffect, useRef } from 'react';
import {
  type AcaoDeAtalho,
  ESPERA_DO_G_MS,
  atalhosLigados,
  resolverAtalho,
} from '@/utils/atalhos';

/**
 * Escuta os atalhos de uma tecla (ver utils/atalhos) e entrega a ação.
 *
 * Quando NÃO dispara — é isto que impede um "n" digitado de abrir um modal:
 * - foco num campo de texto, seletor ou área editável;
 * - algum modal aberto (`aria-modal`): lá dentro as teclas são do modal;
 * - tecla segurada (repetição automática) ou já tratada por outro componente;
 * - atalhos desligados na lista de atalhos.
 */
export function useAtalhosGlobais(aoAcionar: (acao: AcaoDeAtalho) => void): void {
  // Ref: o listener é registrado uma vez e sempre chama a versão atual.
  const acionar = useRef(aoAcionar);
  acionar.current = aoAcionar;

  useEffect(() => {
    let gPendente = false;
    let timerDoG = 0;

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.isComposing) return;
      if (!atalhosLigados()) return;

      const alvo = e.target as HTMLElement | null;
      if (
        alvo &&
        (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))
      ) {
        return;
      }
      if (document.querySelector('[aria-modal="true"]')) return;

      const r = resolverAtalho(e, gPendente);
      window.clearTimeout(timerDoG);
      gPendente = r.gPendente;
      if (gPendente) timerDoG = window.setTimeout(() => (gPendente = false), ESPERA_DO_G_MS);

      if (r.acao) {
        // Sem isto o "/" ainda cairia na busca rápida do Firefox.
        e.preventDefault();
        acionar.current(r.acao);
      }
    };

    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      window.clearTimeout(timerDoG);
    };
  }, []);
}
