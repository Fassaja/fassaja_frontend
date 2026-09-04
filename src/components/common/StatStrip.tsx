import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { CountUp } from '@/components/common/CountUp';
import { WeekChange } from '@/hooks/useDashboardStats';

export interface Stat {
  label: string;
  value: number;
  /** Sufixo colado no número, como '%'. */
  suffix?: string;
  comparison?: WeekChange;
  /** Destaca o número quando ele pede ação — e só quando é maior que zero. */
  alert?: boolean;
}

interface StatStripProps {
  stats: Stat[];
  /** Substitui os números por traços enquanto os dados não chegaram. */
  loading?: boolean;
  /**
   * `plain` tira a caixa e apoia os números direto no fundo da página,
   * mantendo só os traços entre as colunas. É para telas que já se organizam
   * por regiões, onde mais uma borda seria mais uma caixa sem função.
   */
  variant?: 'card' | 'plain';
  className?: string;
}

/**
 * Faixa de números de uma área.
 *
 * Existe para substituir o padrão de "quatro cards iguais, cada um com ícone
 * colorido e número gigante", que estava no Dashboard e na Equipe. Eram quatro
 * caixas de peso visual idêntico competindo entre si e com o resto da página;
 * a informação é a mesma, mas em um bloco só ela lê como UM resumo, e sobra
 * hierarquia para o que de fato importa.
 *
 * `loading` mostra traços em vez de zeros: um "0 membros" enquanto a resposta
 * não chegou é uma informação FALSA, não um estado de carregamento.
 */
/**
 * Colunas por quantidade de itens. Mapa explícito, e não classe montada por
 * template: o Tailwind varre o código como TEXTO, então `grid-cols-${n}` nunca
 * chegaria a existir no CSS.
 */
const COLUNAS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
};

export const StatStrip: React.FC<StatStripProps> = ({
  stats,
  loading = false,
  variant = 'card',
  className = '',
}) => {
  const colunas = COLUNAS[stats.length] ?? 'grid-cols-2 sm:grid-cols-4';
  // Fora da caixa, as barras entre as colunas saem junto com ela: quatro
  // números já se leem como quatro números, e o filete entre eles só
  // acrescentava traço na parte da tela onde o olho passa mais vezes. Dentro
  // do cartão elas ficam, porque ali há uma moldura e o espaço é apertado.
  const grade =
    variant === 'plain'
      ? `grid ${colunas} gap-x-6 gap-y-5 ${className}`
      : `grid ${colunas} divide-x divide-y sm:divide-y-0 divide-border ${className}`;
  const celula = variant === 'plain' ? '' : 'px-4 py-3.5 sm:px-5';
  // Quantas colunas o COLUNAS acima produz em cada largura — precisa ser
  // sabido aqui para descobrir qual célula fecha cada fileira.
  const colsMobile = stats.length === 4 ? 2 : stats.length;

  /**
   * A célula que termina a fileira alinha o texto à direita.
   *
   * Sem isso a faixa fechava torta: os quatro rótulos começavam nas suas
   * colunas, mas "Atrasadas 4" é curto e parava uns 300px antes da borda
   * direita — a linha de números encostava na margem esquerda e morria no
   * meio do caminho do outro lado, enquanto tudo em volta (a faixa de
   * abertura, as linhas de tarefa) ia de ponta a ponta.
   *
   * Vale só para a última de cada fileira, e não para todas: alinhar os
   * quatro à direita afastaria cada número do seu próprio rótulo.
   *
   * E só na variante sem caixa. Dentro do cartão quem fecha a fileira é a
   * borda, então lá o alinhamento à direita seria um desencontro gratuito.
   */
  const fecharFileira = (i: number) =>
    variant !== 'plain'
      ? ''
      : `${(i + 1) % colsMobile === 0 ? 'text-right' : ''} ${
          i === stats.length - 1 ? 'sm:text-right' : 'sm:text-left'
        }`;
  // Os números são montados uma vez e o invólucro escolhido depois. Um
  // componente de invólucro declarado aqui dentro seria um TIPO NOVO a cada
  // render: o React remontaria as células, e a contagem animada recomeçaria
  // do zero a cada atualização da tela.
  const celulas = (
    <>
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`${celula} ${fecharFileira(i)}`}
        >
          <p className="text-xs font-medium text-text-secondary">{stat.label}</p>
          <p
            // `tabular-nums`: sem isso cada dígito tem largura própria e o
            // número TREME durante a contagem animada, empurrando o que está
            // ao lado. Numa faixa de quatro números lado a lado, isso é a
            // diferença entre um painel e um cartaz.
            className={`mt-1 text-2xl font-extrabold leading-none tracking-tight tabular-nums ${
              !loading && stat.alert && stat.value > 0 ? 'text-danger' : 'text-text-primary'
            }`}
          >
            {loading ? (
              <span className="text-text-soft">—</span>
            ) : (
              <CountUp value={stat.value} suffix={stat.suffix} />
            )}
          </p>
          {!loading && stat.comparison && stat.comparison.percent !== 0 && (
            <p
              className={`mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold ${
                stat.comparison.good ? 'text-success' : 'text-danger'
              }`}
            >
              {stat.comparison.percent > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {Math.abs(stat.comparison.percent)}%
              <span className="font-normal text-text-secondary ml-0.5">na semana</span>
            </p>
          )}
        </div>
      ))}
    </>
  );

  return variant === 'plain' ? (
    <div className={grade}>{celulas}</div>
  ) : (
    <Card padding="none" className={grade}>
      {celulas}
    </Card>
  );
};
