import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de tela (e2e) contra o build de PRODUÇÃO (`vite preview`), com a API
 * simulada em cada teste (ver e2e/apoio.ts) — não precisam de servidor,
 * banco nem conta.
 *
 * Dois projetos: desktop e celular. Cada arquivo decide em qual roda.
 *
 * Rodar: npm run build && npm run e2e
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    // Gravar rastro de todo teste custa um terço do tempo; para investigar
    // uma falha, rode de novo com --trace on.
    trace: 'off',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1360, height: 850 } } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
