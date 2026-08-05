import React from 'react';
import { AlertCircle, Check, Info } from 'lucide-react';

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
        ? 'border-amber-200 bg-amber-50 text-amber-900'
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
      className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/70 focus:border-primary-vibrant focus:outline-none focus:ring-4 focus:ring-primary-light/60 disabled:opacity-50"
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
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex w-full gap-3 rounded-xl border p-3 text-left transition-colors ${
        checked
          ? 'border-primary-vibrant/40 bg-primary-light/40'
          : 'border-border bg-white hover:bg-bg-secondary'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          checked ? 'border-primary-vibrant bg-primary-vibrant text-white' : 'border-border bg-white'
        }`}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">{title}</span>
        <span className="mt-0.5 block text-xs text-text-secondary">{detail}</span>
        {reason && <span className="mt-1 block text-xs italic text-text-soft">“{reason}”</span>}
        {children}
      </span>
    </button>
  </li>
);

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
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
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
