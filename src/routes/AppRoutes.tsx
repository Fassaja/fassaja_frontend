import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from '@/pages/DashboardPage';
import AuthPage from '@/pages/AuthPage';
import { PlayBillingSync } from '@/components/pro/PlayBillingSync';
import { useAuth } from '@/contexts/AuthContext';
import { paginaSobDemanda } from './paginaSobDemanda';

/*
 * Dashboard e Login ficam no arquivo principal: são as duas portas de entrada,
 * e carregá-las sob demanda só acrescentaria uma ida a mais ao servidor antes
 * da primeira tela. Todo o resto vem quando é aberto.
 */
const TasksPage = paginaSobDemanda(() => import('@/pages/TasksPage'));
const ProjectsPage = paginaSobDemanda(() => import('@/pages/ProjectsPage'));
const CalendarPage = paginaSobDemanda(() => import('@/pages/CalendarPage'));
const AgendaPage = paginaSobDemanda(() => import('@/pages/AgendaPage'));
const PrioritiesPage = paginaSobDemanda(() => import('@/pages/PrioritiesPage'));
const FocusPage = paginaSobDemanda(() => import('@/pages/FocusPage'));
const ReportsPage = paginaSobDemanda(() => import('@/pages/ReportsPage'));
const ProfilePage = paginaSobDemanda(() => import('@/pages/ProfilePage'));
const SettingsPage = paginaSobDemanda(() => import('@/pages/SettingsPage'));
const AiAssistantPage = paginaSobDemanda(() => import('@/pages/AiAssistantPage'));
const NotFoundPage = paginaSobDemanda(() => import('@/pages/NotFoundPage'));
const PasswordResetPage = paginaSobDemanda(() => import('@/pages/PasswordResetPage'));
const AccountDeletionPage = paginaSobDemanda(() => import('@/pages/AccountDeletionPage'));
const JoinPage = paginaSobDemanda(() => import('@/pages/JoinPage'));
const ProPage = paginaSobDemanda(() => import('@/pages/ProPage'));
const IdeasPage = paginaSobDemanda(() => import('@/pages/IdeasPage'));
const LegalPage = paginaSobDemanda(() => import('@/pages/LegalPage'));
const TeamShell = paginaSobDemanda(() =>
  import('@/components/team/TeamShell').then(m => ({ default: m.TeamShell })),
);

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { status } = useAuth();
  return status === 'authed' ? children : <Navigate to="/login" replace />;
};

/**
 * Adianta as páginas mais prováveis enquanto o navegador está ocioso, para o
 * primeiro clique nelas não esperar o download.
 *
 * Só para quem tem conta (o visitante quase sempre vai é para o cadastro) e
 * nunca com "economia de dados" ligada: ali cada arquivo é pedido só se for
 * mesmo usado.
 */
function useAdiantarPaginas(ativo: boolean): void {
  useEffect(() => {
    if (!ativo) return;
    const conexao = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conexao?.saveData) return;

    const adiantar = () => {
      TasksPage.preload();
      ProjectsPage.preload();
      AgendaPage.preload();
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(adiantar, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(adiantar, 2500);
    return () => clearTimeout(id);
  }, [ativo]);
}

export const AppRoutes: React.FC = () => {
  const { status } = useAuth();
  useAdiantarPaginas(status === 'authed');

  return (
    <>
    <PlayBillingSync />
    {/* Só aparece na PRIMEIRA carga direto numa página sob demanda: nas
        navegações o roteador segura a tela anterior até a nova chegar
        (`v7_startTransition` no App), e a barra do topo avisa que está indo.
        Por isso é só o fundo — um esqueleto piscaria por um instante. */}
    <Suspense fallback={<div className="min-h-screen bg-bg-main" />}>
    <Routes>
      {/* Públicas (visitante) */}
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/forgot-password" element={<PasswordResetPage mode="request" />} />
      <Route path="/reset-password" element={<PasswordResetPage mode="reset" />} />
      <Route path="/join/:token" element={<JoinPage />} />
      <Route path="/" element={<DashboardPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      {/* Lista de espera do Pro. Pública de propósito: quem chega de fora
          (LinkedIn, indicação) é justamente o público que precisamos medir. */}
      <Route path="/apoiar" element={<ProPage />} />

      {/* Exigem conta */}
      <Route path="/ideas" element={<RequireAuth><IdeasPage /></RequireAuth>} />
      <Route path="/projects" element={<RequireAuth><ProjectsPage /></RequireAuth>} />
      <Route path="/calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
      <Route path="/agenda" element={<RequireAuth><AgendaPage /></RequireAuth>} />
      <Route path="/focus" element={<RequireAuth><FocusPage /></RequireAuth>} />
      <Route path="/priorities" element={<RequireAuth><PrioritiesPage /></RequireAuth>} />
      <Route path="/reports" element={<RequireAuth><ReportsPage /></RequireAuth>} />
      {/* A equipe e a aba vivem na URL: `/team/:teamId/:aba`. Antes tudo era
          estado local — recarregar voltava para a primeira equipe e não havia
          como mandar a alguém o link do painel de um time. `/team` sozinho
          continua valendo e cai na primeira equipe. */}
      <Route path="/team" element={<RequireAuth><TeamShell /></RequireAuth>} />
      <Route path="/team/:teamId" element={<RequireAuth><TeamShell /></RequireAuth>} />
      <Route path="/team/:teamId/:tab" element={<RequireAuth><TeamShell /></RequireAuth>} />
      <Route path="/ai" element={<RequireAuth><AiAssistantPage /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
      {/* Confirmação da exclusão de conta, aberta pelo link do e-mail.
          FORA do RequireAuth de propósito: quem chega sem sessão precisa ler
          "entre para confirmar", e não ser jogado no /login sem explicação —
          a própria página trata os três casos (sem token, sem sessão, ok). */}
      <Route path="/excluir-conta" element={<AccountDeletionPage />} />
      {/* Públicas: quem lê é o visitante decidindo se cria conta, ou o revisor
          da Play Store conferindo a URL da política. */}
      <Route path="/termos" element={<LegalPage kind="termos" />} />
      <Route path="/privacidade" element={<LegalPage kind="privacidade" />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
    </>
  );
};
