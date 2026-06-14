import React from 'react';
import { Moon, Sun, Bell, Target, User } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { useTheme } from '@/contexts/ThemeContext';
import { mockUser } from '@/data/mockUser';

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

const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [dailyGoal, setDailyGoal] = React.useState(mockUser.dailyGoal);
  const [weeklyGoal, setWeeklyGoal] = React.useState(mockUser.weeklyGoal);

  return (
    <AppLayout title="Configurações" subtitle="Personalize sua experiência no Fassaja.">
      <div className="space-y-6 max-w-3xl">
        {/* Profile Section */}
        <Card>
          <SectionHeader icon={<User size={18} />} color="#2477FF" title="Perfil" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Nome"
              value={mockUser.name}
              disabled
              placeholder="Seu nome"
            />
            <Input
              label="Email"
              type="email"
              value={mockUser.email}
              disabled
              placeholder="seu@email.com"
            />
          </div>
        </Card>

        {/* Goals Section */}
        <Card>
          <SectionHeader icon={<Target size={18} />} color="#22C55E" title="Metas" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Meta diária de tarefas"
              type="number"
              value={dailyGoal}
              onChange={e => setDailyGoal(parseInt(e.target.value))}
              placeholder="5"
            />
            <Input
              label="Meta semanal de tarefas"
              type="number"
              value={weeklyGoal}
              onChange={e => setWeeklyGoal(parseInt(e.target.value))}
              placeholder="25"
            />
          </div>
        </Card>

        {/* Theme Section */}
        <Card>
          <SectionHeader
            icon={theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            color="#FBBF24"
            title="Aparência"
          />
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-bg-secondary dark:bg-gray-800 rounded-xl">
              <div>
                <p className="font-medium text-text-primary">
                  {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                </p>
                <p className="text-sm text-text-secondary">
                  {theme === 'dark'
                    ? 'Interface com fundo escuro'
                    : 'Interface com fundo claro'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-primary-vibrant' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Notifications Section */}
        <Card>
          <SectionHeader icon={<Bell size={18} />} color="#8B5CF6" title="Notificações" />
          <div className="space-y-2">
            {[
              { label: 'Tarefas pendentes', id: 'pending' },
              { label: 'Prazos próximos', id: 'deadline' },
              { label: 'Lembretes diários', id: 'daily' },
            ].map(notif => (
              <label key={notif.id} className="flex items-center gap-3 p-3 hover:bg-bg-secondary dark:hover:bg-gray-800 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded accent-primary-vibrant"
                />
                <span className="text-text-primary">{notif.label}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* About Section */}
        <Card>
          <h3 className="text-lg font-bold text-text-primary mb-4">
            Sobre o Fassaja
          </h3>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>
              <strong>Versão:</strong> 1.0.0
            </p>
            <p>
              <strong>Desenvolvido com:</strong> React, TypeScript, Tailwind CSS
            </p>
            <p>
              Seu gerenciador de tarefas pessoal favorito, com mascote amigável e
              interface intuitiva.
            </p>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
