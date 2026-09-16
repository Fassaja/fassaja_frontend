import { AssinaturaAtual } from '@/components/pro/AssinaturaAtual';
import { useProStatus } from '@/contexts/ProContext';
import { FREE_PROJECT_LIMIT, PRO_WEEKLY_LIMIT, FREE_WEEKLY_LIMIT } from '@/utils/playConfig';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarPlus,
  Target,
  Check,
  ChevronRight,
  PlayCircle,
  RotateCcw,
  ScrollText,
  Sparkles,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Mail,
  Palette,
  Pencil,
  UserCog,
  Monitor,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Accordion } from '@/components/common/Accordion';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { OPEN_TOUR_EVENT } from '@/components/layout/PlatformTourModal';
import { PAGE_TOURS } from '@/components/onboarding/PageTour';
import {
  AccountNameSection,
  AccountPasswordSection,
} from '@/components/settings/AccountSections';
import { GOAL_LIMITS, clampGoal } from '@/utils/goals';
import { useUser, NotificationPrefs } from '@/contexts/UserContext';
import { Toggle } from '@/components/common/Toggle';
import { TaskReminderSection } from '@/components/settings/TaskReminderSection';
import { CalendarSubscriptionSection } from '@/components/settings/CalendarSubscriptionSection';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, ThemePreference } from '@/contexts/ThemeContext';
import { deleteAccount, requestAccountDeletion } from '@/services/authService';
import { provaDeExclusao } from '@/utils/exclusaoDeConta';

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
];

/**
 * Ladrilho do ícone da seção.
 *
 * Neutro por padrão. Antes cada seção tinha uma cor própria — sete cores num
 * índice de nove linhas —, e o arco-íris dava à tela um ar de brinquedo: se
 * tudo é destacado, nada é. A cor fica reservada para o que MUDA a leitura,
 * hoje só a zona de perigo.
 */
