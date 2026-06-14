import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationItem } from '@/hooks/useNotifications';

interface NotificationsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: NotificationItem[];
}

export const NotificationsMenu: React.FC<NotificationsMenuProps> = ({ isOpen, onClose, items }) => {
  const navigate = useNavigate();

  const goToTasks = () => {
    onClose();
    navigate('/tasks');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border-2 border-border ring-1 ring-primary-vibrant/20 shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-bold text-text-primary">Notificações</p>
              {items.length > 0 && (
                <span className="text-xs font-semibold text-primary-vibrant bg-primary-light px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center text-center py-8 px-4">
                  <BellOff size={28} className="text-text-soft mb-2" />
                  <p className="text-sm text-text-secondary">Tudo tranquilo por aqui.</p>
                </div>
              ) : (
                items.map(item => (
                  <button
                    key={item.id}
                    onClick={goToTasks}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-bg-secondary text-left transition-colors"
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: item.tone + '1A', color: item.tone }}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-text-primary truncate">
                        {item.title}
                      </span>
                      <span className="block text-xs text-text-secondary">{item.detail}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={goToTasks}
              className="w-full py-2.5 text-sm font-semibold text-primary-vibrant hover:bg-bg-secondary border-t border-border transition-colors"
            >
              Ver todas as tarefas
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
