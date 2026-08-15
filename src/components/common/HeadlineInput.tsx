import React, { useEffect, useRef } from 'react';

/**
 * O título de uma tarefa, evento ou ideia NÃO é mais um campo do formulário —
 * é a coisa em si. Por isso não tem rótulo, nem borda, nem caixa: é o texto
 * grande em que o cursor já está piscando quando o modal abre.
 *
 * O rótulo "Título" acima de uma caixa igual às outras sete é o que faz uma
 * tela de criação parecer um cadastro de sistema. Quem abre "nova tarefa" já
 * sabe que o primeiro campo é o nome dela.
 *
 * `aria-label` é OBRIGATÓRIO justamente porque não há `<label>`: sem ele o
 * leitor de tela anuncia "caixa de edição" e mais nada. O `placeholder` não
 * serve de nome acessível — some ao digitar e é ignorado por parte dos
 * leitores. O que é dispensável é o rótulo VISÍVEL, não o nome do campo.
 */
interface HeadlineInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  'aria-label': string;
}

export const HeadlineInput = React.forwardRef<HTMLInputElement, HeadlineInputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      type="text"
      className={`
        w-full bg-transparent border-0 p-0 text-xl sm:text-2xl font-bold tracking-tight
        text-text-primary placeholder-text-soft
        focus:outline-none focus:ring-0 disabled:opacity-60
        ${className}
      `}
      {...props}
    />
  ),
);

HeadlineInput.displayName = 'HeadlineInput';

/** Altura máxima antes de o campo passar a rolar (≈ 8 linhas). */
const MAX_HEIGHT = 192;

interface NoteFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  /** Obrigatório pelo mesmo motivo do HeadlineInput: não há `<label>`. */
  'aria-label': string;
}

/**
 * A descrição, logo abaixo do título e no mesmo bloco — sem rótulo e sem
 * moldura, como a segunda linha de uma anotação.
 *
 * Cresce com o texto em vez de reservar três linhas vazias de antemão: campo
 * opcional que ocupa espaço de campo obrigatório empurra o que importa para
 * fora da tela e faz a pessoa achar que precisa preencher.
 */
export const NoteField = React.forwardRef<HTMLTextAreaElement, NoteFieldProps>(
  ({ className = '', value, onChange, ...props }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const resize = (el: HTMLTextAreaElement | null) => {
      if (!el) return;
      // 'auto' antes de medir: sem isso o scrollHeight só cresce, e o campo
      // nunca encolhe ao apagar texto.
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    };

    // Reage também a mudanças que não vieram da digitação (limpar o formulário
    // ao salvar, carregar uma edição).
    useEffect(() => resize(innerRef.current), [value]);

    return (
      <textarea
        ref={el => {
          innerRef.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
        }}
        rows={1}
        value={value}
        onChange={e => {
          resize(e.currentTarget);
          onChange?.(e);
        }}
        className={`
          w-full resize-none bg-transparent border-0 p-0 overflow-y-auto
          text-base leading-6 text-text-secondary placeholder-text-soft
          focus:outline-none focus:ring-0 disabled:opacity-60
          ${className}
        `}
        {...props}
      />
    );
  },
);

NoteField.displayName = 'NoteField';
