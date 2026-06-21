import React, { useMemo, useState } from 'react';
import { ChevronRight, FolderOpen, Inbox } from 'lucide-react';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { Card } from '@/components/common/Card';

interface EapViewProps {
  tasks: Task[];
  projects: Project[];
}

const STATUS_DOT: Record<Task['status'], string> = {
  pending: '#64748B',
  in_progress: '#2477FF',
  completed: '#22C55E',
  overdue: '#F43F5E',
};

const STATUS_LABEL: Record<Task['status'], string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  overdue: 'Atrasada',
};

interface Branch {
  id: string;
  name: string;
  color: string;
  tasks: Task[];
}

export const EapView: React.FC<EapViewProps> = ({ tasks, projects }) => {
  const branches = useMemo<Branch[]>(() => {
    const byProject = projects.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      tasks: tasks.filter(t => t.projectId === p.id),
    }));
    const orphan = tasks.filter(t => !t.projectId || !projects.some(p => p.id === t.projectId));
    if (orphan.length > 0) {
      byProject.push({ id: '__none__', name: 'Sem projeto', color: '#94A3B8', tasks: orphan });
    }
    return byProject.filter(b => b.tasks.length > 0);
  }, [tasks, projects]);

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => open[id] !== false; // aberto por padrão
  const toggle = (id: string) => setOpen(prev => ({ ...prev, [id]: !isOpen(id) }));

  if (branches.length === 0) {
    return (
      <Card className="flex flex-col items-center text-center py-12">
        <Inbox size={36} className="text-text-soft" />
        <p className="text-text-primary font-semibold mt-3">Nada para decompor ainda</p>
        <p className="text-text-secondary text-sm max-w-sm">
          A EAP organiza cada projeto e suas tarefas em árvore. Crie tarefas dentro de projetos
          para vê-la aqui.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        A <strong className="text-text-primary">EAP (Estrutura Analítica do Projeto)</strong> quebra
        cada projeto em suas tarefas, mostrando o quanto já foi entregue.
      </p>

      {branches.map(branch => {
        const done = branch.tasks.filter(t => t.status === 'completed').length;
        const total = branch.tasks.length;
        const pct = Math.round((done / total) * 100);
        const expanded = isOpen(branch.id);

        return (
          <Card key={branch.id} padding="none" className="overflow-hidden">
            <button
              onClick={() => toggle(branch.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-bg-secondary transition-colors text-left"
              aria-expanded={expanded}
            >
              <ChevronRight
                size={18}
                className={`text-text-soft shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: branch.color + '1A', color: branch.color }}
              >
                <FolderOpen size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text-primary truncate">{branch.name}</p>
                <p className="text-xs text-text-secondary">
                  {done} de {total} concluída{total === 1 ? '' : 's'} · {pct}%
                </p>
              </div>
              <div className="w-24 shrink-0 hidden sm:block">
                <div className="h-2 rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: branch.color }}
                  />
                </div>
              </div>
            </button>

            {expanded && (
              <ul className="border-t border-border divide-y divide-border">
                {branch.tasks.map(task => (
                  <li key={task.id} className="flex items-center gap-3 pl-12 pr-4 py-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: STATUS_DOT[task.status] }}
                    />
                    <span
                      className={`flex-1 min-w-0 text-sm truncate ${
                        task.status === 'completed' ? 'line-through text-text-soft' : 'text-text-primary'
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="text-xs font-medium text-text-secondary shrink-0">
                      {STATUS_LABEL[task.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
};
