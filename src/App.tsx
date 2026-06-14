import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CelebrationProvider } from '@/contexts/CelebrationContext';
import { AppRoutes } from '@/routes/AppRoutes';

function App() {
  return (
    <ThemeProvider>
      <CelebrationProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </CelebrationProvider>
    </ThemeProvider>
  );
}

export default App;
