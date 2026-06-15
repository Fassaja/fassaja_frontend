import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import { CelebrationProvider } from '@/contexts/CelebrationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProjectsProvider } from '@/contexts/ProjectsContext';
import { TasksProvider } from '@/contexts/TasksContext';
import { AppRoutes } from '@/routes/AppRoutes';
import { TopProgressBar } from '@/components/layout/TopProgressBar';

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <CelebrationProvider>
          <BrowserRouter>
            <AuthProvider>
              <ProjectsProvider>
                <TasksProvider>
                  <TopProgressBar />
                  <AppRoutes />
                </TasksProvider>
              </ProjectsProvider>
            </AuthProvider>
          </BrowserRouter>
        </CelebrationProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
