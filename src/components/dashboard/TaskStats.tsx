import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { CountUp } from '@/components/common/CountUp';
import { WeekChange } from '@/hooks/useDashboardStats';

interface Stat {
  label: string;
  value: number;
  comparison?: WeekChange;
  /** Destaca o número quando ele pede ação (só as atrasadas, e só se houver). */
  alert?: boolean;
}

interface TaskStatsProps {
  stats: Stat[];
}

/**
 * Faixa de resumo das tarefas.
 *
 * Substitui os quatro cards separados que existiam aqui — ícone colorido,
 * número gigante e "vs semana passada" repetidos quatro vezes. Eram quatro
 * caixas de peso visual idêntico competindo entre si e com o resto da página;
 * a informação é a mesma, mas em um único bloco ela lê como UM resumo, e
 * sobra hierarquia para o que de fato importa (o foco do dia e as próximas
 * tarefas).
 */
export const TaskStats: React.FC<TaskStatsProps> = ({ stats }) => {
  return (
    <Card padding="none" className="mb-6 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
      {stats.map(stat => (
        <div key={stat.label} className="px-4 py-3.5 sm:px-5">
          <p className="text-xs font-medium text-text-secondary">{stat.label}</p>
          <p
            className={`mt-1 text-2xl font-extrabold leading-none tracking-tight ${
              stat.alert && stat.value > 0 ? 'text-danger' : 'text-text-primary'
            }`}
          >
            <CountUp value={stat.value} />
          </p>
          {stat.comparison && stat.comparison.percent !== 0 && (
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
