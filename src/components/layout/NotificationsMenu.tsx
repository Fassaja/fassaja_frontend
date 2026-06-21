import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellOff, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationItem } from '@/contexts/NotificationsContext';

interface NotificationsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationsMenu: React.FC<NotificationsMenuProps> = ({
  isOpen,
  onClose,
  items,
  onMarkRead,
  onMarkAllRead,
}) => {
  const navigate = useNavigate();
  const hasUnread = items.some(i => !i.read);

  const openItem = (item: NotificationItem) => {
    onMarkRead(item.id);
    onClose();
    navigate(item.link);
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
            className="fixed left-2 right-2 top-[5.25rem] w-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white rounded-2xl border-2 border-border ring-1 ring-primary-vibrant/20 shadow-xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-bold text-text-primary">Notificações</p>
              {hasUnread && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-vibrant hover:text-primary-hover"
                >
                  <CheckCheck size={14} /> Marcar todas
                </button>
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
                    onClick={() => openItem(item)}
                    className={`relative w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                      item.read ? 'hover:bg-bg-secondary' : 'bg-primary-light/40 hover:bg-primary-light/60'
                    }`}
                  >
                    {!item.read && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-vibrant" />
                    )}
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: item.tone + '1A', color: item.tone }}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm truncate ${
                          item.read ? 'font-medium text-text-secondary' : 'font-semibold text-text-primary'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="block text-xs text-text-secondary">{item.detail}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => {
                onClose();
                navigate('/tasks');
              }}
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
