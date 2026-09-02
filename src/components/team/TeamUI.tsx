import React from 'react';
import { Crown, Shield, ShieldCheck, User } from 'lucide-react';
import { TeamRole } from '@/types/team';
import { ROLE_LABEL } from '@/utils/teamPermissions';

/**
 * As peças visuais da área de equipe.
 *
 * Todas partem da mesma decisão: a informação fica DIRETO no fundo da página,
 * separada por réguas e por espaço, não dentro de caixas. A versão anterior
 * empilhava cartão dentro de cartão — três bordas arredondadas entre o olho e
 * o número —, e o resultado lia como um painel de aplicativo, não como uma
 * ferramenta de trabalho. Aqui só ganha borda o que precisa ser clicado ou o
 * que interrompe a leitura de propósito (um aviso, uma zona de risco).
 */

/** Título de seção: pequeno, discreto e sempre sobre uma régua. */
export const SectionTitle: React.FC<{
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ children, action, className = '' }) => (
  <div
    className={`mb-4 flex items-end justify-between gap-3 border-b border-border pb-2 ${className}`}
  >
    <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-soft">{children}</h2>
    {action}
  </div>
);

const ROLE_STYLE: Record<TeamRole, { icon: React.ElementType; cls: string }> = {
  owner: { icon: Crown, cls: 'text-amber-600 bg-amber-500/10 dark:text-amber-300' },
  admin: { icon: Shield, cls: 'text-violet-600 bg-violet-500/10 dark:text-violet-300' },
  manager: { icon: ShieldCheck, cls: 'text-primary-vibrant bg-primary-light' },
  member: { icon: User, cls: 'text-text-secondary bg-bg-secondary' },
};

/**
 * O papel de alguém, sempre com a palavra escrita.
 *
 * Antes a hierarquia aparecia como um ícone solto (uma coroa, um escudo) sem
 * legenda em lugar nenhum: quem recebia poder não descobria que o tinha, e
 * quem olhava a lista não sabia o que o escudo significava.
 */
export const RoleBadge: React.FC<{ role: TeamRole; className?: string }> = ({
  role,
  className = '',
}) => {
  const { icon: Icon, cls } = ROLE_STYLE[role];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${cls} ${className}`}
    >
      <Icon size={11} />
      {ROLE_LABEL[role]}
    </span>
  );
};

export interface TeamNumber {
  label: string;
  value: number | string;
  /** Pinta de vermelho quando é maior que zero — número que pede ação. */
  alert?: boolean;
  hint?: string;
}

/**
 * Os números da equipe, como faixa tipográfica.
 *
 * Sem caixa e sem ícone colorido: quatro cartões de peso visual idêntico
 * competiam entre si e com a lista de pessoas logo abaixo. Aqui o contraste
 * vem do tamanho do número contra o rótulo, que é o que a leitura já usa.
 */
export const TeamNumbers: React.FC<{ items: TeamNumber[]; loading?: boolean }> = ({
  items,
  loading = false,
}) => (
  <div className="grid grid-cols-2 gap-y-5 border-y border-border py-5 sm:grid-cols-4 sm:gap-y-0 sm:divide-x sm:divide-border">
    {items.map(item => (
      <div key={item.label} className="px-0 sm:px-5 sm:first:pl-0" title={item.hint}>
        <p
          className={`text-3xl font-extrabold leading-none tracking-tight tabular-nums ${
            !loading && item.alert && Number(item.value) > 0 ? 'text-danger' : 'text-text-primary'
          }`}
        >
          {loading ? <span className="text-text-soft">—</span> : item.value}
        </p>
        <p className="mt-1.5 text-xs font-medium text-text-secondary">{item.label}</p>
      </div>
    ))}
  </div>
);

/**
 * Estado vazio de uma seção: uma frase e, quando existe, o próximo passo.
 * Discreto de propósito — vazio não é erro e não deve chamar mais atenção que
 * o conteúdo das seções ao lado.
 */
export const SectionEmpty: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({
  children,
  action,
}) => (
  <div className="py-8 text-center">
    <p className="text-sm text-text-secondary">{children}</p>
    {action && <div className="mt-3 flex justify-center">{action}</div>}
  </div>
);
