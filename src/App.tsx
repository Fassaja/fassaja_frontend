import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@/contexts/ToastContext';
import { UserProvider } from '@/contexts/UserContext';
import { CelebrationProvider } from '@/contexts/CelebrationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProjectsProvider } from '@/contexts/ProjectsContext';
import { TagsProvider } from '@/contexts/TagsContext';
import { TasksProvider } from '@/contexts/TasksContext';
import { EventsProvider } from '@/contexts/EventsContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { AppRoutes } from '@/routes/AppRoutes';
import { TopProgressBar } from '@/components/layout/TopProgressBar';

function App() {
  return (
    <ToastProvider>
      <UserProvider>
        <CelebrationProvider>
          <BrowserRouter>
            <AuthProvider>
              <ProjectsProvider>
                <TagsProvider>
                  <TasksProvider>
                    <EventsProvider>
                      <NotificationsProvider>
                        <TopProgressBar />
                        <AppRoutes />
                      </NotificationsProvider>
                    </EventsProvider>
                  </TasksProvider>
                </TagsProvider>
              </ProjectsProvider>
            </AuthProvider>
          </BrowserRouter>
        </CelebrationProvider>
      </UserProvider>
      </ToastProvider>
  );
}

export default App;
