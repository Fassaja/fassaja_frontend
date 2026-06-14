import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { SearchModal } from './SearchModal';
import { NotificationsMenu } from './NotificationsMenu';
import { useNotifications } from '@/hooks/useNotifications';
import { useUser, initialsOf } from '@/contexts/UserContext';

interface TopbarProps {
  onNewTask?: () => void;
  actionLabel?: string;
  title?: string;
  subtitle?: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  onNewTask,
  actionLabel = 'Nova Tarefa',
  title = 'Bem-vindo de volta 👋',
  subtitle = 'Vamos organizar o seu dia.',
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifications = useNotifications(true);
  const notificationCount = notifications.length;
  const navigate = useNavigate();
  const { user } = useUser();

  return (
    <div className="fixed top-0 left-0 right-0 min-h-20 bg-white/90 backdrop-blur-sm border-b border-border z-30 lg:left-64">
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />

      <div className="h-full px-4 lg:px-8 py-4 flex items-center justify-between gap-4">
        {/* Greeting */}
        <div className="min-w-0 pl-12 lg:pl-0">
          <h1 className="text-xl lg:text-2xl font-bold text-text-primary truncate">
            {title}
          </h1>
          <p className="text-sm text-text-secondary truncate hidden sm:block">
            {subtitle}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            aria-label="Buscar"
            onClick={() => setShowSearch(true)}
            className="w-11 h-11 flex items-center justify-center rounded-xl border border-border bg-white text-text-secondary hover:text-primary-vibrant hover:border-primary-vibrant/50 hover:bg-primary-light/40 active:scale-95 transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60"
          >
            <Search size={20} />
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label={`Notificações${notificationCount ? `, ${notificationCount} novas` : ''}`}
              aria-expanded={showNotifications}
              onClick={() => setShowNotifications(v => !v)}
              className="relative w-11 h-11 flex items-center justify-center rounded-xl border border-border bg-white text-text-secondary hover:text-primary-vibrant hover:border-primary-vibrant/50 hover:bg-primary-light/40 active:scale-95 transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60"
            >
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-primary-vibrant rounded-full">
                  {notificationCount}
                </span>
              )}
            </button>
            <NotificationsMenu
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              items={notifications}
            />
          </div>

          {onNewTask && (
            <Button
              onClick={onNewTask}
              size="md"
              icon={<Plus size={18} />}
              className="rounded-xl shadow-sm shadow-primary-vibrant/20"
            >
              <span className="hidden sm:inline">{actionLabel}</span>
            </Button>
          )}

          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="Meu perfil"
            className="shrink-0 rounded-full ring-2 ring-transparent hover:ring-primary-light focus:outline-none focus-visible:ring-primary-vibrant transition-all active:scale-95"
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-vibrant to-primary-dark flex items-center justify-center text-white text-sm font-bold">
                {initialsOf(user.name)}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
