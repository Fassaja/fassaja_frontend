import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Dropdown } from '@/components/common/Dropdown';
import { Mascot, MascotState } from '@/components/mascot/Mascot';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useTasks } from '@/hooks/useTasks';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';

const WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const ReportsPage: React.FC = () => {
  const { tasks, loading } = useTasks();
  const showSkeleton = useDeferredLoading(loading);
  const stats = useDashboardStats(tasks);
  const [period, setPeriod] = useState('week');

  // Resumo com o bob conforme o desempenho geral.
  const getSummary = (): { state: MascotState; title: string; message: string } => {
    if (stats.total === 0) {
      return {
        state: 'confused',
        title: 'Ainda não há dados',
        message: 'Crie e conclua tarefas para ver seus relatórios ganharem vida.',
      };
    }
    if (stats.overdue >= 3 || stats.overdue > stats.completed) {
      return {
        state: 'sad',
        title: 'Atenção às atrasadas',
        message: `Você tem ${stats.overdue} tarefa(s) atrasada(s). Que tal priorizá-las hoje?`,
      };
    }
    if (stats.completionRate >= 75) {
      return {
        state: 'strong',
        title: 'Você está voando! 💪',
        message: `${stats.completionRate}% de conclusão. Produtividade nota dez!`,
      };
    }
    return {
      state: 'happy',
      title: 'No caminho certo',
      message: `${stats.completed} de ${stats.total} tarefas concluídas. Continue assim!`,
    };
  };

  const summary = getSummary();

  // Data for bar chart - tasks by status
  const statusData = [
    { name: 'Pendente', value: stats.pending, fill: '#2477FF' },
    { name: 'Em Progresso', value: stats.inProgress, fill: '#FBBF24' },
    { name: 'Concluída', value: stats.completed, fill: '#22C55E' },
    { name: 'Atrasada', value: stats.overdue, fill: '#F43F5E' },
  ];

  // Data for pie chart - priority distribution
  const priorityData = [
    {
      name: 'Baixa',
      value: tasks.filter(t => t.priority === 'low').length,
    },
    {
      name: 'Média',
      value: tasks.filter(t => t.priority === 'medium').length,
    },
    {
      name: 'Alta',
      value: tasks.filter(t => t.priority === 'high').length,
    },
  ];

  // Tendência por datas reais do período (semana atual ou mês atual).
  const trendData = useMemo(() => {
    const now = new Date();
    if (period === 'month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const weeks = Math.ceil(new Date(year, month + 1, 0).getDate() / 7);
      const buckets = Array.from({ length: weeks }, (_, i) => ({
        day: `Sem ${i + 1}`,
        created: 0,
        completed: 0,
      }));
      const inMonth = (d: Date) => d.getFullYear() === year && d.getMonth() === month;
      tasks.forEach(t => {
        const c = new Date(t.createdAt);
        if (inMonth(c)) buckets[Math.floor((c.getDate() - 1) / 7)].created += 1;
        if (t.completedAt) {
          const d = new Date(t.completedAt);
          if (inMonth(d)) buckets[Math.floor((d.getDate() - 1) / 7)].completed += 1;
        }
      });
      return buckets;
    }
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return WEEK_LABELS.map((label, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      let created = 0;
      let completed = 0;
      tasks.forEach(t => {
        if (sameDay(new Date(t.createdAt), day)) created += 1;
        if (t.completedAt && sameDay(new Date(t.completedAt), day)) completed += 1;
      });
      return { day: label, created, completed };
    });
  }, [tasks, period]);

  // Baixa, Média, Alta (mesma paleta de prioridade do app).
  const colors = ['#22C55E', '#FBBF24', '#8B5CF6'];

  return (
    <AppLayout title="Relatórios" subtitle="Acompanhe suas estatísticas de produtividade.">
      {loading ? (showSkeleton ? <LoadingScreen /> : null) : <>
      {/* Resumo com mascote */}
      <Card className="flex flex-col sm:flex-row items-center gap-6 mb-8">
        <Mascot state={summary.state} size="md" animate={true} />
        <div className="text-center sm:text-left">
          <h3 className="text-xl font-bold text-text-primary mb-1">
            {summary.title}
          </h3>
          <p className="text-text-secondary">{summary.message}</p>
        </div>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="text-center py-4">
          <p className="text-3xl font-bold text-text-primary">{stats.total}</p>
          <p className="text-sm text-text-secondary">Total de Tarefas</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-3xl font-bold text-green-500">{stats.completed}</p>
          <p className="text-sm text-text-secondary">Concluídas</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-3xl font-bold text-primary-vibrant">{stats.completionRate}%</p>
          <p className="text-sm text-text-secondary">Taxa de Conclusão</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-3xl font-bold text-yellow-500">{stats.inProgress}</p>
          <p className="text-sm text-text-secondary">Em Andamento</p>
        </Card>
      </div>

      {stats.total === 0 ? (
        <Card className="flex flex-col items-center text-center py-12">
          <Mascot state="confused" size="md" animate />
          <p className="text-text-primary font-semibold mt-3">Sem dados ainda</p>
          <p className="text-text-secondary text-sm max-w-sm">
            Assim que você criar e concluir tarefas, seus gráficos de produtividade aparecem aqui.
          </p>
        </Card>
      ) : (
      <>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Status Distribution */}
        <Card>
          <h3 className="text-lg font-bold text-text-primary mb-4">
            Tarefas por Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" />
              <XAxis dataKey="name" stroke="#667085" />
              <YAxis stroke="#667085" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E5EAF2',
                }}
              />
              <Bar dataKey="value" fill="#2477FF" radius={[8, 8, 0, 0]}>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <h3 className="text-lg font-bold text-text-primary mb-4">
            Tarefas por Prioridade
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#2477FF"
                dataKey="value"
              >
                {priorityData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text-primary">Tendência</h3>
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
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" />
            <XAxis dataKey="day" stroke="#667085" />
            <YAxis stroke="#667085" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5EAF2',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#22C55E"
              name="Concluídas"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="created"
              stroke="#2477FF"
              name="Criadas"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      </>
      )}
      </>}
    </AppLayout>
  );
};

export default ReportsPage;
