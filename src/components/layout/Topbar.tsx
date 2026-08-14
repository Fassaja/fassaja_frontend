import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, RefreshCw, Flame } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Tooltip } from '@/components/common/Tooltip';
import { SearchModal } from './SearchModal';
import { NotificationsMenu } from './NotificationsMenu';
import { StreakDaysModal } from './StreakDaysModal';
import { useNotifications } from '@/hooks/useNotifications';
import { useUser, initialsOf } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/contexts/TasksContext';
import { useProjects } from '@/contexts/ProjectsContext';

interface TopbarProps {
  onNewTask?: () => void;
  actionLabel?: string;
  title?: string;
  subtitle?: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  onNewTask,
  actionLabel = 'Nova Tarefa',
  // Rótulo neutro: toda página passa o próprio título, e a saudação genérica
  // que ficava aqui competia com a que a Home já mostra logo abaixo.
  title = 'Fassaja',
  subtitle = '',
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStreakDays, setShowStreakDays] = useState(false);
  const { items: notifications, unreadCount, markRead, markAllRead, refresh: refreshNotifications } =
    useNotifications();
  const navigate = useNavigate();
  const { user } = useUser();
  const { isGuest, requireAuth } = useAuth();
  const { refresh: refreshTasks } = useTasks();
  const { refresh: refreshProjects } = useProjects();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([refreshTasks(), refreshProjects()]);
    } finally {
      // mantém o giro por um instante para dar feedback mesmo em respostas rápidas
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const openProfile = () => {
    if (isGuest) {
      requireAuth('Seu perfil fica disponível depois que você entra. Faça login ou continue como visitante.');
      return;
    }
    navigate('/profile');
  };

  const openStreakDays = () => {
    if (isGuest) {
      requireAuth('Os dias da sequência ficam disponíveis depois que você entra.');
      return;
    }
    setShowStreakDays(true);
  };

  return (
    <div className="fixed top-0 left-0 right-0 min-h-20 bg-surface/90 backdrop-blur-sm border-b border-border z-30 lg:left-64">
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <StreakDaysModal isOpen={showStreakDays} onClose={() => setShowStreakDays(false)} />

      <div className="h-full px-4 lg:px-8 py-4 flex items-center justify-between gap-4">
        {/* Greeting */}
        <div className="min-w-0 pl-12 lg:pl-0 hidden sm:block">
          <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-text-primary truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-text-secondary truncate hidden sm:block first-letter:uppercase">
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
          {/* Enquanto atualiza o botão fica desabilitado — e botão desabilitado
              não dispara evento de ponteiro. A dica funciona mesmo assim
              porque quem escuta é o <span> em volta, não o botão.

              Esconder no mobile é responsabilidade do invólucro, que é a caixa
              que ocupa espaço na barra; repetir `hidden` no botão deixaria um
              span vazio somando o gap da linha. */}
          <Tooltip
            content={refreshing ? 'Atualizando…' : 'Atualizar'}
            description={
              refreshing ? 'Buscando tarefas e projetos.' : 'Recarrega tarefas e projetos do servidor.'
            }
            className="hidden sm:inline-flex"
          >
            <button
              type="button"
              aria-label="Atualizar"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex w-9 h-9 sm:w-11 sm:h-11 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary hover:text-primary-vibrant hover:border-primary-vibrant/50 hover:bg-primary-light/40 active:scale-95 transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60 disabled:opacity-60"
            >
              <RefreshCw size={19} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </Tooltip>

          <button
            type="button"
            aria-label="Buscar"
            onClick={() => setShowSearch(true)}
            className="hidden sm:flex w-9 h-9 sm:w-11 sm:h-11 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary hover:text-primary-vibrant hover:border-primary-vibrant/50 hover:bg-primary-light/40 active:scale-95 transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60"
          >
            <Search size={20} />
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label={`Notificações${unreadCount ? `, ${unreadCount} novas` : ''}`}
              aria-expanded={showNotifications}
              onClick={() => {
                setShowNotifications(v => !v);
                refreshNotifications();
              }}
              className="relative w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl border border-border bg-surface text-text-secondary hover:text-primary-vibrant hover:border-primary-vibrant/50 hover:bg-primary-light/40 active:scale-95 transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-primary-vibrant rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <NotificationsMenu
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              items={notifications}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
            />
          </div>

          {onNewTask && (
            <Button
              onClick={onNewTask}
              size="md"
              icon={<Plus size={18} />}
              className="rounded-xl shadow-sm shadow-primary-vibrant/20 whitespace-nowrap"
            >
              {actionLabel}
            </Button>
          )}

          {/* A regra "folgas não quebram a streak" estava dentro de um title=
              nativo: não aparece no foco por teclado e ignora o tema. */}
          <Tooltip
            content="Dias da sequência"
            description="Marque suas folgas: elas não quebram a sequência."
          >
            <button
              type="button"
              aria-label="Editar dias da sequência"
              onClick={openStreakDays}
              className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl border border-border bg-surface text-amber-500 dark:text-amber-400 hover:border-amber-300 hover:bg-amber-50 active:scale-95 transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-100"
            >
              <Flame size={20} />
            </button>
          </Tooltip>

          {/* Só no celular. No desktop a identidade mora no rodapé da barra
              lateral, com nome, e-mail e as ações da conta — manter o avatar
              aqui seria a mesma coisa em dois cantos da tela. No celular a
              barra é uma gaveta fechada, e este vira o único acesso visível. */}
          <button
            type="button"
            onClick={openProfile}
            aria-label="Meu perfil"
            className="lg:hidden shrink-0 rounded-full ring-2 ring-transparent hover:ring-primary-light focus:outline-none focus-visible:ring-primary-vibrant transition-all active:scale-95"
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover" />
            ) : (
              <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary-vibrant to-brand-deep flex items-center justify-center text-white text-sm font-bold">
                {initialsOf(user.name)}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
