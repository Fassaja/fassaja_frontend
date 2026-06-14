import React from 'react';
import { Dropdown, DropdownOption } from './Dropdown';

interface SelectProps {
  label?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  menuAlign?: 'left' | 'right';
  fullWidth?: boolean;
}

/**
 * Select padrão do Fassaja. Renderiza o Dropdown estilizado (não o <select>
 * nativo), então qualquer novo uso já vem com o visual da marca.
 */
export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  menuAlign,
  fullWidth = true,
}) => {
  return (
    <div className="w-full">
      <Dropdown
        label={label}
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        menuAlign={menuAlign}
        fullWidth={fullWidth}
      />
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-text-secondary">{helperText}</p>
      ) : null}
    </div>
  );
};
