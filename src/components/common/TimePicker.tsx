import React, { useMemo } from 'react';
import { Dropdown } from './Dropdown';

interface TimePickerProps {
  label?: string;
  value: string; // 'HH:MM' ou ''
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Passo entre as opções, em minutos (padrão 15). */
  stepMinutes?: number;
  placeholder?: string;
  menuAlign?: 'left' | 'right';
  /** `sm` vira um chip do tamanho do conteúdo, para a linha "quando". */
  size?: 'sm' | 'md';
}

/**
 * Seletor de horário reaproveitando o Dropdown do design system. Gera opções
 * de 'HH:MM' em incrementos de `stepMinutes`. Se o valor atual não cair no
 * passo (ex.: vindo de outro lugar), ele é incluído para continuar visível.
 */
export const TimePicker: React.FC<TimePickerProps> = ({
  label,
  value,
  onChange,
  disabled,
  stepMinutes = 15,
  placeholder = '--:--',
  menuAlign,
  size = 'md',
}) => {
  const options = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let m = 0; m < 24 * 60; m += stepMinutes) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const t = `${hh}:${mm}`;
      opts.push({ value: t, label: t });
    }
    if (value && !opts.some(o => o.value === value)) {
      opts.push({ value, label: value });
      opts.sort((a, b) => a.value.localeCompare(b.value));
    }
    return opts;
  }, [stepMinutes, value]);

  return (
    <Dropdown
      label={label}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      menuAlign={menuAlign}
      size={size}
      fullWidth={size !== 'sm'}
    />
  );
};
