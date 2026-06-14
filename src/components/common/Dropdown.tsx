import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  menuAlign?: 'left' | 'right';
  /** Compact trigger (used inside cards/headers). */
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione',
  menuAlign = 'left',
  size = 'md',
  fullWidth = false,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find(o => o.value === value);
  const triggerPad = size === 'sm' ? 'pl-3 pr-2.5 py-1.5 text-sm' : 'px-4 py-2.5';

  return (
    <div className={`${fullWidth ? 'w-full' : 'inline-block'}`}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">{label}</label>
      )}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`
            ${fullWidth ? 'w-full' : ''} ${triggerPad}
            inline-flex items-center justify-between gap-2 rounded-xl border bg-white font-medium text-text-primary
            transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60
            ${open ? 'border-primary-vibrant ring-4 ring-primary-light/60' : 'border-border hover:border-primary-vibrant/50'}
          `}
        >
          <span className={selected ? '' : 'text-text-soft'}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            size={size === 'sm' ? 15 : 18}
            className={`text-text-secondary shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className={`
                absolute z-50 mt-2 min-w-full w-max max-w-[16rem] max-h-64 overflow-y-auto
                bg-white rounded-xl border-2 border-border ring-1 ring-primary-vibrant/20 shadow-xl p-1.5
                ${menuAlign === 'right' ? 'right-0' : 'left-0'}
              `}
            >
              {options.map(option => {
                const isSelected = option.value === value;
                return (
                  <li key={option.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`
                        w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors
                        ${isSelected
                          ? 'bg-primary-light text-primary-vibrant font-semibold'
                          : 'text-text-primary hover:bg-bg-secondary'}
                      `}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && <Check size={16} className="shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
