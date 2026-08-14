import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  FolderOpen,
  Calendar,
  CalendarClock,
  BarChart3,
  Settings,
  Menu,
  User,
  X,
  Home,
  Flag,
  Users,
  ChevronRight,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquareHeart,
  Lock,
  LogIn,
  Sparkles,
  PlayCircle,
  HeartHandshake,
  Lightbulb,
} from 'lucide-react';
import { OPEN_TOUR_EVENT } from './PlatformTourModal';
import { NotificationsHelp } from './NotificationsHelp';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FeedbackModal } from './FeedbackModal';
import { useAuth } from '@/contexts/AuthContext';
import { useUser, initialsOf } from '@/contexts/UserContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/**
 * Ordem do menu, em quatro blocos: o trabalho de hoje (painel, tarefas,
 * prioridades, projetos), o tempo (agenda e calendário), o que é exploratório
 * (assistente e ideias) e, por fim, o que é sobre o trabalho (equipe e
 * relatórios).
 */
const navItems = [
  { icon: Home, label: 'Dashboard', path: '/', free: true },
  { icon: CheckSquare, label: 'Minhas Tarefas', path: '/tasks', free: true },
  { icon: Flag, label: 'Prioridades', path: '/priorities', free: false },
  { icon: FolderOpen, label: 'Projetos', path: '/projects', free: false },
  { icon: CalendarClock, label: 'Agenda', path: '/agenda', free: false },
  { icon: Calendar, label: 'Calendário', path: '/calendar', free: false },
  { icon: Sparkles, label: 'Assistente IA', path: '/ai', free: false },
  { icon: Lightbulb, label: 'Ideias', path: '/ideas', free: false },
  { icon: Users, label: 'Equipe', path: '/team', free: false },
  { icon: BarChart3, label: 'Relatórios', path: '/reports', free: false },
];

