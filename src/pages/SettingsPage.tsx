import React from 'react';
import { Moon, Sun, Bell, Target } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { useTheme } from '@/contexts/ThemeContext';
import { mockUser } from '@/data/mockUser';

const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [dailyGoal, setDailyGoal] = React.useState(mockUser.dailyGoal);
  const [weeklyGoal, setWeeklyGoal] = React.useState(mockUser.weeklyGoal);

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Configurações
        </h1>
        <p className="text-text-secondary">
          Personalize sua experiência no Fassaja
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card>
          <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <span>👤</span> Perfil
          </h3>
          <div className="space-y-4">
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
          <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <Target size={20} /> Metas
          </h3>
          <div className="space-y-4">
            <Input
              label="Meta Diária de Tarefas"
              type="number"
              value={dailyGoal}
              onChange={e => setDailyGoal(parseInt(e.target.value))}
              placeholder="5"
            />
            <Input
              label="Meta Semanal de Tarefas"
              type="number"
              value={weeklyGoal}
              onChange={e => setWeeklyGoal(parseInt(e.target.value))}
              placeholder="25"
            />
          </div>
        </Card>

        {/* Theme Section */}
        <Card>
          <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            Aparência
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
          <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <Bell size={20} /> Notificações
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Tarefas Pendentes', id: 'pending' },
              { label: 'Prazos Próximos', id: 'deadline' },
              { label: 'Lembretes Diários', id: 'daily' },
            ].map(notif => (
              <label key={notif.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 accent-primary-vibrant"
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
