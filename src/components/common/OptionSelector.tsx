import React from 'react';

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
}

const DEFAULT = '#2477FF';

export const OptionSelector: React.FC<OptionSelectorProps> = ({
  label,
  options,
  value,
  onChange,
  layout = 'wrap',
  columns = 3,
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
              onClick={() => onChange(option.value)}
              className={`
                inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold
                transition-all duration-150 active:scale-[0.96] focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60
                ${selected
                  ? 'shadow-sm'
                  : 'border-border text-text-secondary hover:border-text-soft hover:bg-bg-secondary'}
              `}
              style={
                selected
                  ? { borderColor: accent, color: accent, backgroundColor: accent + '14' }
                  : undefined
              }
            >
              {option.dot && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
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
