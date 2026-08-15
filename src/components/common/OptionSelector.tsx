import React from 'react';
import { tint } from '@/utils/color';

export interface SelectableOption {
  value: string;
  label: string;
  /** Accent color used when the option is selected. Defaults to the brand blue. */
  color?: string;
  /** Show a colored dot before the label (uses `color`). */
  dot?: boolean;
}

interface OptionSelectorProps {
  label?: string;
  options: SelectableOption[];
  value: string;
  onChange: (value: string) => void;
  /** Layout: inline pills that wrap, or an even grid. */
  layout?: 'wrap' | 'grid';
  columns?: number;
  disabled?: boolean;
  /**
   * `sm` encolhe as pílulas para caberem na linha de controles rápidos de um
   * modal de criação, ao lado da data e do projeto. No tamanho padrão elas têm
   * peso de campo de formulário e disputam atenção com o título.
   */
  size?: 'sm' | 'md';
}

const DEFAULT = '#2477FF';

/*
 * `min-h-[40px]` no celular, altura natural (~30px) a partir de sm:.
 *
 * A pílula compacta foi desenhada para o mouse, e num toque de polegar 30px
 * ao lado de outra pílula a 8px de distância é onde o erro acontece — o dedo
 * acerta a vizinha. 40px fica acima do piso que o resto do app já usa em
 * botões de ícone (36px) sem esticar a linha no desktop.
 */
const sizeStyles = {
  sm: 'min-h-[40px] sm:min-h-0 px-2.5 py-1.5 text-[13px] rounded-lg gap-1.5',
  md: 'px-3.5 py-2 text-sm rounded-xl gap-2',
};

export const OptionSelector: React.FC<OptionSelectorProps> = ({
  label,
  options,
  value,
  onChange,
  layout = 'wrap',
  columns = 3,
  disabled = false,
  size = 'md',
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">{label}</label>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        className={
          layout === 'grid'
            ? 'grid gap-2'
            : 'flex flex-wrap gap-2'
        }
        style={layout === 'grid' ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {options.map(option => {
          const selected = option.value === value;
          const accent = option.color ?? DEFAULT;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`
                inline-flex items-center justify-center border font-semibold ${sizeStyles[size]}
                transition-all duration-150 active:scale-[0.96] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60
                disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100
                ${selected
                  ? 'shadow-sm'
                  : 'border-border text-text-secondary hover:border-text-soft hover:bg-bg-secondary'}
              `}
              style={
                selected
                  ? { borderColor: accent, color: accent, backgroundColor: tint(accent) }
                  : undefined
              }
            >
              {option.dot && (
                <span
                  className={`rounded-full shrink-0 ${size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'}`}
                  style={{ backgroundColor: accent }}
                />
              )}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
