import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import { CelebrationProvider } from '@/contexts/CelebrationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppRoutes } from '@/routes/AppRoutes';

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <CelebrationProvider>
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </CelebrationProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
