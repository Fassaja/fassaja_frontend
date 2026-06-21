import React from 'react';
import { Bell, Target } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { useUser, NotificationPrefs } from '@/contexts/UserContext';

const SectionHeader: React.FC<{ icon: React.ReactNode; color: string; title: string }> = ({
  icon,
  color,
  title,
}) => (
  <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-3">
    <span
      className="w-9 h-9 rounded-xl flex items-center justify-center"
      style={{ backgroundColor: color + '1A', color }}
    >
      {icon}
    </span>
    {title}
  </h3>
);

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
      checked ? 'bg-primary-vibrant' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const notifLabels: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: 'pending', label: 'Tarefas que vencem hoje', hint: 'Mostra no sino o que vence hoje' },
  { key: 'deadline', label: 'Tarefas atrasadas', hint: 'Mostra no sino as tarefas atrasadas' },
  { key: 'daily', label: 'Resumo diário', hint: 'Mostra no sino o que você concluiu hoje' },
];

const SettingsPage: React.FC = () => {
  const { user, updateUser } = useUser();

  const toggleNotif = (key: keyof NotificationPrefs) =>
    updateUser({ notifications: { ...user.notifications, [key]: !user.notifications[key] } });

  return (
    <AppLayout title="Configurações" subtitle="Personalize sua experiência no Fassaja.">
      <div className="space-y-6 max-w-3xl">
        {/* Goals */}
        <Card>
          <SectionHeader icon={<Target size={18} />} color="#22C55E" title="Metas" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Meta diária de tarefas"
              type="number"
              min={0}
              value={user.dailyGoal}
              onChange={e => updateUser({ dailyGoal: Math.max(0, Number(e.target.value) || 0) })}
              placeholder="5"
            />
            <Input
              label="Meta semanal de tarefas"
              type="number"
              min={0}
              value={user.weeklyGoal}
              onChange={e => updateUser({ weeklyGoal: Math.max(0, Number(e.target.value) || 0) })}
              placeholder="25"
            />
          </div>
          <p className="text-xs text-text-secondary mt-3">
            As metas aparecem no progresso da Dashboard. Tudo é salvo automaticamente.
          </p>
        </Card>

        {/* Notifications */}
        <Card>
          <SectionHeader icon={<Bell size={18} />} color="#8B5CF6" title="Notificações" />
          <p className="text-xs text-text-secondary -mt-4 mb-4">
            Escolha o que aparece no sino do topo.
          </p>
          <div className="space-y-1">
            {notifLabels.map(item => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-bg-secondary transition-colors"
              >
                <div>
                  <p className="text-text-primary font-medium">{item.label}</p>
                  <p className="text-xs text-text-secondary">{item.hint}</p>
                </div>
                <Toggle checked={user.notifications[item.key]} onChange={() => toggleNotif(item.key)} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
