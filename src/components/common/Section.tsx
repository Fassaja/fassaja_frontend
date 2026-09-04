import React from 'react';

interface SectionProps {
  /** Rótulo da região. Vira <h2> — o <h1> é o título da página. */
  title: string;
  /** Uma linha de contexto, quando o título sozinho não basta. */
  description?: string;
  /** Controle à direita do título (filtro, link, botão). */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Região de conteúdo apoiada no FUNDO da página, sem caixa em volta.
 *
 * Existe para substituir o hábito de embrulhar cada bloco em `<Card>`. Quando
 * tudo é um cartão com a mesma borda, a mesma sombra e o mesmo raio, tudo tem
 * o mesmo peso visual: a tela vira uma grade de caixas iguais e não sobra
 * hierarquia para dizer o que a pessoa deve olhar primeiro.
 *
 * A separação aqui é feita por TIPOGRAFIA e ESPAÇO — um rótulo miúdo em caixa
 * alta e um respiro maior entre regiões — que é como um painel de verdade se
 * organiza. Quem separa as regiões é a página, com uma linha no invólucro da
 * fileira; a seção só entrega o cabeçalho e o conteúdo, para que duas delas
 * lado a lado dividam a mesma linha em vez de desenhar duas.
 */
export const Section: React.FC<SectionProps> = ({
  title,
  description,
  action,
  children,
  className = '',
}) => (
  <section className={className}>
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-xs font-bold uppercase tracking-wide text-text-soft">{title}</h2>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    {children}
  </section>
);
