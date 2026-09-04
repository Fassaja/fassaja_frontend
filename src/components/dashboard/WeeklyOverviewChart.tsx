import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Section } from '@/components/common/Section';
import { Dropdown } from '@/components/common/Dropdown';
import { useTaskHistory } from '@/hooks/useTaskHistory';
import { useChartTheme } from '@/utils/chartTheme';
import { diaISO, serieDaSemana, serieDoMes } from '@/utils/produtividade';

/**
 * O gráfico não recebe mais a lista de tarefas.
 *
 * Ele contava `completedAt` das tarefas vivas — e a faxina apaga as concluídas
 * depois de 4 dias. No modo "mês", as três primeiras semanas apareciam
 * zeradas: o gráfico afirmava que a pessoa não tinha feito nada. Agora vem do
 * histórico do servidor, uma linha por dia que não some.
 */
export const WeeklyOverviewChart: React.FC = () => {
  const chart = useChartTheme();
  const [period, setPeriod] = useState('week');

  /*
   * Uma busca só cobre os dois períodos: o mês corrente contém a semana em
   * curso, e recuar até a segunda-feira cobre a semana que começou no mês
   * passado. Alternar semana/mês não refaz a chamada.
   */
  const [de, ate] = useMemo(() => {
    const hoje = new Date();
    const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
    const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return [diaISO(segunda < primeiro ? segunda : primeiro), diaISO(ultimo)];
  }, []);
  const { porDia } = useTaskHistory(de, ate);

  const data = useMemo(
    () => (period === 'month' ? serieDoMes(porDia, new Date()) : serieDaSemana(porDia, new Date())),
    [porDia, period],
  );

  return (
    <Section
      title="Produtividade"
      className="h-full"
      action={
        <Dropdown
          options={[
            { value: 'week', label: 'Esta semana' },
            { value: 'month', label: 'Este mês' },
          ]}
          value={period}
          onChange={setPeriod}
          size="sm"
          menuAlign="right"
        />
      }
    >
      {/* Legenda ANTES do gráfico, encostada à esquerda, e não centralizada
          embaixo: quem chega no gráfico já sabe o que é cada linha em vez de
          descobrir depois de tentar adivinhar. Legenda centralizada no rodapé
          é o padrão de biblioteca, não de painel. */}
      <div className="-mt-2 mb-3 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
          <span className="h-2 w-2 rounded-full bg-primary-vibrant" /> Concluídas
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chart.muted }} /> Criadas
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="fillConcluidas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2477FF" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#2477FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={chart.grid} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chart.tick, fontSize: 11 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: chart.tick, fontSize: 11 }}
            allowDecimals={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: chart.cursor }}
            contentStyle={{
              borderRadius: 12,
              backgroundColor: chart.tooltipBg,
              border: `1px solid ${chart.tooltipBorder}`,
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              fontSize: 13,
            }}
            labelStyle={{ fontWeight: 700, color: chart.tooltipLabel }}
            formatter={(value: number, name: string) => [
              value,
              name === 'completed' ? 'Concluídas' : 'Criadas',
            ]}
          />
          <Area
            type="monotone"
            dataKey="created"
            stroke={chart.muted}
            strokeWidth={2.5}
            fill="transparent"
            dot={false}
            activeDot={{ r: 5, fill: chart.muted, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="completed"
            stroke="#2477FF"
            strokeWidth={3}
            fill="url(#fillConcluidas)"
            dot={false}
            activeDot={{ r: 6, fill: '#2477FF', stroke: chart.dotStroke, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Section>
  );
};
