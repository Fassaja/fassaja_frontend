import React, { useMemo } from 'react';
import { Star, Flame, Trophy, Zap, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { Task } from '@/types/task';
import { Card } from '@/components/common/Card';
import { useUser, computeStreak } from '@/contexts/UserContext';
import { computeXp, XP_PER_LEVEL } from '@/utils/xp';

interface XpViewProps {
  tasks: Task[];
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const XpView: React.FC<XpViewProps> = ({ tasks }) => {
  const { user } = useUser();

  const data = useMemo(() => {
    const base = computeXp(tasks);
    const activeDays = new Set<string>(user.productiveDays);
    tasks.forEach(t => {
      if (t.status === 'completed' && t.completedAt) activeDays.add(isoOf(new Date(t.completedAt)));
    });
    const streak = computeStreak(Array.from(activeDays));
    const overdue = tasks.filter(t => t.status === 'overdue').length;
    return { ...base, streak, overdue };
  }, [tasks, user.productiveDays]);

  const achievements = [
    {
      icon: <CheckCircle2 size={18} />,
      title: 'Primeiros passos',
      desc: 'Conclua sua primeira tarefa',
      unlocked: data.completedCount >= 1,
    },
    {
      icon: <Zap size={18} />,
      title: 'Pegando ritmo',
      desc: 'Conclua 10 tarefas',
      unlocked: data.completedCount >= 10,
    },
    {
      icon: <Trophy size={18} />,
      title: 'Imparável',
      desc: 'Conclua 50 tarefas',
      unlocked: data.completedCount >= 50,
    },
    {
      icon: <Flame size={18} />,
      title: 'Em chamas',
      desc: '3 dias seguidos produtivo',
      unlocked: data.streak >= 3,
    },
    {
      icon: <Flame size={18} />,
      title: 'Semana cheia',
      desc: '7 dias seguidos produtivo',
      unlocked: data.streak >= 7,
    },
    {
      icon: <ShieldCheck size={18} />,
      title: 'Faxina em dia',
      desc: 'Nenhuma tarefa atrasada',
      unlocked: data.completedCount > 0 && data.overdue === 0,
    },
  ];
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="space-y-6">
      {/* Nível + XP */}
      <Card className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-vibrant to-primary-dark flex flex-col items-center justify-center text-white shadow-md">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Nível</span>
            <span className="text-3xl font-extrabold leading-none">{data.level}</span>
          </div>
          <span className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-sm">
            <Star size={18} fill="currentColor" />
          </span>
        </div>

        <div className="flex-1 w-full text-center sm:text-left">
          <p className="text-text-secondary text-sm">Seus pontos de experiência</p>
          <p className="text-3xl font-extrabold text-text-primary">{data.xp} XP</p>
          <div className="mt-3">
            <div className="flex justify-between text-xs font-semibold text-text-secondary mb-1">
              <span>Progresso para o nível {data.level + 1}</span>
              <span>{data.intoLevel}/{XP_PER_LEVEL} XP</span>
            </div>
            <div className="h-2.5 rounded-full bg-bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-vibrant to-turquoise transition-all"
                style={{ width: `${data.pctToNext}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Como ganha XP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-text-primary">{data.completedCount}</p>
          <p className="text-xs text-text-secondary">Tarefas concluídas</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-amber-500 inline-flex items-center gap-1 justify-center">
            <Flame size={20} /> {data.streak}
          </p>
          <p className="text-xs text-text-secondary">Dias em sequência</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-emerald-500">{unlockedCount}/{achievements.length}</p>
          <p className="text-xs text-text-secondary">Conquistas</p>
        </Card>
        <Card className="text-center py-4">
          <p className="text-2xl font-bold text-primary-vibrant">{data.level}</p>
          <p className="text-xs text-text-secondary">Nível atual</p>
        </Card>
      </div>

      <p className="text-xs text-text-secondary px-1">
        Você ganha <strong className="text-text-primary">+10 XP</strong> por tarefa de prioridade
        baixa, <strong className="text-text-primary">+20</strong> média e{' '}
        <strong className="text-text-primary">+30</strong> alta. A cada {XP_PER_LEVEL} XP, sobe de nível.
      </p>

      {/* Conquistas */}
      <div>
        <h3 className="text-lg font-bold text-text-primary mb-3">Conquistas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {achievements.map(a => (
            <Card
              key={a.title}
              padding="sm"
              className={`flex items-center gap-3 ${a.unlocked ? '' : 'opacity-60'}`}
            >
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  a.unlocked ? 'bg-amber-50 text-amber-500' : 'bg-bg-secondary text-text-soft'
                }`}
              >
                {a.unlocked ? a.icon : <Lock size={18} />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{a.title}</p>
                <p className="text-xs text-text-secondary">{a.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
