import React from 'react';
import { Moon, Sun, Bell, Target } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { useTheme } from '@/contexts/ThemeContext';
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
  { key: 'pending', label: 'Tarefas pendentes', hint: 'Avisos sobre tarefas em aberto' },
  { key: 'deadline', label: 'Prazos próximos', hint: 'Quando uma tarefa está perto de vencer' },
  { key: 'daily', label: 'Lembretes diários', hint: 'Um resumo do seu dia' },
];

const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
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
              value={user.dailyGoal}
              onChange={e => updateUser({ dailyGoal: Number(e.target.value) || 0 })}
              placeholder="5"
            />
            <Input
              label="Meta semanal de tarefas"
              type="number"
              value={user.weeklyGoal}
              onChange={e => updateUser({ weeklyGoal: Number(e.target.value) || 0 })}
              placeholder="25"
            />
          </div>
        </Card>

        {/* Appearance */}
        <Card>
          <SectionHeader
            icon={theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            color="#FBBF24"
            title="Aparência"
          />
          <div className="flex items-center justify-between p-4 bg-bg-secondary dark:bg-gray-800 rounded-xl">
            <div>
              <p className="font-medium text-text-primary">
                {theme === 'dark' ? 'Modo escuro' : 'Modo claro'}
              </p>
              <p className="text-sm text-text-secondary">
                {theme === 'dark' ? 'Interface com fundo escuro' : 'Interface com fundo claro'}
              </p>
            </div>
            <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <SectionHeader icon={<Bell size={18} />} color="#8B5CF6" title="Notificações" />
          <div className="space-y-1">
            {notifLabels.map(item => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-bg-secondary dark:hover:bg-gray-800 transition-colors"
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

        {/* About */}
        <Card>
          <h3 className="text-lg font-bold text-text-primary mb-4">Sobre o Fassaja</h3>
          <div className="space-y-2 text-sm text-text-secondary">
            <p><strong className="text-text-primary">Versão:</strong> 1.0.0</p>
            <p><strong className="text-text-primary">Desenvolvido com:</strong> React, TypeScript, Tailwind CSS</p>
            <p>Seu gerenciador de tarefas com mascote amigável e interface intuitiva.</p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