export const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  // Trava o scroll da página atrás enquanto o menu (drawer mobile) está aberto.
  useBodyScrollLock(isOpen);
  const location = useLocation();
  const navigate = useNavigate();
  const { account, isGuest, logout, requireAuth } = useAuth();
  const { user } = useUser();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const goTo = (path: string) => {
    setShowMenu(false);
    setIsOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
        className="fixed top-4 left-2 z-50 lg:hidden bg-surface p-2 rounded-xl border border-border shadow-sm"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-tela w-64 bg-surface border-r border-border
          transform transition-transform duration-300 ease-out-expo z-40
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Logo */}
          <div className="pt-6 pb-3 flex justify-center">
            <div className="w-full h-20 flex items-center justify-center overflow-hidden">
              <img
                src="/logofassaja.png"
                data-logo
                alt="Fassaja"
                className="max-w-none w-72 h-auto object-contain select-none"
                draggable={false}
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const locked = isGuest && !item.free;
              const baseClass = `
                flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-[15px]
                transition-colors duration-200
                ${active
                  ? 'bg-primary-vibrant text-white shadow-sm shadow-primary-vibrant/30'
                  : 'text-primary-dark/80 hover:bg-primary-light hover:text-primary-dark'
                }
              `;

              if (locked) {
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      setIsOpen(false);
                      requireAuth(
                        `"${item.label}" está disponível para quem tem conta. Faça login para acessar — ou continue como visitante usando o Dashboard e Minhas Tarefas.`,
                      );
                    }}
                    className={`${baseClass} w-full text-left`}
                    title="Entre para acessar"
                  >
                    <Icon size={20} className="text-text-soft" />
                    <span className="flex-1 text-text-soft">{item.label}</span>
                    <Lock size={15} className="text-text-soft" />
                  </button>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={baseClass}
                >
                  <Icon size={20} className={active ? 'text-white' : 'text-text-secondary'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

          </nav>

          {/* Guest CTA */}
          {isGuest && (
            <div className="px-4 pt-4">
              <div className="rounded-2xl border border-border p-3">
                <p className="text-sm font-semibold text-text-primary">Você está como visitante</p>
                <p className="text-xs text-text-secondary mt-0.5 mb-3">
                  Entre para liberar tudo.
                </p>
                <button
                  onClick={() => goTo('/login')}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-primary-vibrant text-white text-sm font-semibold hover:bg-primary-hover active:scale-[0.98] transition-all"
                >
                  <LogIn size={16} /> Entrar
                </button>
              </div>
            </div>
          )}

          {/* Menu (Configurações / Fale conosco / Central de feedbacks) */}
          <div className="px-4 pt-4">
            <div className="relative">
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface rounded-xl border-2 border-border ring-1 ring-primary-vibrant/20 shadow-xl z-40 overflow-hidden">
                    {/* Perfil entra aqui: antes só se chegava pelo avatar do
                        topo, que some no desktop agora que a identidade é esta. */}
                    {!isGuest && (
                      <button
                        onClick={() => goTo('/profile')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
                      >
                        <User size={18} className="text-text-secondary" />
                        Perfil
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (isGuest) {
                          setShowMenu(false);
                          setIsOpen(false);
                          requireAuth('As configurações ficam disponíveis depois que você entra.');
                          return;
                        }
                        goTo('/settings');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
                    >
                      <Settings size={18} className="text-text-secondary" />
                      Configurações
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowHelp(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
                    >
                      <MessageCircle size={18} className="text-text-secondary" />
                      Fale conosco
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        if (isGuest) {
                          setIsOpen(false);
                          requireAuth('A Central de feedbacks fica disponível depois que você entra.');
                          return;
                        }
                        setShowFeedback(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
                    >
                      <MessageSquareHeart size={18} className="text-text-secondary" />
                      Central de feedbacks
                    </button>
                    {/* Sem trava de visitante, ao contrário dos itens acima: quem
                        ainda não tem conta é justamente parte da medição. */}
                    <button
                      onClick={() => goTo('/apoiar')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
                    >
                      <HeartHandshake size={18} className="text-text-secondary" />
                      Apoiar o Fassaja
                    </button>
                    {!isGuest && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowLogout(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-rose-50 border-t border-border transition-colors"
                      >
                        <LogOut size={18} />
                        Sair
                      </button>
                    )}
                  </div>
                </>
              )}
              {/* O gatilho é VOCÊ, não um "Menu" genérico.
                  As ações da conta ficavam atrás de um hambúrguer aqui embaixo,
                  enquanto o avatar morava no canto oposto da tela e só levava
                  ao Perfil. Quem queria sair procurava no avatar e não achava.
                  Juntar identidade e ações num só lugar é o que todo app faz —
                  e é onde o olho procura.

                  Visitante não tem nome nem e-mail, então para ele o gatilho
                  segue sendo o "Menu" (o convite para entrar está logo acima). */}
              <button
                onClick={() => setShowMenu(v => !v)}
                aria-expanded={showMenu}
                aria-label={isGuest ? 'Abrir menu' : 'Abrir menu da conta'}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-bg-secondary transition-colors"
              >
                {isGuest ? (
                  <div className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center text-text-secondary shrink-0">
                    <Menu size={18} />
                  </div>
                ) : user.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-vibrant to-brand-deep flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {initialsOf(user.name)}
                  </span>
                )}
                <div className="flex-1 min-w-0 text-left">
                  {isGuest ? (
                    <p className="text-sm font-semibold text-text-primary">Menu</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-text-secondary truncate">{account?.email}</p>
                    </>
                  )}
                </div>
                <ChevronRight
                  size={18}
                  className={`text-text-soft shrink-0 transition-transform ${showMenu ? '-rotate-90' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Respiro entre o menu e a borda inferior. env(safe-area-inset-bottom)
              cobre a barra de gestos do celular, que o dvh não desconta. */}
          <div className="pb-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }} />

          <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Fale conosco" size="md">
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Tem alguma dúvida ou sugestão? A equipe Fassaja adora ouvir você.
              </p>

              <NotificationsHelp />

              <button
                onClick={() => {
                  setShowHelp(false);
                  window.dispatchEvent(new Event(OPEN_TOUR_EVENT));
                }}
                className="flex w-full items-center gap-3 p-3 rounded-xl border border-border hover:bg-bg-secondary transition-colors text-left"
              >
                <span className="w-10 h-10 rounded-xl bg-primary-light text-primary-vibrant flex items-center justify-center">
                  <PlayCircle size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-text-primary">
                    Ver tutorial do Fassaja
                  </span>
                  <span className="block text-xs text-text-secondary">
                    Um tour rápido pelos principais recursos
                  </span>
                </span>
              </button>
              <a
                href="mailto:fassajasuporte@gmail.com"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-bg-secondary transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-primary-light text-primary-vibrant flex items-center justify-center">
                  <Mail size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-text-primary">E-mail</span>
                  <span className="block text-xs text-text-secondary">fassajasuporte@gmail.com</span>
                </span>
              </a>
            </div>
          </Modal>

          <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />

          <ConfirmDialog
            isOpen={showLogout}
            title="Sair da conta?"
            message="Você precisará entrar novamente para acessar suas tarefas."
            confirmLabel="Sair"
            cancelLabel="Cancelar"
            tone="danger"
            icon={<LogOut size={24} />}
            onConfirm={() => {
              setShowMenu(false);
              setIsOpen(false);
              logout();
            }}
            onClose={() => setShowLogout(false)}
          />
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
