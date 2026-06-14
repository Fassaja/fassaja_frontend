import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  label?: string;
  value: string; // 'YYYY-MM-DD' ou ''
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Abre o calendário para cima (útil quando o campo fica no rodapé). */
  openUp?: boolean;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatLabel(value: string): string {
  const d = parseISO(value);
  if (!d) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Selecione uma data',
  disabled,
  openUp = false,
}) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(() => parseISO(value) ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setView(parseISO(value) ?? new Date());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const days = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  }, [view]);

  const todayISO = toISO(new Date());
  const selected = parseISO(value);

  const pick = (day: number) => {
    onChange(toISO(new Date(view.getFullYear(), view.getMonth(), day)));
    setOpen(false);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">{label}</label>
      )}
      <div ref={ref} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(v => !v)}
          className={`
            w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-white text-left
            transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60
            disabled:bg-bg-secondary disabled:cursor-not-allowed
            ${open ? 'border-primary-vibrant ring-4 ring-primary-light/60' : 'border-border hover:border-primary-vibrant/50'}
          `}
        >
          <CalendarIcon size={18} className="text-text-secondary shrink-0" />
          <span className={`flex-1 ${value ? 'text-text-primary' : 'text-text-soft'}`}>
            {value ? formatLabel(value) : placeholder}
          </span>
          {value && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Limpar data"
              onClick={e => {
                e.stopPropagation();
                onChange('');
              }}
              className="text-text-soft hover:text-danger transition-colors"
            >
              <X size={16} />
            </span>
          )}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className={`absolute z-50 left-0 w-72 bg-white rounded-2xl border-2 border-border ring-1 ring-primary-vibrant/20 shadow-xl p-4 ${
                openUp ? 'bottom-full mb-2' : 'top-full mt-2'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  aria-label="Mês anterior"
                  onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
                  className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-bold text-text-primary">
                  {MONTHS[view.getMonth()]} {view.getFullYear()}
                </span>
                <button
                  type="button"
                  aria-label="Próximo mês"
                  onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
                  className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-secondary transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Weekdays */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((w, i) => (
                  <span key={i} className="text-center text-[11px] font-semibold text-text-soft py-1">
                    {w}
                  </span>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-0.5">
                {days.map((day, i) => {
                  if (!day) return <span key={i} />;
                  const iso = toISO(new Date(view.getFullYear(), view.getMonth(), day));
                  const isToday = iso === todayISO;
                  const isSelected =
                    selected &&
                    selected.getDate() === day &&
                    selected.getMonth() === view.getMonth() &&
                    selected.getFullYear() === view.getFullYear();

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pick(day)}
                      className={`
                        h-9 rounded-lg text-sm font-medium transition-colors
                        ${isSelected
                          ? 'bg-primary-vibrant text-white font-bold'
                          : isToday
                          ? 'text-primary-vibrant font-bold bg-primary-light'
                          : 'text-text-primary hover:bg-bg-secondary'}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="text-xs font-medium text-text-secondary hover:text-danger transition-colors"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(todayISO);
                    setOpen(false);
                  }}
                  className="text-xs font-semibold text-primary-vibrant hover:text-primary-hover transition-colors"
                >
                  Hoje
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
