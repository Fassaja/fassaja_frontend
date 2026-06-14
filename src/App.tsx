import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UserProvider } from '@/contexts/UserContext';
import { CelebrationProvider } from '@/contexts/CelebrationContext';
import { AppRoutes } from '@/routes/AppRoutes';

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <CelebrationProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CelebrationProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
