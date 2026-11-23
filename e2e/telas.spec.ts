import { test, expect, entrar, tarefas } from './apoio';

/**
 * Toda tela abre, mostra o título e não lança erro — a rede de segurança mais
 * barata contra uma tela que quebra inteira (um import que falta, um contexto
 * fora do lugar, um componente que estoura com dado vazio).
 */
const TELAS: [string, string | RegExp][] = [
  ['/', /Olá|Fassajá/],
  ['/tasks', 'Minhas Tarefas'],
  ['/projects', 'Projetos'],
  ['/ideas', 'Ideias'],
  ['/agenda', 'Agenda'],
  ['/calendar', 'Calendário'],
  ['/focus', 'Foco'],
  ['/priorities', 'Prioridades'],
  ['/reports', 'Relatórios'],
  ['/ai', /Assistente/],
  ['/profile', 'Perfil'],
  ['/settings', 'Configurações'],
];

for (const [rota, titulo] of TELAS) {
  test(`abre ${rota}`, async ({ page }) => {
    await entrar(page, tarefas(6));
    await page.goto(rota);
    await expect(page.locator('h1').first()).toContainText(titulo);
  });
}

test('páginas públicas abrem sem conta', async ({ page }) => {
  for (const rota of ['/login', '/termos', '/privacidade', '/rota-que-nao-existe']) {
    await page.goto(rota);
    await expect(page.locator('body')).not.toBeEmpty();
  }
});
