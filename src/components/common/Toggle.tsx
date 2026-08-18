import React from 'react';

/**
 * Interruptor de preferência.
 *
 * Vivia dentro da SettingsPage; virou componente comum quando a seção de
 * lembrete passou a precisar do mesmo controle. Duas cópias divergem, e a
 * primeira a divergir é sempre a que ninguém está olhando.
 *
 * O visual é exatamente o que já estava em uso — mudar a aparência dos
 * interruptores existentes não fazia parte do pedido.
 */
export const Toggle: React.FC<{
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 disabled:opacity-60 ${
      checked ? 'bg-primary-vibrant' : 'bg-primary-dark/20'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);
