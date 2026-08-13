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
export const StatStrip: React.FC<StatStripProps> = ({ stats, loading = false, className = '' }) => {
  return (
    <Card
      padding="none"
      className={`grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border ${className}`}
    >
      {stats.map(stat => (
        <div key={stat.label} className="px-4 py-3.5 sm:px-5">
          <p className="text-xs font-medium text-text-secondary">{stat.label}</p>
          <p
            className={`mt-1 text-2xl font-extrabold leading-none tracking-tight ${
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
    </Card>
  );
};
