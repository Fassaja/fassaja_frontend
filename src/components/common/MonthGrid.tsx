import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { toISODate } from '@/utils/date';
import { addDays, monthWeeks, sameMonth, shiftMonth } from '@/utils/monthGrid';

/** Um ponto colorido sob o número do dia. */
export interface DayMarker {
  /** Cor do dado (projeto, evento). Ignorada quando `alert`. */
  color: string;
  /** Marca de atenção (prazo vencido): vence a cor do dado e usa o token de perigo. */
  alert?: boolean;
}

interface MonthGridProps {
  /** Mês exibido (qualquer dia dele). */
  month: Date;
  onMonthChange: (date: Date) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  /** Marcadores de um dia, na ordem em que devem aparecer. */
  markersFor: (iso: string) => DayMarker[];
  /** Singular do que é contado, para o rótulo de leitor de tela ("tarefa"). */
  noun: string;
  /** Linha de resumo sob o nome do mês ("12 prazos neste mês"). */
  summary?: React.ReactNode;
  /** Conteúdo do rodapé do cartão (legenda, filtros). */
  footer?: React.ReactNode;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const WEEK_DAYS = [
  { short: 'Dom', full: 'domingo' },
  { short: 'Seg', full: 'segunda-feira' },
  { short: 'Ter', full: 'terça-feira' },
  { short: 'Qua', full: 'quarta-feira' },
  { short: 'Qui', full: 'quinta-feira' },
  { short: 'Sex', full: 'sexta-feira' },
  { short: 'Sáb', full: 'sábado' },
];

/** Quantos pontos cabem sem espremer a célula; o resto vira "+N". */
const MAX_DOTS = 3;

/** Mesma medida na linha dos dias da semana e nas semanas, para as colunas baterem. */
const ROW = 'grid grid-cols-7 gap-1 sm:gap-1.5';

/**
 * Grade mensal compartilhada por Calendário (prazos) e Agenda (compromissos).
 *
 * As duas telas tinham a mesma grade copiada — cabeçalho com as setas, linha
 * dos dias da semana e as células de 7 colunas —, então cada correção só
 * chegava em uma. O que muda entre elas é só o que cada dia MARCA, e isso
 * entra por `markersFor`.
 *
 * Decisões que valem para as duas:
 *
 * - Sempre 6 semanas. Meses ocupam 5 ou 6 linhas conforme o dia em que caem;
 *   com a altura variável, trocar de mês fazia o cartão (e o painel ao lado)
 *   pular. Os dias vizinhos, antes buracos vazios, agora aparecem apagados e
 *   clicáveis — atravessar a virada do mês vira um clique.
 *
 * - "Hoje" é um disco em volta do NÚMERO, não a célula inteira pintada. Como
 *   célula cheia, hoje e o dia selecionado disputavam o mesmo fundo: ao abrir
 *   a tela (que já seleciona hoje) não dava para saber qual estado se estava
 *   vendo, e os pontos coloridos tinham que virar branco por cima do azul,
 *   perdendo a cor do projeto. Separados, os dois estados coexistem.
 *
 * - A grade é UM ponto de tabulação, com as setas movendo o foco entre os
 *   dias (padrão de `role="grid"`). Com 42 botões tabuláveis, chegar ao painel
 *   do lado pelo teclado custava 42 Tabs.
 *
 * - Cada semana é uma linha de verdade (`role="row"` com suas 7 colunas), e
 *   não uma sequência solta de células. É o que a estrutura de uma grade pede,
 *   e evita depender de `display: contents`, que já teve implementação furada.
 *
 * Sem animação de entrada nas células: 42 elementos animando a cada troca de
 * mês faziam a grade tremer em vez de assentar.
 */
export const MonthGrid: React.FC<MonthGridProps> = ({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  markersFor,
  noun,
  summary,
  footer,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  // Dia que carrega o tabindex=0 da grade. Só é preenchido pela navegação por
  // teclado; enquanto for null, o tabindex mora no dia selecionado.
  const [focusISO, setFocusISO] = useState<string | null>(null);
  /**
   * Só a navegação por TECLADO devolve o foco a uma célula. Sem esta trava, um
   * clique nas setas do mês (que também troca o mês) fazia o efeito abaixo
   * roubar o foco do botão da seta e jogá-lo num dia — quem clicava duas vezes
   * em "próximo mês" via o segundo clique não acontecer.
   */
  const restoreFocus = useRef(false);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const todayISO = toISODate(new Date());
  const selectedISO = toISODate(selectedDate);

  const first = new Date(year, monthIndex, 1);
  const weeks = monthWeeks(first);

  /**
   * Onde o Tab entra: o dia focado pelas setas, o selecionado (se estiver no
   * mês visível) ou o dia 1 — nunca nenhum, senão a grade fica inalcançável.
   *
   * O `focusISO` só vale enquanto o dia continuar À VISTA: quem navegou pelo
   * teclado e depois pulou dois meses pelas setas do mouse deixaria o
   * tabindex=0 num dia que não está mais na tela, e aí nenhuma célula seria
   * alcançável pelo Tab.
   */
  const visibleISO = new Set(weeks.flat().map(toISODate));
  const tabbableISO =
    focusISO && visibleISO.has(focusISO)
      ? focusISO
      : sameMonth(selectedDate, first)
      ? selectedISO
      : toISODate(first);

  // Ao atravessar a virada do mês pelas setas do teclado, o dia de destino só
  // existe depois que o mês novo renderiza — daí devolver o foco por efeito.
  useEffect(() => {
    if (!focusISO || !restoreFocus.current) return;
    restoreFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-iso="${focusISO}"]`)
      ?.focus();
  }, [focusISO, year, monthIndex]);

  const goToMonth = (date: Date) => onMonthChange(new Date(date.getFullYear(), date.getMonth(), 1));

  const handleSelect = (date: Date) => {
    if (!sameMonth(date, first)) goToMonth(date);
    onSelectDate(date);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const base = new Date(`${tabbableISO}T00:00:00`);
    let next: Date;

    switch (e.key) {
      case 'ArrowLeft': next = addDays(base, -1); break;
      case 'ArrowRight': next = addDays(base, 1); break;
      case 'ArrowUp': next = addDays(base, -7); break;
      case 'ArrowDown': next = addDays(base, 7); break;
      case 'Home': next = addDays(base, -base.getDay()); break;
      case 'End': next = addDays(base, 6 - base.getDay()); break;
      case 'PageUp': next = shiftMonth(base, -1); break;
      case 'PageDown': next = shiftMonth(base, 1); break;
      default: return;
    }

    e.preventDefault();
    restoreFocus.current = true;
    setFocusISO(toISODate(next));
    // Mover o foco não seleciona: quem navega escolhe com Enter/Espaço, como
    // em qualquer grade. Trocar o mês é necessário para o dia existir na tela.
    if (!sameMonth(next, first)) goToMonth(next);
  };

  const navButton =
    'flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary hover:shadow-sm active:scale-95 transition-all';

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-text-primary tracking-tight leading-none">
            {MONTH_NAMES[monthIndex]}{' '}
            <span className="text-text-soft font-semibold tabular-nums">{year}</span>
          </h2>
          {summary && <p className="text-xs text-text-secondary mt-1.5">{summary}</p>}
        </div>

        {/* As setas moram numa mesma pílula: lidas como um controle só, e não
            como dois botões soltos empurrados para o canto. */}
        <div className="flex shrink-0 items-center gap-1 rounded-xl bg-bg-secondary p-1">
          <button
            type="button"
            onClick={() => goToMonth(new Date(year, monthIndex - 1, 1))}
            aria-label="Mês anterior"
            className={navButton}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => goToMonth(new Date(year, monthIndex + 1, 1))}
            aria-label="Próximo mês"
            className={navButton}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label={`${MONTH_NAMES[monthIndex]} de ${year}`}
        onKeyDown={handleKeyDown}
        className="space-y-1 sm:space-y-1.5"
      >
        <div role="row" className={`${ROW} mb-1`}>
          {WEEK_DAYS.map(day => (
            <div
              key={day.short}
              role="columnheader"
              aria-label={day.full}
              className="text-center text-[11px] sm:text-xs font-bold text-text-secondary uppercase tracking-wide"
            >
              {day.short}
            </div>
          ))}
        </div>

        {weeks.map((week, w) => (
          <div role="row" className={ROW} key={w}>
            {week.map(date => {
              const iso = toISODate(date);
              const markers = markersFor(iso);
              const outside = !sameMonth(date, first);
              const isToday = iso === todayISO;
              const isSelected = iso === selectedISO;
              const hasAlert = markers.some(m => m.alert);
              const extra = markers.length - MAX_DOTS;

              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  data-iso={iso}
                  tabIndex={iso === tabbableISO ? 0 : -1}
                  onClick={() => handleSelect(date)}
                  // Clicar num dia também move o ponto de entrada do teclado
                  // para ele: sem isso, as setas continuariam de onde o teclado
                  // parou antes e o foco saltaria para outro canto da grade.
                  onFocus={() => setFocusISO(iso)}
                  aria-current={isToday ? 'date' : undefined}
                  aria-selected={isSelected}
                  aria-label={`${date.toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                  })}${isToday ? ', hoje' : ''}${
                    markers.length
                      ? `, ${markers.length} ${noun}${markers.length === 1 ? '' : 's'}`
                      : ''
                  }`}
                  className={`h-14 sm:h-16 px-1 pt-1.5 pb-1 rounded-xl border flex flex-col items-center justify-start gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-vibrant focus-visible:ring-offset-1 focus-visible:ring-offset-surface ${
                    isSelected
                      ? 'border-primary-vibrant bg-primary-light'
                      : hasAlert && !outside
                      ? 'border-danger/25 bg-danger/5 hover:bg-danger/10'
                      : 'border-transparent hover:bg-bg-secondary hover:border-border'
                  } ${outside ? 'opacity-40' : ''}`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm tabular-nums transition-colors ${
                      isToday
                        ? 'bg-primary-vibrant text-white font-bold'
                        : isSelected
                        ? 'text-primary-vibrant font-bold'
                        : outside
                        ? 'text-text-soft font-medium'
                        : 'text-text-primary font-medium'
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  {markers.length > 0 && (
                    <span className="flex items-center gap-0.5 leading-none">
                      {markers.slice(0, MAX_DOTS).map((m, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${m.alert ? 'bg-danger' : ''}`}
                          style={m.alert ? undefined : { backgroundColor: m.color }}
                        />
                      ))}
                      {extra > 0 && (
                        <span className="text-[10px] font-semibold text-text-secondary ml-0.5 tabular-nums">
                          +{extra}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {footer}
    </Card>
  );
};
