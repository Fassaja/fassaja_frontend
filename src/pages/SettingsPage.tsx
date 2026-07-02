import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Target, Check, ChevronRight, PlayCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { OPEN_TOUR_EVENT } from '@/components/layout/PlatformTourModal';
import { PAGE_TOURS } from '@/components/onboarding/PageTour';
import { useUser, NotificationPrefs } from '@/contexts/UserContext';
import { useToast } from '@/contexts/ToastContext';

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle?: string;
}> = ({ icon, color, title, subtitle }) => (
  <div className="mb-5">
    <h3 className="text-lg font-bold text-text-primary flex items-center gap-3">
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: color + '1A', color }}
      >
        {icon}
      </span>
      {title}
    </h3>
    {subtitle && <p className="text-sm text-text-secondary mt-1.5">{subtitle}</p>}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
      checked ? 'bg-primary-vibrant' : 'bg-primary-dark/20'
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
  { key: 'events', label: 'Lembretes da Agenda', hint: 'Avisa quando um evento está próximo' },
];

/** Linha clicável no padrão dos atalhos do Fale conosco. */
const ActionRow: React.FC<{
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon, iconClass, title, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 p-3 rounded-xl border border-border hover:bg-bg-secondary transition-colors text-left"
  >
    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-sm font-semibold text-text-primary">{title}</span>
      <span className="block text-xs text-text-secondary">{description}</span>
    </span>
    <ChevronRight size={17} className="text-text-soft shrink-0" />
  </button>
);

const GOAL_MAX = 999;

const SettingsPage: React.FC = () => {
  const { user, updateUser } = useUser();
  const toast = useToast();
  const navigate = useNavigate();

  // Rascunho local das metas: o valor só é salvo ao sair do campo (blur),
  // para "15" não gravar "1" e depois "15" enquanto a pessoa digita.
  const [goals, setGoals] = useState({
    daily: String(user.dailyGoal),
    weekly: String(user.weeklyGoal),
  });
  const [goalsSaved, setGoalsSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  // Sincroniza o rascunho quando as metas chegam depois (ex.: F5 direto aqui,
  // com o perfil ainda carregando). Só depende das metas — mexer nos toggles
  // de notificação não reseta o que está sendo digitado.
  useEffect(() => {
    setGoals({ daily: String(user.dailyGoal), weekly: String(user.weeklyGoal) });
  }, [user.dailyGoal, user.weeklyGoal]);

  const clampGoal = (raw: string) => Math.min(GOAL_MAX, Math.max(0, parseInt(raw, 10) || 0));

  const commitGoals = () => {
    const daily = clampGoal(goals.daily);
    const weekly = clampGoal(goals.weekly);
    setGoals({ daily: String(daily), weekly: String(weekly) });
    if (daily === user.dailyGoal && weekly === user.weeklyGoal) return;
    updateUser({ dailyGoal: daily, weeklyGoal: weekly });
    setGoalsSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setGoalsSaved(false), 2500);
  };

  const weeklyBelowDaily =
    clampGoal(goals.weekly) > 0 && clampGoal(goals.weekly) < clampGoal(goals.daily);

  const toggleNotif = (key: keyof NotificationPrefs) =>
    updateUser({ notifications: { ...user.notifications, [key]: !user.notifications[key] } });

  const reopenPlatformTour = () => {
    window.dispatchEvent(new Event(OPEN_TOUR_EVENT));
  };

  const resetAreaTours = () => {
    try {
      Object.keys(PAGE_TOURS).forEach(id => localStorage.removeItem(`fassaja_tour_${id}_seen`));
      localStorage.removeItem('fassaja_ai_tour_seen');
      toast.success('Dicas reativadas! Elas voltam a aparecer ao visitar cada área.');
    } catch {
      toast.error('Não foi possível reativar as dicas neste navegador.');
    }
  };

  return (
    <AppLayout title="Configurações" subtitle="Personalize sua experiência no Fassaja.">
      <div className="space-y-6 max-w-3xl">
        {/* Goals */}
        <Card>
          <SectionHeader
            icon={<Target size={18} />}
            color="#22C55E"
            title="Metas"
            subtitle="Elas guiam o progresso do Dashboard e as comemorações."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Meta diária de tarefas"
              type="number"
              min={0}
              max={GOAL_MAX}
              value={goals.daily}
              onChange={e => setGoals(g => ({ ...g, daily: e.target.value }))}
              onBlur={commitGoals}
              placeholder="5"
            />
            <Input
              label="Meta semanal de tarefas"
              type="number"
              min={0}
              max={GOAL_MAX}
              value={goals.weekly}
              onChange={e => setGoals(g => ({ ...g, weekly: e.target.value }))}
              onBlur={commitGoals}
              placeholder="25"
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 min-h-[1.25rem]">
            {goalsSaved ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                <Check size={13} strokeWidth={3} /> Metas salvas
              </span>
            ) : (
              <p className="text-xs text-text-secondary">Salvamos ao sair do campo.</p>
            )}
            {weeklyBelowDaily && (
              <span className="text-xs font-medium text-amber-600">
                Sua meta semanal é menor que a diária — confira se é isso mesmo.
              </span>
            )}
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <SectionHeader
            icon={<Bell size={18} />}
            color="#8B5CF6"
            title="Notificações"
            subtitle="Escolha o que aparece no sino do topo."
          />
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

        {/* Tutoriais */}
        <Card>
          <SectionHeader
            icon={<PlayCircle size={18} />}
            color="#2477FF"
            title="Tutoriais"
            subtitle="Reveja o tour da plataforma ou as dicas de cada área."
          />
          <div className="space-y-3">
            <ActionRow
              icon={<PlayCircle size={18} />}
              iconClass="bg-primary-light text-primary-vibrant"
              title="Ver tour do Fassaja"
              description="O passeio pelos principais espaços, com o Bob"
              onClick={reopenPlatformTour}
            />
            <ActionRow
              icon={<RotateCcw size={18} />}
              iconClass="bg-emerald-50 text-emerald-600"
              title="Reexibir dicas das áreas"
              description="As boas-vindas de cada tela voltam a aparecer uma vez"
              onClick={resetAreaTours}
            />
          </div>
        </Card>

        {/* Conta e segurança (mora no Perfil — atalho para quem procura aqui) */}
        <Card>
          <SectionHeader
            icon={<ShieldCheck size={18} />}
            color="#F43F5E"
            title="Conta e segurança"
            subtitle="Nome, foto e senha ficam no seu Perfil."
          />
          <ActionRow
            icon={<ShieldCheck size={18} />}
            iconClass="bg-rose-50 text-danger"
            title="Ir para o Perfil"
            description="Alterar nome, foto de perfil e senha"
            onClick={() => navigate('/profile')}
          />
        </Card>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
