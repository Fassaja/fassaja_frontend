import React from 'react';
import { AlertCircle, Check, Info, Loader2 } from 'lucide-react';

/**
 * Peças visuais compartilhadas pelos painéis do assistente (Bob). Ficam juntas
 * porque os três fluxos — replanejar, distribuir e quebrar — têm exatamente a
 * mesma forma: pergunta → lista de sugestões marcáveis → aplicar.
 */

/** Caixa de aviso do painel. 'info' para dicas, 'warn' para erro/limite. */
export const Notice: React.FC<{ tone?: 'info' | 'warn'; children: React.ReactNode }> = ({
  tone = 'info',
  children,
}) => (
  <div
    className={`flex gap-2 rounded-xl border p-3 text-xs leading-relaxed ${
      tone === 'warn'
        ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300'
        : 'border-primary-light bg-primary-light/50 text-primary-dark'
    }`}
  >
    <span className="mt-0.5 shrink-0">
      {tone === 'warn' ? <AlertCircle size={14} /> : <Info size={14} />}
    </span>
    <div>{children}</div>
  </div>
);

/** Campo opcional de instruções livres ("evite sexta", "priorize o cliente X"). */
export const CommandField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}> = ({ value, onChange, placeholder, disabled }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
      Alguma preferência? <span className="font-normal">(opcional)</span>
    </span>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      maxLength={500}
      disabled={disabled}
      className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/70 focus:border-primary-vibrant focus:outline-none focus:ring-4 focus:ring-primary-light/60 disabled:opacity-50"
    />
  </label>
);

/**
 * Linha de sugestão marcável. O usuário aprova item a item — nenhuma ação do
 * assistente escreve no banco sem passar por aqui.
 */
export const SuggestionRow: React.FC<{
  checked: boolean;
  onToggle: () => void;
  title: string;
  detail: React.ReactNode;
  reason?: string;
  children?: React.ReactNode;
}> = ({ checked, onToggle, title, detail, reason, children }) => (
  <li>
    {/* role="checkbox" e não aria-pressed: a linha marca um item de uma lista
        múltipla, não liga/desliga um botão. É o que o leitor de tela anuncia. */}
    <button
      type="button"
      onClick={onToggle}
      role="checkbox"
      aria-checked={checked}
      className={`flex w-full gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-vibrant ${
        checked
          ? 'border-primary-vibrant/40 bg-primary-light/40'
          : 'border-border bg-surface hover:bg-bg-secondary'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          checked ? 'border-primary-vibrant bg-primary-vibrant text-white' : 'border-border bg-surface'
        }`}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        {/* line-clamp-2, não truncate: é a hora de decidir, e um título cortado
            em "Revisar a proposta do cliente Foc…" não dá para aprovar. */}
        <span className="line-clamp-2 text-sm font-semibold text-text-primary">{title}</span>
        <span className="mt-0.5 block text-xs text-text-secondary">{detail}</span>
        {reason && <span className="mt-1 block text-xs italic text-text-soft">“{reason}”</span>}
        {children}
      </span>
    </button>
  </li>
);

/**
 * Espera da chamada à IA (3 a 8 segundos). Um spinner dentro do botão deixa o
 * painel parado nesse tempo todo; o esqueleto mostra o formato do que vem.
 */
export const ThinkingState: React.FC<{ label: string; rows?: number }> = ({
  label,
  rows = 3,
}) => (
  <div className="space-y-3" role="status" aria-live="polite">
    <p className="flex items-center gap-2 text-sm text-text-secondary">
      <Loader2 size={15} className="animate-spin text-primary-vibrant" />
      {label}
    </p>
    <ul className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="flex gap-3 rounded-xl border border-border bg-surface p-3"
          // Escalona a pulsação para não piscar tudo em uníssono.
          style={{ animationDelay: `${i * 140}ms` }}
        >
          <span className="h-5 w-5 shrink-0 animate-pulse rounded-md bg-bg-secondary" />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="block h-3.5 w-3/4 animate-pulse rounded bg-bg-secondary" />
            <span className="block h-3 w-1/2 animate-pulse rounded bg-bg-secondary" />
          </span>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Aviso de recorte: a análise olhou só as N primeiras de M tarefas.
 * Sem isso o usuário recebe um resultado parcial achando que foi completo.
 */
export const CoverageNotice: React.FC<{
  coverage: { considered: number; total: number };
  noun: string;
}> = ({ coverage, noun }) =>
  coverage.total > coverage.considered ? (
    <Notice>
      Olhei as <strong>{coverage.considered} mais urgentes</strong> de {coverage.total} {noun}. As
      demais ficaram de fora desta rodada.
    </Notice>
  ) : null;

/** Cabeçalho de uma lista de sugestões, com atalho de marcar/desmarcar tudo. */
export const SelectionHeader: React.FC<{
  selected: number;
  total: number;
  onToggleAll: () => void;
}> = ({ selected, total, onToggleAll }) => (
  <div className="flex items-center justify-between px-1">
    <span className="text-xs font-semibold text-text-secondary">
      {selected} de {total} selecionadas
    </span>
    <button
      type="button"
      onClick={onToggleAll}
      className="text-xs font-semibold text-primary-vibrant hover:underline"
    >
      {selected === total ? 'Desmarcar tudo' : 'Marcar tudo'}
    </button>
  </div>
);

/**
 * Estado final de um fluxo: confirmação curta e as duas saídas possíveis —
 * repetir a mesma ação ou voltar ao menu do Bob.
 */
export const DoneState: React.FC<{
  message: string;
  onRestart: () => void;
  onHome: () => void;
}> = ({ message, onRestart, onHome }) => (
  <div className="flex flex-col items-center gap-3 py-6 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
      <Check size={24} strokeWidth={3} />
    </span>
    <p className="text-sm font-semibold text-text-primary">{message}</p>
    <div className="flex items-center gap-3 text-xs font-semibold">
      <button type="button" onClick={onRestart} className="text-primary-vibrant hover:underline">
        Repetir
      </button>
      <span className="text-border">|</span>
      <button type="button" onClick={onHome} className="text-primary-vibrant hover:underline">
        Voltar ao início
      </button>
    </div>
  </div>
);
