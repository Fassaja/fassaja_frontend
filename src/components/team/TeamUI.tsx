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
  <div className="grid grid-cols-2 divide-x divide-y divide-border rounded-2xl border border-border bg-surface sm:grid-cols-4 sm:divide-y-0">
    {items.map(item => (
      <div key={item.label} className="px-5 py-4" title={item.hint}>
        <p
          className={`text-3xl font-extrabold leading-none tracking-tight tabular-nums ${
            !loading && item.alert && Number(item.value) > 0 ? 'text-danger' : 'text-text-primary'
          }`}
        >
          {loading ? <span className="text-text-soft">—</span> : item.value}
        </p>
        <p className="mt-2 text-xs font-medium text-text-secondary">{item.label}</p>
      </div>
    ))}
  </div>
);

/**
 * Painel de conteúdo: uma superfície, um título e o que vive dentro dela.
 *
 * É a ÚNICA caixa da área, e por isso ela não se aninha: um painel nunca entra
 * dentro de outro. O que separa as coisas lá dentro são réguas e espaço — foi
 * o cartão dentro de cartão dentro de cartão que fazia a tela anterior parecer
 * um painel de aplicativo em vez de uma ferramenta de trabalho.
 */
export const Panel: React.FC<{
  title: string;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, action, footer, className = '', children }) => (
  <section
    className={`flex flex-col rounded-2xl border border-border bg-surface ${className}`}
  >
    <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-soft">{title}</h2>
      {action}
    </header>
    <div className="min-w-0 flex-1 px-5 pb-5">{children}</div>
    {footer && <div className="border-t border-border p-3">{footer}</div>}
  </section>
);

/** Link discreto do canto do painel ("Ver todos"). */
export const PanelLink: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-vibrant transition-colors hover:text-primary-hover"
  >
    {children}
  </button>
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
