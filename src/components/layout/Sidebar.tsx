import React, { useLayoutEffect, useRef, useState } from 'react';
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
  Home,
  Flag,
  Users,
  ChevronRight,
  ChevronLeft,
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
  Timer,
} from 'lucide-react';
import { OPEN_TOUR_EVENT } from './PlatformTourModal';
import { NotificationsHelp } from './NotificationsHelp';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FeedbackModal } from './FeedbackModal';
import { Tooltip } from '@/components/common/Tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useUser, initialsOf } from '@/contexts/UserContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { SIDEBAR_LARGURA, useSidebar } from '@/contexts/SidebarContext';

/**
 * O menu em quatro blocos, cada um respondendo a uma pergunta diferente: o que
 * eu faço agora, quando as coisas acontecem, onde eu penso em voz alta e como
 * o trabalho está indo.
 *
 * A divisão já estava escrita aqui em comentário e não aparecia na tela: eram
 * onze itens seguidos, com o mesmo peso, e o olho tinha de percorrer a lista
 * inteira toda vez. Um rótulo pequeno por bloco é barato — não acrescenta
 * nível de navegação nem esconde nada — e transforma uma lista de onze numa
 * escolha entre quatro.
 *
 * Recolhida, o rótulo não cabe em 80px e vira uma linha divisória: a mesma
 * fronteira, dita com o que existe de espaço.
 */
const navGroups: {
  label: string;
  items: { icon: typeof Home; label: string; path: string; free: boolean }[];
}[] = [
  {
    label: 'Trabalho',
    items: [
      { icon: Home, label: 'Dashboard', path: '/', free: true },
      { icon: CheckSquare, label: 'Minhas Tarefas', path: '/tasks', free: true },
      { icon: Flag, label: 'Prioridades', path: '/priorities', free: false },
      { icon: FolderOpen, label: 'Projetos', path: '/projects', free: false },
      { icon: Timer, label: 'Foco', path: '/focus', free: false },
    ],
  },
  {
    label: 'Tempo',
    items: [
      { icon: CalendarClock, label: 'Agenda', path: '/agenda', free: false },
      { icon: Calendar, label: 'Calendário', path: '/calendar', free: false },
    ],
  },
  {
    label: 'Explorar',
    items: [
      { icon: Sparkles, label: 'Assistente IA', path: '/ai', free: false },
      { icon: Lightbulb, label: 'Ideias', path: '/ideas', free: false },
    ],
  },
  {
    label: 'Acompanhar',
    items: [
      { icon: Users, label: 'Equipe', path: '/team', free: false },
      { icon: BarChart3, label: 'Relatórios', path: '/reports', free: false },
    ],
  },
];

/**
 * Onde o menu estava rolado, guardado FORA do React.
 *
 * Cada página renderiza o seu próprio <AppLayout>, então navegar troca o
 * componente inteiro naquela posição da árvore: a Sidebar é destruída e
 * recriada, e o `scrollTop` do <nav> volta a zero junto. O efeito para quem
 * usa é o menu pulando para o topo toda vez que se escolhe um destino —
 * justamente quando a pessoa acabou de rolar até ele.
 *
 * Uma variável de módulo sobrevive à remontagem (um `useRef` não: ele morre
 * com o componente). Não é estado de render — ninguém precisa re-renderizar
 * por causa dela —, então não tem por que ser `useState`.
 *
 * A correção de raiz é a Sidebar não remontar, o que pede <AppLayout> como
 * rota de layout com <Outlet>. Isso mexe em todas as páginas, porque cada uma
 * hoje passa título e ação pelo próprio AppLayout — fica para quando houver
 * espaço para fazer direito.
 */
let rolagemDoMenu = 0;