const SectionIcon: React.FC<{ icon: React.ReactNode; tone?: 'neutro' | 'perigo' }> = ({
  icon,
  tone = 'neutro',
}) => (
  <span
    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
      tone === 'perigo'
        ? 'bg-danger/10 text-danger'
        : 'bg-bg-secondary text-text-secondary'
    }`}
  >
    {icon}
  </span>
);

/** Explicação da seção, na primeira linha do painel aberto. */
const SectionHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-text-secondary mb-5">{children}</p>
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


const SettingsPage: React.FC = () => {
  const { user, updateUser, saveGoals } = useUser();
  const { preference, resolved, setPreference } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const proStatus = useProStatus();
  const proExiste = proStatus.onde !== null;
  const { account, logout } = useAuth();

  // Exclusão de conta (LGPD) em duas etapas: primeiro o aviso "tem certeza?",
  // só depois o formulário com senha. Uma ação irreversível não pode acontecer
  // a um clique de distância.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [delPassword, setDelPassword] = useState('');
  const [delConfirm, setDelConfirm] = useState('');
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState('');
  // Conta sem senha: a confirmação vai por e-mail, então esta tela termina em
  // "enviamos o link" em vez de excluir na hora.
  const [delEmailEnviado, setDelEmailEnviado] = useState(false);

  /**
   * Esta conta confirma a exclusão com senha ou pelo e-mail?
   *
   * `hasPassword` vem do servidor porque só ele sabe: `passwordChangedAt` nulo
   * não serve de pista — quem se cadastrou com senha e nunca a trocou também
   * tem nulo ali. O `undefined` (sessão de cache antigo) tem tratamento
   * próprio; ver utils/exclusaoDeConta.ts.
   */
  const confirmaPorEmail = provaDeExclusao(account?.hasPassword) === 'email';

  const closeDeleteForm = () => {
    setShowDeleteForm(false);
    setDelPassword('');
    setDelConfirm('');
    setDelError('');
    setDelEmailEnviado(false);
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delConfirm.trim().toUpperCase() !== 'EXCLUIR') {
      setDelError('Digite EXCLUIR para confirmar.');
      return;
    }
    setDelError('');
    setDelLoading(true);

    // Sem senha, este botão não exclui: ele PEDE o e-mail de confirmação. A
    // exclusão acontece na página que o link abre, e é lá que o token viaja.
    if (confirmaPorEmail) {
      try {
        await requestAccountDeletion();
        setDelEmailEnviado(true);
      } catch (err) {
        setDelError((err as Error).message || 'Não foi possível enviar o e-mail.');
      }
      setDelLoading(false);
      return;
    }

    if (!delPassword) {
      setDelError('Informe sua senha.');
      setDelLoading(false);
      return;
    }
    try {
      await deleteAccount({ password: delPassword });
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



  const commitGoals = () => {
    const daily = clampGoal(goals.daily, 'daily');
    const weekly = clampGoal(goals.weekly, 'weekly');
    setGoals({ daily: String(daily), weekly: String(weekly) });
    if (daily === user.dailyGoal && weekly === user.weeklyGoal) return;
    // saveGoals (e não updateUser): a meta agora é do servidor, e gravar só no
    // estado local voltaria a perdê-la ao trocar de aparelho.
    saveGoals({
      ...(daily !== user.dailyGoal ? { daily } : {}),
      ...(weekly !== user.weeklyGoal ? { weekly } : {}),
    });
    setGoalsSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setGoalsSaved(false), 2500);
  };

  const weeklyBelowDaily =
    clampGoal(goals.weekly, 'weekly') < clampGoal(goals.daily, 'daily');

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
      {/* Coluna centralizada, e cada ajuste num item do acordeão — o mesmo
          do Fale conosco. Configurações é onde se entra para mexer em UMA
          coisa; com tudo aberto, era preciso rolar sete blocos para achá-la.
          Fechado, a página vira um índice do que dá para ajustar. */}
      <div className="mx-auto w-full max-w-2xl">
        <Accordion
          items={[
            {
              id: 'aparencia',
              group: 'Preferências',
              icon: <SectionIcon icon={<Palette size={18} />} />,
              title: 'Aparência',
              summary:
                preference === 'system'
                  ? `Sistema · ${resolved === 'dark' ? 'escuro' : 'claro'}`
                  : preference === 'dark'
                  ? 'Escuro'
                  : 'Claro',
              content: (
                <>
                  <SectionHint>Vale para este navegador.</SectionHint>
                  <div className="grid grid-cols-3 gap-2">
                    {THEME_OPTIONS.map(option => {
                      const active = preference === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPreference(option.value)}
                          aria-pressed={active}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                            active
                              ? 'border-primary-vibrant bg-primary-light text-primary-vibrant'
                              : 'border-border bg-surface text-text-secondary hover:bg-bg-secondary'
                          }`}
                        >
                          <option.icon size={18} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-text-secondary">
                    {preference === 'system'
                      ? `Acompanhando o sistema — agora está no tema ${resolved === 'dark' ? 'escuro' : 'claro'}.`
                      : 'Sua escolha vence a preferência do sistema.'}
                  </p>
                </>
              ),
            },
            {
              id: 'metas',
              group: 'Preferências',
              icon: <SectionIcon icon={<Target size={18} />} />,
              title: 'Metas',
              summary: `${user.dailyGoal}/dia · ${user.weeklyGoal}/semana`,
              content: (
                <>
                  <SectionHint>Elas guiam o progresso do Dashboard e as comemorações.</SectionHint>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label="Meta diária de tarefas"
                      type="number"
                      min={GOAL_LIMITS.daily.min}
                      max={GOAL_LIMITS.daily.max}
                      value={goals.daily}
                      onChange={e => setGoals(g => ({ ...g, daily: e.target.value }))}
                      onBlur={commitGoals}
                      placeholder="5"
                    />
                    <Input
                      label="Meta semanal de tarefas"
                      type="number"
                      min={GOAL_LIMITS.weekly.min}
                      max={GOAL_LIMITS.weekly.max}
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
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-300">
                        Sua meta semanal é menor que a diária — confira se é isso mesmo.
                      </span>
                    )}
                  </div>
                </>
              ),
            },
            {
              // Separada das notificações do sino: aquelas são o que aparece
              // DENTRO do app; esta é a única que toca o celular da pessoa com
              // o app fechado. Juntá-las esconderia essa diferença.
              id: 'lembretes',
              group: 'Avisos',
              icon: <SectionIcon icon={<Bell size={18} />} tone="perigo" />,
              title: 'Lembrete de prazo',
              summary:
                account?.taskReminder === false
                  ? 'Desligado'
                  : `Todo dia às ${account?.taskReminderTime ?? '09:00'}`,
              content: (
                <>
                  <SectionHint>Vale para toda tarefa com prazo.</SectionHint>
                  <TaskReminderSection />
                </>
              ),
            },
            {
              id: 'calendario',
              group: 'Avisos',
              icon: <SectionIcon icon={<CalendarPlus size={18} />} />,
              title: 'Calendário externo',
              content: (
                <>
                  <SectionHint>Google, Apple ou Outlook — somente leitura.</SectionHint>
                  <CalendarSubscriptionSection />
                </>
              ),
            },
            {
              id: 'notificacoes',
              group: 'Avisos',
              icon: <SectionIcon icon={<Bell size={18} />} />,
              title: 'Notificações',
              summary: (() => {
                const ativas = notifLabels.filter(i => user.notifications[i.key]).length;
                if (ativas === 0) return 'Nenhuma ativa';
                if (ativas === notifLabels.length) return 'Todas ativas';
                return `${ativas} de ${notifLabels.length} ativas`;
              })(),
              content: (
                <>
                  <SectionHint>Escolha o que aparece no sino do topo.</SectionHint>
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
                        <Toggle
                          checked={user.notifications[item.key]}
                          onChange={() => toggleNotif(item.key)}
                        />
                      </div>
                    ))}
                  </div>
                </>
              ),
            },
            // O plano só aparece quando o Pro existe (loja ligada) ou a pessoa
            // já é Pro — antes disso, uma seção "Plano: gratuito" seria um
            // anúncio de algo que não dá para comprar.
            ...(proExiste || proStatus.pro
              ? [
                  {
                    id: 'plano',
                    group: 'Conta',
                    icon: <SectionIcon icon={<Sparkles size={18} />} />,
                    title: 'Plano',
                    summary: proStatus.pro ? 'Fassaja Pro' : 'Gratuito',
                    content: proStatus.pro ? (
                      <>
                        <SectionHint>
                          Você é <strong className="text-text-primary">Pro</strong>: projetos
                          ilimitados, equipes, ideias, agenda, foco e {PRO_WEEKLY_LIMIT} usos do
                          assistente por semana.
                        </SectionHint>
                        <AssinaturaAtual />
                      </>
                    ) : (
                      <>
                        <SectionHint>
                          Conta gratuita: até {FREE_PROJECT_LIMIT} projetos em andamento e {FREE_WEEKLY_LIMIT} usos
                          do assistente por semana.
                        </SectionHint>
                        <ActionRow
                          icon={<Sparkles size={18} />}
                          iconClass="bg-primary-light text-primary-vibrant"
                          title="Conhecer o Fassaja Pro"
                          description="Projetos ilimitados, equipes, ideias, agenda, foco e mais IA"
                          onClick={() => navigate('/apoiar')}
                        />
                      </>
                    ),
                  },
                ]
              : []),
            {
              // Nome e senha num item só: são a mesma pergunta ("meus dados de
              // acesso"), e como dois itens obrigavam a abrir um, fechar, abrir
              // o outro. Dentro, cada um tem seu próprio subtítulo.
              id: 'usuario',
              group: 'Conta',
              icon: <SectionIcon icon={<UserCog size={18} />} />,
              title: 'Configurações do usuário',
              summary: account?.email,
              content: (
                <>
                  <SectionHint>
                    {account ? `Conectado como ${account.email}` : 'Seus dados de acesso.'}
                  </SectionHint>

                  {/* Acordeão dentro de acordeão. Funciona porque o painel de
                      fora mede a altura com ResizeObserver, e não uma vez só:
                      quando um submenu abre, o de fora cresce junto. */}
                  <div className="rounded-xl border border-border px-4">
                    <Accordion
                      items={[
                        {
                          id: 'nome',
                          icon: <Pencil size={15} className="shrink-0 text-primary-vibrant" />,
                          title: 'Nome de usuário',
                          content: (
                            <>
                              <SectionHint>
                                Exibido na plataforma. Só pode ser alterado a cada 30 dias.
                              </SectionHint>
                              <AccountNameSection />
                            </>
                          ),
                        },
                        {
                          id: 'senha',
                          icon: <ShieldCheck size={15} className="shrink-0 text-primary-vibrant" />,
                          title: 'Redefinição de senha',
                          content: (
                            <>
                              <SectionHint>Sua senha de acesso ao Fassaja.</SectionHint>
                              <AccountPasswordSection />
                            </>
                          ),
                        },
                      ]}
                    />
                  </div>
                </>
              ),
            },
            {
              id: 'tutoriais',
              group: 'Ajuda',
              icon: <SectionIcon icon={<PlayCircle size={18} />} />,
              title: 'Tutoriais',
              content: (
                <>
                  <SectionHint>Reveja o tour da plataforma ou as dicas de cada área.</SectionHint>
                  <div className="space-y-3">
                    <ActionRow
                      icon={<PlayCircle size={18} />}
                      iconClass="bg-primary-light text-primary-vibrant"
                      title="Ver tour do Fassaja"
                      description="O passeio pelos principais espaços, com o Bob"
                      onClick={reopenPlatformTour}
                    />
                    <ActionRow
                      icon={<ShieldCheck size={18} />}
                      iconClass="bg-primary-light text-primary-vibrant"
                      title="Ir para o Perfil"
                      description="Sua foto, seus números e suas conquistas"
                      onClick={() => navigate('/profile')}
                    />
                    <ActionRow
                      icon={<RotateCcw size={18} />}
                      iconClass="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      title="Reexibir dicas das áreas"
                      description="As boas-vindas de cada tela voltam a aparecer uma vez"
                      onClick={resetAreaTours}
                    />
                    <ActionRow
                      icon={<ScrollText size={18} />}
                      iconClass="bg-bg-secondary text-text-secondary"
                      title="Termos de Uso"
                      description="O combinado entre você e o Fassaja"
                      onClick={() => navigate('/termos')}
                    />
                    <ActionRow
                      icon={<ShieldCheck size={18} />}
                      iconClass="bg-bg-secondary text-text-secondary"
                      title="Política de Privacidade"
                      description="Quais dados guardamos, por quê, e seus direitos"
                      onClick={() => navigate('/privacidade')}
                    />
                  </div>
                </>
              ),
            },
            {
              // O atalho para o Perfil saiu daqui: ir ver a própria foto não é
              // ação perigosa, e listá-la ao lado da exclusão da conta ensinava
              // o dedo a clicar sem ler nesta seção. Ela agora vive em Ajuda.
              id: 'perigo',
              group: 'Zona de perigo',
              icon: <SectionIcon icon={<AlertTriangle size={18} />} tone="perigo" />,
              title: 'Excluir minha conta',
              summary: 'Sem volta',
              content: (
                <>
                  <SectionHint>
                    Apaga a conta e seus dados pessoais definitivamente. Tarefas e projetos de
                    equipes que você criou passam para quem ficar. Não dá para desfazer.
                  </SectionHint>
                  <ActionRow
                    icon={<Trash2 size={18} />}
                    iconClass="bg-rose-50 dark:bg-rose-500/10 text-danger"
                    title="Excluir minha conta"
                    description="Pede confirmação e sua senha antes de apagar"
                    onClick={() => setConfirmDelete(true)}
                  />
                </>
              ),
            },
          ]}
        />
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
            {proExiste && (
              <>
                <strong className="block text-text-primary mt-3 mb-1">Assinatura do Pro</strong>
                Excluir a conta não cancela uma assinatura feita pelo Google Play. Cancele na
                Play Store também, senão a cobrança continua.
              </>
            )}
          </>
        }
        confirmLabel="Sim, quero excluir"
        cancelLabel="Cancelar"
        tone="danger"
        mascotState="sad"
        onConfirm={() => setShowDeleteForm(true)}
        onClose={() => setConfirmDelete(false)}
      />

      {/* Etapa 2 — a confirmação de verdade: a prova de identidade + EXCLUIR. */}
      <Modal isOpen={showDeleteForm} onClose={closeDeleteForm} title="Excluir minha conta" size="md">
        {delEmailEnviado ? (
          /* Conta sem senha: o pedido saiu e a exclusão continua no e-mail.
             Fim de caminho nesta tela — não há o que preencher aqui. */
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2 rounded-xl border border-border bg-bg-secondary/60 px-4 py-3 text-sm text-text-secondary">
              <Mail size={16} className="mt-0.5 shrink-0" />
              <span>
                Enviamos um e-mail para <strong className="text-text-primary">{account?.email}</strong>{' '}
                com o link que conclui a exclusão. Ele vale por 30 minutos e só pode ser usado uma
                vez.
                <br />
                <span className="text-xs">
                  Sua conta continua intacta até você abrir esse link e confirmar.
                </span>
              </span>
            </div>
            <Button type="button" variant="secondary" className="rounded-xl" onClick={closeDeleteForm}>
              Fechar
            </Button>
          </div>
        ) : (
        <form onSubmit={handleDeleteAccount} className="flex flex-col gap-4">
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>Último passo. Depois disso não há como recuperar a conta.</span>
          </div>

          {/* Quem entra pelo Google não tem senha para digitar. A prova de que é
              a pessoa vem do e-mail — a mesma exigência do "esqueci minha
              senha", e a única que funciona sem depender de um token que o modo
              redirect do Google nunca entrega ao navegador. */}
          {confirmaPorEmail ? (
            <div className="flex items-start gap-2 rounded-xl border border-border bg-bg-secondary/60 px-4 py-3 text-sm text-text-secondary">
              <Mail size={16} className="mt-0.5 shrink-0" />
              <span>
                Você entra com o Google e esta conta não tem senha. Vamos enviar um link de
                confirmação para <strong className="text-text-primary">{account?.email}</strong> —
                a exclusão só acontece quando você abrir esse link.
              </span>
            </div>
          ) : (
            <PasswordInput
              label="Sua senha"
              autoComplete="current-password"
              placeholder="••••••••"
              value={delPassword}
              onChange={e => {
                setDelPassword(e.target.value);
                if (delError) setDelError('');
              }}
              autoFocus
            />
          )}

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
              {confirmaPorEmail ? 'Enviar link de confirmação' : 'Excluir para sempre'}
            </Button>
          </div>
        </form>
        )}
      </Modal>
    </AppLayout>
  );
};

export default SettingsPage;
