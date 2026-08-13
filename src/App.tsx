import { MotionConfig } from 'framer-motion';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { UserProvider } from '@/contexts/UserContext';
import { CelebrationProvider } from '@/contexts/CelebrationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProjectsProvider } from '@/contexts/ProjectsContext';
import { TagsProvider } from '@/contexts/TagsContext';
import { TasksProvider } from '@/contexts/TasksContext';
import { EventsProvider } from '@/contexts/EventsContext';
import { IdeasProvider } from '@/contexts/IdeasContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { AppRoutes } from '@/routes/AppRoutes';
import { TopProgressBar } from '@/components/layout/TopProgressBar';

function App() {
  return (
    <MotionConfig reducedMotion="user">
    {/* Mais externo: o tema não depende de sessão nem de dados, e a tela de
        login também precisa dele. */}
    <ThemeProvider>
    <ToastProvider>
      <UserProvider>
        <CelebrationProvider>
          <BrowserRouter>
            <AuthProvider>
              <ProjectsProvider>
                <TagsProvider>
                  <TasksProvider>
                    <EventsProvider>
                      {/* Dentro de Projects: o lembrete de ideia precisa saber
                          se o projeto do qual ela depende já terminou. */}
                      <IdeasProvider>
                        <NotificationsProvider>
                          <TopProgressBar />
                          <AppRoutes />
                        </NotificationsProvider>
                      </IdeasProvider>
                    </EventsProvider>
                  </TasksProvider>
                </TagsProvider>
              </ProjectsProvider>
            </AuthProvider>
          </BrowserRouter>
        </CelebrationProvider>
      </UserProvider>
      </ToastProvider>
    </ThemeProvider>
    </MotionConfig>
  );
}

export default App;
