import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  FolderOpen,
  Calendar,
  BarChart3,
  Settings,
  Menu,
  X,
  Home,
  Flag,
  Users,
  ChevronRight,
  LogOut,
  UserCircle,
  Mail,
  MessageCircle,
  Lock,
  LogIn,
} from 'lucide-react';
import { Mascot } from '@/components/mascot/Mascot';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useUser, initialsOf } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/', free: true },
  { icon: CheckSquare, label: 'Minhas Tarefas', path: '/tasks', free: true },
  { icon: FolderOpen, label: 'Projetos', path: '/projects', free: false },
  { icon: Calendar, label: 'Calendário', path: '/calendar', free: false },
  { icon: Flag, label: 'Prioridades', path: '/priorities', free: false },
  { icon: BarChart3, label: 'Relatórios', path: '/reports', free: false },
  { icon: Users, label: 'Equipe', path: '/team', free: false },
];

export const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { isGuest, logout } = useAuth();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const goTo = (path: string) => {
    setShowProfileMenu(false);
    setIsOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-xl border border-border shadow-sm"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-64 bg-white border-r border-border
          transform transition-transform duration-300 z-40
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="pt-6 pb-3 flex justify-center">
            <div className="w-full h-20 flex items-center justify-center overflow-hidden">
              <img
                src="/logofassaja.png"
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
                    onClick={() => goTo('/login')}
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

          {/* Guest CTA / User profile */}
          {isGuest ? (
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
          ) : (
          <div className="px-4 pt-4">
            <div className="relative">
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border-2 border-border ring-1 ring-primary-vibrant/20 shadow-xl z-40 overflow-hidden">
                    <button
                      onClick={() => goTo('/profile')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
                    >
                      <UserCircle size={18} className="text-text-secondary" />
                      Meu perfil
                    </button>
                    <button
                      onClick={() => goTo('/settings')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
                    >
                      <Settings size={18} className="text-text-secondary" />
                      Configurações
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowLogout(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-rose-50 border-t border-border transition-colors"
                    >
                      <LogOut size={18} />
                      Sair
                    </button>
                  </div>
                </>
              )}
              <button
                onClick={() => setShowProfileMenu(v => !v)}
                aria-expanded={showProfileMenu}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-bg-secondary transition-colors"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-vibrant to-primary-dark flex items-center justify-center text-white font-bold shrink-0">
                    {initialsOf(user.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-text-primary truncate">{user.name}</p>
                  <p className="text-xs text-text-secondary truncate">{user.role}</p>
                </div>
                <ChevronRight
                  size={18}
                  className={`text-text-soft shrink-0 transition-transform ${showProfileMenu ? '-rotate-90' : ''}`}
                />
              </button>
            </div>
          </div>
          )}

          {/* Help card */}
          <div className="p-4">
            <div className="relative rounded-2xl bg-primary-light p-4 overflow-hidden">
              <div className="relative z-10 max-w-[60%]">
                <p className="text-sm font-bold text-primary-dark">Precisa de ajuda?</p>
                <p className="text-xs text-primary-dark/70 mb-3">Fale conosco</p>
                <button
                  aria-label="Fale conosco"
                  onClick={() => setShowHelp(true)}
                  className="w-8 h-8 rounded-full bg-primary-vibrant text-white flex items-center justify-center hover:bg-primary-hover transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <button
                type="button"
                aria-label="Fale conosco"
                onClick={() => setShowHelp(true)}
                className="absolute right-1 bottom-0 w-24 h-24"
              >
                <Mascot state="happy" size="sm" animate={true} />
              </button>
            </div>
          </div>

          <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Fale conosco" size="md">
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Tem alguma dúvida ou sugestão? A equipe Fassaja adora ouvir você.
              </p>
              <a
                href="mailto:suporte@fassaja.com"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-bg-secondary transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-primary-light text-primary-vibrant flex items-center justify-center">
                  <Mail size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-text-primary">E-mail</span>
                  <span className="block text-xs text-text-secondary">suporte@fassaja.com</span>
                </span>
              </a>
              <a
                href="https://wa.me/5500000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-bg-secondary transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MessageCircle size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-text-primary">Chat de suporte</span>
                  <span className="block text-xs text-text-secondary">Resposta em até 1 dia útil</span>
                </span>
              </a>
            </div>
          </Modal>

          <ConfirmDialog
            isOpen={showLogout}
            title="Sair da conta?"
            message="Você precisará entrar novamente para acessar suas tarefas."
            confirmLabel="Sair"
            cancelLabel="Cancelar"
            tone="danger"
            icon={<LogOut size={24} />}
            onConfirm={() => {
              setShowProfileMenu(false);
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
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
