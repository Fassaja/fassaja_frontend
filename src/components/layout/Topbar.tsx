import React from 'react';
import { Search, Bell, Plus } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface TopbarProps {
  onNewTask?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onNewTask, searchValue, onSearchChange }) => {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-border z-30 lg:left-64">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchValue || ''}
              onChange={e => onSearchChange?.(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary-vibrant focus:ring-2 focus:ring-primary-light"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4 ml-4">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg text-text-secondary">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
          </button>

          {/* New task button */}
          {onNewTask && (
            <Button
              onClick={onNewTask}
              size="md"
              icon={<Plus size={18} />}
              className="hidden sm:flex"
            >
              Nova Tarefa
            </Button>
          )}

          {/* Mobile new task button */}
          {onNewTask && (
            <button
              onClick={onNewTask}
              className="sm:hidden w-10 h-10 bg-primary-vibrant text-white rounded-lg flex items-center justify-center hover:bg-blue-600"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
