import React from 'react';
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
import { useTasks } from '@/hooks/useTasks';
import { useDashboardStats } from '@/hooks/useDashboardStats';

const ReportsPage: React.FC = () => {
  const { tasks } = useTasks();
  const stats = useDashboardStats(tasks);

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

  // Data for line chart - weekly trend
  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
  const trendData = weekDays.map((day, index) => ({
    day,
    completed: Math.floor(Math.random() * 10) + index,
    created: Math.floor(Math.random() * 12) + index,
  }));

  const colors = ['#22C55E', '#FBBF24', '#F43F5E'];

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Relatórios
        </h1>
        <p className="text-text-secondary">
          Acompanhe suas estatísticas de produtividade
        </p>
      </div>

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
        <h3 className="text-lg font-bold text-text-primary mb-4">
          Tendência Semanal
        </h3>
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
    </AppLayout>
  );
};

export default ReportsPage;
