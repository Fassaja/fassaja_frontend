import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDateChip } from '@/utils/date';

interface DatePickerProps {
  label?: string;
  value: string; // 'YYYY-MM-DD' ou ''
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Preferência por abrir para cima. É só preferência: se não couber acima,
   * o calendário vira para baixo sozinho.
   */
  openUp?: boolean;
  /**
   * `sm` vira um chip do tamanho do próprio conteúdo, para a linha de
   * controles rápidos dos modais de criação. O padrão segue sendo o campo de
   * largura total dos formulários completos.
   */
  size?: 'sm' | 'md';
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const LARGURA = 288; // 18rem, a largura desenhada
const FOLGA = 8; // respiro entre o botão e o painel, e das bordas da tela
/**
 * Altura aproximada do painel (cabeçalho + 6 linhas de dias + rodapé). Só é
 * usada na primeiríssima medição; a partir daí vale a altura real do elemento.
 */
const ALTURA_ESTIMADA = 352;

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
  size = 'md',
}) => {
  const compact = size === 'sm';
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(() => parseISO(value) ?? new Date());
  const ref = useRef<HTMLDivElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const [estilo, setEstilo] = useState<React.CSSProperties>({});

  // O calendário vai para um portal com position: fixed. Dentro do modal, o
  // corpo é `overflow-y-auto`: um painel `absolute` era recortado ali, e a
  // pessoa tinha que rolar o formulário para enxergar os dias. Em portal ele
  // fica por cima de tudo, que é o comportamento certo para um popup.
  const reposicionar = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Altura real assim que o painel existe; a estimativa só cobre o primeiro
    // cálculo. Medir importa porque é ela que decide o quanto subir.
    const altura = painelRef.current?.offsetHeight || ALTURA_ESTIMADA;

    /*
     * Abre para BAIXO por padrão, mesmo quando não sobra espaço.
     *
     * Antes ele virava para cima assim que faltava altura embaixo, e o
     * resultado era pior do que o problema: o campo de data fica perto do
     * rodapé dos modais, então o painel cobria o formulário inteiro — título,
     * tudo. Descendo, ele tapa só o que está abaixo do campo, que é o que a
     * pessoa já respondeu.
     *
     * Para cima agora só quando quem chamou pediu (`openUp`) E realmente cabe.
     */
    const paraCima = openUp && r.top > altura + FOLGA;

    const largura = Math.min(LARGURA, window.innerWidth - FOLGA * 2);
    const maxEsquerda = Math.max(FOLGA, window.innerWidth - FOLGA - largura);

    const estilo: React.CSSProperties = {
      position: 'fixed',
      width: largura,
      // Preso à viewport: em tela estreita o painel encostava na borda.
      left: Math.min(Math.max(r.left, FOLGA), maxEsquerda),
      // Painel mais alto que a janela (celular deitado) rola por dentro, em
      // vez de ter o rodapé "Limpar / Hoje" cortado fora da tela.
      maxHeight: window.innerHeight - FOLGA * 2,
      overflowY: 'auto',
      // Acima do modal (z-70), como o Dropdown.
      zIndex: 80,
    };

    if (paraCima) {
      estilo.bottom = window.innerHeight - r.top + FOLGA;
    } else {
      // Quando não cabe embaixo, sobe só o necessário para não sair da tela —
      // em vez de virar de lado. Continua sendo "para baixo", sobrepondo.
      const topoMax = Math.max(FOLGA, window.innerHeight - FOLGA - altura);
      estilo.top = Math.min(r.bottom + FOLGA, topoMax);
    }

    setEstilo(estilo);
  }, [openUp]);

  useLayoutEffect(() => {
    if (!open) return;
    reposicionar();
    const aoMover = () => reposicionar();
    window.addEventListener('scroll', aoMover, true); // capture: pega o scroll do modal
    window.addEventListener('resize', aoMover);
    return () => {
      window.removeEventListener('scroll', aoMover, true);
      window.removeEventListener('resize', aoMover);
    };
  }, [open, reposicionar]);

  useEffect(() => {
    if (open) setView(parseISO(value) ?? new Date());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (ref.current?.contains(alvo)) return;
      // O painel está fora da árvore do gatilho: sem esta linha, clicar numa
      // seta de mês fecharia o calendário.
      if (painelRef.current?.contains(alvo)) return;
      setOpen(false);
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
    <div className={compact ? 'inline-block' : 'w-full'}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">{label}</label>
      )}
      <div ref={ref} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(v => !v)}
          className={`
            flex items-center bg-surface text-left border
            transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60
            disabled:bg-bg-secondary disabled:cursor-not-allowed
            ${compact
              ? 'min-h-[40px] sm:min-h-0 gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold'
              : 'w-full gap-3 px-4 py-2.5 rounded-xl'}
            ${open ? 'border-primary-vibrant ring-4 ring-primary-light/60' : 'border-border hover:border-primary-vibrant/50'}
          `}
        >
          <CalendarIcon
            size={compact ? 14 : 18}
            className={`shrink-0 ${value && compact ? 'text-primary-vibrant' : 'text-text-secondary'}`}
          />
          <span
            className={`${compact ? '' : 'flex-1'} ${
              value ? (compact ? 'text-primary-vibrant' : 'text-text-primary') : 'text-text-soft'
            }`}
          >
            {value ? (compact ? formatDateChip(value) : formatLabel(value)) : placeholder}
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
              <X size={compact ? 13 : 16} />
            </span>
          )}
        </button>

        {createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={painelRef}
                style={estilo}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                /* w-72 = os mesmos 288px do style: o painel é filho de <body> até o
                   style chegar, e sem largura aqui a primeira medição de altura
                   sairia errada. */
                className="w-72 max-w-[calc(100vw-1rem)] bg-surface rounded-2xl border-2 border-border ring-1 ring-primary-vibrant/20 shadow-xl p-4"
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
          </AnimatePresence>,
          document.body,
        )}
      </div>
    </div>
  );
};
