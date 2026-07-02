import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from './Input';

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type' | 'label'> & {
  label?: string;
};

/**
 * Input de senha com o alternador mostrar/ocultar (o "olhinho").
 * O label fica aqui fora para o botão do olho centralizar no campo,
 * não no conjunto label+campo.
 */
export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  className = '',
  ...props
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">{label}</label>
      )}
      <div className="relative">
        <Input type={visible ? 'text' : 'password'} className={`pr-11 ${className}`} {...props} />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-soft hover:text-text-secondary hover:bg-bg-secondary transition-colors"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
};
