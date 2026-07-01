import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, GitBranch, Sparkles, Spade } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTour } from '@/components/onboarding/PageTour';
import { Card } from '@/components/common/Card';
import { Dropdown } from '@/components/common/Dropdown';
import { Mascot, MascotState } from '@/components/mascot/Mascot';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { EapView } from '@/components/reports/EapView';
import { XpView } from '@/components/reports/XpView';
import { PlanningPokerView } from '@/components/reports/PlanningPokerView';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';

type ReportView = 'overview' | 'eap' | 'xp' | 'poker';

const VIEWS: { value: ReportView; label: string; icon: React.ReactNode }[] = [
  { value: 'overview', label: 'Visão geral', icon: <BarChart3 size={16} /> },
  { value: 'eap', label: 'EAP', icon: <GitBranch size={16} /> },
  { value: 'xp', label: 'XP', icon: <Sparkles size={16} /> },
  { value: 'poker', label: 'Planning Poker', icon: <Spade size={16} /> },
];

// Estilo compartilhado dos gráficos (eixos limpos + tooltip da marca).
const AXIS_PROPS = { tickLine: false, axisLine: false, tick: { fontSize: 12, fill: '#64748B' } } as const;
const GRID_COLOR = '#E3EAF3';
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid #E3EAF3',
  boxShadow: '0 4px 12px -2px rgba(6,27,73,0.12)',
  fontSize: 13,
} as const;
const PRIORITY_COLORS = ['#22C55E', '#FBBF24', '#8B5CF6'];

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
  const { projects } = useProjects();
  const showSkeleton = useDeferredLoading(loading);
  const stats = useDashboardStats(tasks);
  const [period, setPeriod] = useState('week');
  const [view, setView] = useState<ReportView>('overview');

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

  const priorityTotal = priorityData.reduce((s, d) => s + d.value, 0);

  // Tarefas por tag (corte transversal aos projetos) — top 10 por volume.
  const tagData = useMemo(() => {
    const map = new Map<string, { name: string; color: string; value: number }>();
    tasks.forEach(t =>
      (t.tags ?? []).forEach(tag => {
        const cur = map.get(tag.id);
        if (cur) cur.value += 1;
        else map.set(tag.id, { name: tag.name, color: tag.color, value: 1 });
      }),
    );
    return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 10);
  }, [tasks]);

  return (
    <AppLayout title="Relatórios" subtitle="Acompanhe suas estatísticas de produtividade.">
      <PageTour id="reports" />
      {loading ? (showSkeleton ? <LoadingScreen /> : null) : <>
      {/* Resumo com mascote + estatísticas — só na Visão geral */}
      {view === 'overview' && (
      <>
      <Card className="flex flex-col sm:flex-row items-center gap-6 mb-8">
        <Mascot state={summary.state} size="md" animate={true} />
        <div className="text-center sm:text-left">
          <h3 className="text-xl font-bold text-text-primary mb-1">
            {summary.title}
          </h3>
          <p className="text-text-secondary">{summary.message}</p>
        </div>
      </Card>

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
      </>
      )}

      {/* Seletor de visões */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {VIEWS.map(v => {
          const active = view === v.value;
          return (
            <button
              key={v.value}
              onClick={() => setView(v.value)}
              aria-pressed={active}
              className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97] ${
                active
                  ? 'border-transparent bg-primary-vibrant text-white shadow-sm'
                  : 'bg-white border-border text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              {v.icon}
              {v.label}
            </button>
          );
        })}
      </div>

      {view === 'eap' && <EapView tasks={tasks} projects={projects} />}
      {view === 'xp' && <XpView tasks={tasks} />}
      {view === 'poker' && <PlanningPokerView tasks={tasks} />}

      {view === 'overview' && (
      stats.total === 0 ? (
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status Distribution */}
        <Card>
          <h3 className="text-lg font-bold text-text-primary mb-1">Tarefas por status</h3>
          <p className="text-sm text-text-secondary mb-4">Quantas tarefas há em cada etapa.</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statusData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID_COLOR} />
              <XAxis dataKey="name" {...AXIS_PROPS} />
              <YAxis allowDecimals={false} {...AXIS_PROPS} />
              <Tooltip
                cursor={{ fill: 'rgba(36,119,255,0.06)' }}
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number) => [value, 'Tarefas']}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={64}>
                <LabelList
                  dataKey="value"
                  position="top"
                  style={{ fill: '#0F172A', fontSize: 13, fontWeight: 700 }}
                />
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <h3 className="text-lg font-bold text-text-primary mb-1">Tarefas por prioridade</h3>
          <p className="text-sm text-text-secondary mb-4">Como seu esforço está distribuído.</p>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  cornerRadius={6}
                  dataKey="value"
                  stroke="none"
                >
                  {priorityData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [value, 'Tarefas']} />
              </PieChart>
            </ResponsiveContainer>
            {/* Total no centro da rosca */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-extrabold text-text-primary leading-none">{priorityTotal}</span>
              <span className="text-xs text-text-secondary">tarefas</span>
            </div>
          </div>
          <div className="flex justify-center flex-wrap gap-x-5 gap-y-2 mt-4">
            {priorityData.map((d, i) => (
              <span key={d.name} className="inline-flex items-center gap-1.5 text-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[i] }} />
                <span className="text-text-secondary">{d.name}</span>
                <span className="font-bold text-text-primary">{d.value}</span>
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Tasks by tag — corte transversal aos projetos */}
      {tagData.length > 0 && (
      <Card className="mb-6">
        <h3 className="text-lg font-bold text-text-primary mb-1">Tarefas por tag</h3>
        <p className="text-sm text-text-secondary mb-4">Seu esforço por área — atravessa todos os projetos.</p>
        <ResponsiveContainer width="100%" height={Math.max(160, tagData.length * 48)}>
          <BarChart
            layout="vertical"
            data={tagData}
            margin={{ top: 4, right: 28, left: 8, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
            <XAxis type="number" allowDecimals={false} {...AXIS_PROPS} />
            <YAxis type="category" dataKey="name" width={100} {...AXIS_PROPS} />
            <Tooltip
              cursor={{ fill: 'rgba(36,119,255,0.06)' }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: number) => [value, 'Tarefas']}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28}>
              <LabelList
                dataKey="value"
                position="right"
                style={{ fill: '#0F172A', fontSize: 13, fontWeight: 700 }}
              />
              {tagData.map((entry, index) => (
                <Cell key={`tag-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
      )}

      {/* Trend Chart */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-1">
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
        <p className="text-sm text-text-secondary mb-4">Tarefas criadas e concluídas ao longo do tempo.</p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2477FF" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#2477FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis dataKey="day" {...AXIS_PROPS} />
            <YAxis allowDecimals={false} {...AXIS_PROPS} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area
              type="monotone"
              dataKey="completed"
              name="Concluídas"
              stroke="#22C55E"
              strokeWidth={2.5}
              fill="url(#gradCompleted)"
            />
            <Area
              type="monotone"
              dataKey="created"
              name="Criadas"
              stroke="#2477FF"
              strokeWidth={2.5}
              fill="url(#gradCreated)"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-5 mt-3 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-success" /> <span className="text-text-secondary">Concluídas</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-primary-vibrant" /> <span className="text-text-secondary">Criadas</span>
          </span>
        </div>
      </Card>
      </>
      )
      )}
      </>}
    </AppLayout>
  );
};

export default ReportsPage;
