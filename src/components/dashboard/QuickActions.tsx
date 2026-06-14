import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderPlus, BarChart3, Calendar } from 'lucide-react';
import { Card } from '@/components/common/Card';

interface QuickActionsProps {
  onNewTask?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNewTask }) => {
  const navigate = useNavigate();

  const actions = [
    { icon: Plus, label: 'Nova Tarefa', color: '#2477FF', onClick: () => onNewTask?.() },
    { icon: FolderPlus, label: 'Novo Projeto', color: '#22C55E', onClick: () => navigate('/projects') },
    { icon: BarChart3, label: 'Ver Relatórios', color: '#8B5CF6', onClick: () => navigate('/reports') },
    { icon: Calendar, label: 'Calendário', color: '#FB7185', onClick: () => navigate('/calendar') },
  ];

  return (
    <Card className="h-full">
      <h3 className="text-lg font-bold text-text-primary mb-4">Atalhos rápidos</h3>

      <div className="grid grid-cols-2 gap-3">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl border border-border hover:border-primary-vibrant/40 hover:bg-bg-secondary hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60"
            >
              <span
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ backgroundColor: action.color + '1A', color: action.color }}
              >
                <Icon size={20} />
              </span>
              <span className="text-sm font-medium text-text-primary">{action.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
