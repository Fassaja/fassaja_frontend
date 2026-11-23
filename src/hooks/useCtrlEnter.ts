import { useEffect, type RefObject } from 'react';

/**
 * Ctrl/⌘+Enter envia o formulário, de qualquer campo dentro dele — inclusive
 * de uma área de texto, onde o Enter sozinho quebra linha.
 *
 * Escuta na janela (e não `onKeyDown` no <form>) e confere se o foco está
 * dentro do formulário: assim vale também para os painéis da linha de
 * propriedades, que ficam num portal fora dele, e não precisa transformar o
 * <form> num elemento "interativo".
 */
export function useCtrlEnter(formRef: RefObject<HTMLFormElement>, ativo: boolean): void {
  useEffect(() => {
    if (!ativo) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
      const form = formRef.current;
      if (!form || !form.contains(document.activeElement)) return;
      e.preventDefault();
      form.requestSubmit();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [formRef, ativo]);
}