export const Sidebar: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  // A gaveta do celular vive no contexto: quem a abre é o "Mais" da dock.
  const { collapsed, toggleCollapsed, mobileOpen: isOpen, setMobileOpen: setIsOpen } = useSidebar();
  // Trava o scroll da página atrás enquanto o menu (drawer mobile) está aberto.
  useBodyScrollLock(isOpen);
  /**
   * "Recolhida" vale só no desktop. No celular a barra é uma gaveta que abre
   * por cima do conteúdo, e ali ela precisa aparecer inteira — recolhida em
   * cima da gaveta daria uma tira de 80px com ícones soltos no meio da tela.
   * Por isso o estado é aplicado por classes `lg:` e o conteúdo consulta este
   * booleano, que já é falso enquanto a gaveta está aberta.
   */
  const rail = collapsed && !isOpen;
  const location = useLocation();
  const navigate = useNavigate();
  const { account, isGuest, logout, requireAuth } = useAuth();
  const { user } = useUser();

  const navRef = useRef<HTMLElement>(null);

  // useLayoutEffect, e não useEffect: a posição é devolvida ANTES da pintura.
  // Com o efeito comum dá para ver o menu no topo por um quadro antes de
  // saltar para o lugar certo — troca um incômodo por outro.
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    el.scrollTop = rolagemDoMenu;
    const aoRolar = () => {
      rolagemDoMenu = el.scrollTop;
    };
    el.addEventListener('scroll', aoRolar, { passive: true });
    return () => el.removeEventListener('scroll', aoRolar);
  }, []);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const goTo = (path: string) => {
    setShowMenu(false);
    setIsOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* No celular, quem abre a gaveta é o "Mais" da dock de baixo
          (MobileDock). O botão flutuante de hambúrguer saiu: era a única
          coisa na tela com cara de site. Fechar continua sendo tocar fora
          (overlay) ou escolher um destino. */}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-tela ${SIDEBAR_LARGURA.aside.aberta} bg-surface border-r border-border
          transform transition-[transform,width] duration-300 ease-out-expo z-40
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${collapsed ? SIDEBAR_LARGURA.aside.recolhida : ''}
        `}
      >
        {/* A flechinha. Fica na BORDA, meio para fora, e não dentro da barra:
            recolhida, a barra tem 80px e um botão interno disputaria espaço com
            os ícones. Só no desktop — no celular quem fecha é o X do topo.

            Precisa ficar fora do container de scroll abaixo, senão some junto
            com o conteúdo ao rolar o menu. */}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expandir' : 'Recolher'}
          className="hidden lg:flex absolute -right-3 top-24 z-50 w-6 h-6 items-center justify-center rounded-full border border-border bg-surface text-text-secondary shadow-sm transition-colors hover:text-primary-vibrant hover:border-primary-vibrant/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-light/60"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Sem overflow aqui: quem rola é o <nav>, que já tem `flex-1
            overflow-y-auto`. O scroll nos dois recortava o menu da conta —
            `overflow-y` obriga o eixo x a `auto` pelo CSS —, e recolhida a
            barra tem 80px, largura em que o menu não caberia. Agora ele
            transborda para fora da barra, como se espera de um rail. */}
        <div className="flex flex-col h-full">
          {/* Logo. Recolhida, troca pela marca quadrada: o logo com o nome tem
              288px de largura e não cabe numa barra de 80px — encolhê-lo até
              caber deixaria o texto ilegível. */}
          <div className="pt-6 pb-3 flex justify-center">
            <div className="w-full h-20 flex items-center justify-center overflow-hidden">
              {rail ? (
                /* 64px numa barra de 80: o desenho tem margem transparente
                   própria (ocupa ~60% da largura do arquivo), então a figura
                   visível fica em torno de 38px e sobra respiro dos dois
                   lados. Sem `rounded`, que só fazia sentido quando havia um
                   fundo para arredondar. */
                <img
                  src="/icon-192.png"
                  alt="Fassajá"
                  className="w-16 h-16 object-contain select-none"
                  draggable={false}
                />
              ) : (
                <img
                  src="/logofassaja.png"
                  data-logo
                  alt="Fassajá"
                  className="max-w-none w-72 h-auto object-contain select-none"
                  draggable={false}
                />
              )}
            </div>
          </div>

          {/* Navigation */}
          {/* `flex flex-col` e não só `space-y-1`: recolhida, cada item passa a
              vir dentro do <span inline-flex> do Tooltip, e caixa inline se
              apoia na linha de base do texto — o que acrescenta alguns pixels
              embaixo de cada item e faria o espaçamento do rail diferir do
              modo expandido. Como filhos de uma coluna flex, os dois casos
              medem igual. */}
          <nav
            ref={navRef}
            className={`flex flex-1 flex-col space-y-1 overflow-y-auto overflow-x-hidden ${
              rail ? 'px-3' : 'px-4'
            }`}
          >
            {navGroups.map((group, indiceDoGrupo) => (
              <div
                key={group.label}
                className={`flex flex-col space-y-1 ${indiceDoGrupo > 0 ? 'pt-4' : ''}`}
              >
                {rail ? (
                  /* Sem rótulo: só a fronteira. `aria-hidden` porque o leitor
                     de tela já recebe o nome do grupo pelo aria-label do
                     <div role="group"> abaixo — a linha é redundante para ele. */
                  indiceDoGrupo > 0 && <hr aria-hidden="true" className="mx-2 mb-3 border-border" />
                ) : (
                  <p className="px-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-text-soft">
                    {group.label}
                  </p>
                )}
                <div role="group" aria-label={group.label} className="flex flex-col space-y-1">
            {group.items.map(item => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const locked = isGuest && !item.free;
              /* Recolhida, o item vira um quadrado com o ícone centrado. O
                 `justify-center` sozinho não bastaria: o gap e o padding
                 lateral continuariam reservando espaço para o rótulo ausente,
                 e o ícone ficaria fora do eixo. */
              /* w-full porque, recolhida, o item vira filho do <span
                 inline-flex> do Tooltip e passaria a se dimensionar pelo
                 conteúdo — o realce do item ativo encolheria para o tamanho do
                 ícone em vez de ocupar a linha. */
              const baseClass = `
                w-full flex items-center rounded-xl font-medium text-[15px]
                transition-colors duration-200
                ${rail ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5'}
                ${active
                  ? 'bg-primary-vibrant text-white shadow-sm shadow-primary-vibrant/30'
                  : 'text-primary-dark/80 hover:bg-primary-light hover:text-primary-dark'
                }
              `;

              const conteudo = locked ? (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    requireAuth(
                      `"${item.label}" está disponível para quem tem conta. Faça login para acessar — ou continue como visitante usando o Dashboard e Minhas Tarefas.`,
                    );
                  }}
                  className={`${baseClass} w-full text-left`}
                  aria-label={rail ? `${item.label} (entre para acessar)` : undefined}
                >
                  <Icon size={20} className="text-text-soft shrink-0" />
                  {!rail && (
                    <>
                      <span className="flex-1 text-text-soft">{item.label}</span>
                      <Lock size={15} className="text-text-soft" />
                    </>
                  )}
                </button>
              ) : (
                <Link
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={rail ? item.label : undefined}
                  className={baseClass}
                >
                  <Icon size={20} className={`shrink-0 ${active ? 'text-white' : 'text-text-secondary'}`} />
                  {!rail && <span className="truncate">{item.label}</span>}
                </Link>
              );

              /* Recolhida, o ícone sozinho não diz para onde leva — a dica é o
                 rótulo. Envolver SEMPRE deixaria uma dica redundante repetindo
                 o texto que já está na tela. */
              return rail ? (
                <Tooltip
                  key={item.path}
                  content={item.label}
                  description={locked ? 'Entre para acessar' : undefined}
                  className="w-full"
                >
                  {conteudo}
                </Tooltip>
              ) : (
                <React.Fragment key={item.path}>{conteudo}</React.Fragment>
              );
            })}
                </div>
              </div>
            ))}
          </nav>

          {/* Guest CTA. Recolhida vira só o botão de entrar: o cartão com duas
              linhas de texto não cabe em 80px. */}
          {isGuest && rail && (
            <div className="px-3 pt-4">
              <Tooltip content="Entrar" description="Você está como visitante" className="w-full">
                <button
                  onClick={() => goTo('/login')}
                  aria-label="Entrar"
                  className="w-full flex items-center justify-center py-2.5 rounded-xl bg-primary-vibrant text-white hover:bg-primary-hover active:scale-[0.98] transition-all"
                >
                  <LogIn size={18} />
                </button>
              </Tooltip>
            </div>
          )}
          {isGuest && !rail && (
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
          <div className={`pt-4 ${rail ? 'px-3' : 'px-4'}`}>
            <div className="relative">
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowMenu(false)}
                  />
                  <div
                    className={`absolute bottom-full mb-2 bg-surface rounded-xl border-2 border-border ring-1 ring-primary-vibrant/20 shadow-xl z-40 overflow-hidden ${
                      rail ? 'left-0 w-60' : 'left-0 right-0'
                    }`}
                  >
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
                      Apoiar o Fassajá
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
                className={`w-full flex items-center rounded-xl hover:bg-bg-secondary transition-colors ${
                  rail ? 'justify-center p-2' : 'gap-3 p-2'
                }`}
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
                {!rail && (
                  <>
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
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Respiro entre o menu e a borda inferior. env(safe-area-inset-bottom)
              cobre a barra de gestos do celular, que o dvh não desconta. */}
          <div className="pb-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }} />

          <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Fale conosco" size="md">
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Tem alguma dúvida ou sugestão? A equipe Fassajá adora ouvir você.
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
                    Ver tutorial do Fassajá
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
