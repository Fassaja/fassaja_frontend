import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Target,
  Check,
  ChevronRight,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { OPEN_TOUR_EVENT } from '@/components/layout/PlatformTourModal';
import { PAGE_TOURS } from '@/components/onboarding/PageTour';
import { useUser, NotificationPrefs } from '@/contexts/UserContext';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { deleteAccount } from '@/services/authService';

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
  const { logout } = useAuth();

  // Exclusão de conta (LGPD) em duas etapas: primeiro o aviso "tem certeza?",
  // só depois o formulário com senha. Uma ação irreversível não pode acontecer
  // a um clique de distância.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [delPassword, setDelPassword] = useState('');
  const [delConfirm, setDelConfirm] = useState('');
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState('');

  const closeDeleteForm = () => {
    setShowDeleteForm(false);
    setDelPassword('');
    setDelConfirm('');
    setDelError('');
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delConfirm.trim().toUpperCase() !== 'EXCLUIR') {
      setDelError('Digite EXCLUIR para confirmar.');
      return;
    }
    if (!delPassword) {
      setDelError('Informe sua senha.');
      return;
    }
    setDelError('');
    setDelLoading(true);
    try {
      await deleteAccount(delPassword);
      // A conta não existe mais: logout() limpa a PII espelhada no navegador e
      // leva ao /login. A chamada a /auth/logout que ele dispara falha em
      // silêncio (é best-effort e não derruba nada).
      logout();
    } catch (err) {
      setDelError((err as Error).message || 'Não foi possível excluir a conta.');
      setDelLoading(false);
    }
  };

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
          <div className="flex flex-col gap-3">
            <ActionRow
              icon={<ShieldCheck size={18} />}
              iconClass="bg-rose-50 text-danger"
              title="Ir para o Perfil"
              description="Alterar nome, foto de perfil e senha"
              onClick={() => navigate('/profile')}
            />
            <ActionRow
              icon={<Trash2 size={18} />}
              iconClass="bg-rose-50 text-danger"
              title="Excluir minha conta"
              description="Apaga sua conta e seus dados pessoais definitivamente"
              onClick={() => setConfirmDelete(true)}
            />
          </div>
        </Card>
      </div>

      {/* Etapa 1 — o aviso. Explica o que some, o que fica, e que não tem volta. */}
      <ConfirmDialog
        isOpen={confirmDelete}
        title="Tem certeza?"
        message="Excluir a conta apaga seus dados pessoais para sempre. Não há como desfazer nem recuperar depois."
        hint={
          <>
            <strong className="block text-text-primary mb-1">O que será apagado</strong>
            Seu perfil, projetos individuais, tarefas, etiquetas, eventos e sua sequência.
            <strong className="block text-text-primary mt-3 mb-1">O que continua</strong>
            O que você criou em equipes fica com a equipe, para não apagar o trabalho de outras
            pessoas. Equipes das quais você é dono passam para o membro mais antigo — e, se você for
            o único integrante, a equipe é excluída junto.
          </>
        }
        confirmLabel="Sim, quero excluir"
        cancelLabel="Cancelar"
        tone="danger"
        mascotState="sad"
        onConfirm={() => setShowDeleteForm(true)}
        onClose={() => setConfirmDelete(false)}
      />

      {/* Etapa 2 — a confirmação de verdade: senha + digitar EXCLUIR. */}
      <Modal isOpen={showDeleteForm} onClose={closeDeleteForm} title="Excluir minha conta" size="md">
        <form onSubmit={handleDeleteAccount} className="flex flex-col gap-4">
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>Último passo. Depois disso não há como recuperar a conta.</span>
          </div>

          <PasswordInput
            label="Sua senha"
            placeholder="••••••••"
            value={delPassword}
            onChange={e => {
              setDelPassword(e.target.value);
              if (delError) setDelError('');
            }}
            autoFocus
          />

          <Input
            label="Digite EXCLUIR para confirmar"
            placeholder="EXCLUIR"
            value={delConfirm}
            onChange={e => {
              setDelConfirm(e.target.value);
              if (delError) setDelError('');
            }}
          />

          {delError && <p className="text-sm text-danger">{delError}</p>}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 rounded-xl"
              onClick={closeDeleteForm}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              className="flex-1 rounded-xl"
              isLoading={delLoading}
            >
              Excluir para sempre
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
};

export default SettingsPage;
