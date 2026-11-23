import { test as base, expect, type Page } from '@playwright/test';

/**
 * Apoio dos testes de tela: sessão de mentira, API simulada e a regra de que
 * nenhuma tela pode lançar erro.
 */

export const CONTA = { id: 'u1', name: 'Ana Teste', email: 'ana@example.com', dailyGoal: 3, weeklyGoal: 15 };

export const TAGS = [
  { id: 'tg1', name: 'trabalho', color: '#2477FF' },
  { id: 'tg2', name: 'casa', color: '#22C55E' },
];

const dia = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export interface TarefaFalsa {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  dueDate?: string;
  description?: string;
  completedAt?: string;
}

/** `n` tarefas variadas, sempre no futuro (nenhuma vira "atrasada"). */
export function tarefas(n: number): TarefaFalsa[] {
  const st = ['pending', 'in_progress', 'completed'] as const;
  const pr = ['low', 'medium', 'high'] as const;
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    title: `Tarefa de exemplo ${i}`,
    status: st[i % 3],
    priority: pr[i % 3],
    createdAt: new Date(Date.now() - i * 36e5).toISOString(),
    dueDate: dia((i % 14) + 1),
  }));
}

/** Um pedido de escrita que chegou à "API": método, caminho e corpo. */
export interface Escrita {
  metodo: string;
  caminho: string;
  corpo: Record<string, unknown>;
}

/**
 * Entra como uma conta de mentira e simula a API: leituras devolvem a lista
 * dada (ou vazio), escritas são registradas em `escritas` e respondidas com
 * a tarefa mesclada.
 */
export async function entrar(page: Page, lista: TarefaFalsa[] = []): Promise<Escrita[]> {
  const escritas: Escrita[] = [];
  await page.route(/\/api\//, async rota => {
    const req = rota.request();
    const url = new URL(req.url());
    const caminho = url.pathname.replace(/^\/api/, '');
    const metodo = req.method();
    if (caminho.startsWith('/auth/me')) return rota.fulfill({ json: CONTA });
    if (caminho.startsWith('/tags')) return rota.fulfill({ json: TAGS });
    if (caminho.startsWith('/focus')) return rota.fulfill({ status: 404, json: {} });
    if (metodo !== 'GET') {
      const corpo = (req.postDataJSON?.() as Record<string, unknown>) ?? {};
      // O fuso da conta é sincronizado sozinho ao abrir o app; não é uma
      // escrita que algum teste provoque, então não entra na lista.
      if (caminho.startsWith('/tasks/reminder-settings')) return rota.fulfill({ json: {} });
      escritas.push({ metodo, caminho, corpo });
      if (metodo === 'DELETE') return rota.fulfill({ status: 204, body: '' });
      const id = caminho.match(/^\/tasks\/([^/]+)/)?.[1];
      const base = lista.find(t => t.id === id) ?? { id: `novo${escritas.length}`, createdAt: new Date().toISOString() };
      return rota.fulfill({ json: { ...base, ...corpo } });
    }
    if (/^\/tasks\/?$/.test(caminho)) return rota.fulfill({ json: lista });
    return rota.fulfill({ json: [] });
  });
  await page.goto('/login');
  await page.evaluate(conta => {
    localStorage.setItem('fassaja_session', JSON.stringify(conta));
    localStorage.setItem('fassaja_tour_seen', '1');
  }, CONTA);
  return escritas;
}

/**
 * Espera a tela estar de pé (título da página visível). Atalhos de teclado e
 * cliques antes disso caem antes de os ouvintes existirem.
 */
export async function pronta(page: Page): Promise<void> {
  await expect(page.locator('h1').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
}

/**
 * `test` com a regra embutida: qualquer erro de página (exceção não tratada)
 * reprova o teste no fim, mesmo que as asserções tenham passado.
 */
export const test = base.extend<{ errosDaPagina: string[] }>({
  errosDaPagina: [
    async ({ page }, use) => {
      const erros: string[] = [];
      page.on('pageerror', e => erros.push(e.message));
      await use(erros);
      expect(erros, 'a página lançou erro').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
