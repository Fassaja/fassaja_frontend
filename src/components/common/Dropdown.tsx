import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  disabled?: boolean;
}

const MENU_MAX_H = 256; // max-h-64
const MENU_MAX_W = 256; // max-w-[16rem]
const GAP = 8;

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione',
  menuAlign = 'left',
  size = 'md',
  fullWidth = false,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // O menu é renderizado num portal com position: fixed — assim nunca é cortado
  // por um ancestral com overflow (ex.: dentro de um Modal). Posição calculada
  // a partir do gatilho, com auto-flip para cima quando falta espaço embaixo.
  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openUp = spaceBelow < Math.min(MENU_MAX_H + GAP, 240) && spaceAbove > spaceBelow;

    const style: React.CSSProperties = {
      position: 'fixed',
      minWidth: r.width,
      maxHeight: Math.max(120, Math.min(MENU_MAX_H, (openUp ? spaceAbove : spaceBelow) - GAP)),
      zIndex: 80, // acima de modais (z-70)
    };
    // Mantém o menu dentro da viewport (evita vazar a borda em telas estreitas).
    const estWidth = Math.min(MENU_MAX_W, Math.max(r.width, 176));
    const maxOffset = Math.max(GAP, window.innerWidth - GAP - estWidth);
    if (menuAlign === 'right') {
      style.right = Math.min(Math.max(window.innerWidth - r.right, GAP), maxOffset);
    } else {
      style.left = Math.min(Math.max(r.left, GAP), maxOffset);
    }
    if (openUp) style.bottom = window.innerHeight - r.top + GAP;
    else style.top = r.bottom + GAP;
    setMenuStyle(style);
  }, [menuAlign]);

  // Reposiciona ao abrir e acompanha scroll/resize enquanto aberto.
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onMove = () => updatePosition();
    window.addEventListener('scroll', onMove, true); // capture: pega scroll interno
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, updatePosition]);

  // Fecha ao clicar fora (gatilho + menu, já que o menu vive em outro nó) ou Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
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
      <div ref={triggerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`
            ${fullWidth ? 'w-full' : ''} ${triggerPad}
            inline-flex items-center justify-between gap-2 rounded-xl border bg-white font-medium text-text-primary
            transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60
            disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border
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

        {createPortal(
          <AnimatePresence>
            {open && (
              <motion.ul
                ref={menuRef}
                role="listbox"
                style={menuStyle}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                className="w-max max-w-[16rem] overflow-y-auto bg-white rounded-xl border-2 border-border ring-1 ring-primary-vibrant/20 shadow-xl p-1.5"
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
          </AnimatePresence>,
          document.body,
        )}
      </div>
    </div>
  );
};
