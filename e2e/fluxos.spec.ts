import { test, expect, entrar, pronta, tarefas } from './apoio';

/**
 * Os fluxos que mais quebram em silêncio: criar, desfazer, a criação na
 * coluna e o painel lateral. Cada um confere o que de fato chegou à "API".
 */

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'fluxos de teclado e painel são do desktop');

  test('paleta cria tarefa a partir do texto', async ({ page }) => {
    const escritas = await entrar(page);
    await page.goto('/');
    await pronta(page);
    await page.keyboard.press('Control+k');
    await expect(page.getByPlaceholder('Buscar ou digitar um comando…')).toBeFocused();
    await page.keyboard.type('+ revisar proposta amanhã !alta #trabalho');
    await expect(page.getByRole('dialog', { name: 'Buscar e comandos' })).toContainText('Prioridade alta');
    await page.keyboard.press('Enter');
    await expect.poll(() => escritas.length).toBe(1);
    expect(escritas[0]).toMatchObject({
      metodo: 'POST',
      caminho: '/tasks',
      corpo: { title: 'revisar proposta', priority: 'high', tagIds: ['tg1'] },
    });
  });

  test('formulário: texto acende os botões e Ctrl+Enter cria', async ({ page }) => {
    const escritas = await entrar(page, tarefas(3));
    await page.goto('/tasks');
    await pronta(page);
    await page.keyboard.press('n');
    await page.keyboard.type('Enviar relatório sexta !baixa');
    const linha = page.getByRole('group', { name: 'Propriedades da tarefa' });
    await expect(linha).toContainText('Baixa');
    await page.getByLabel('Descrição da tarefa').fill('com os números');
    await page.keyboard.press('Control+Enter');
    await expect.poll(() => escritas.length).toBe(1);
    expect(escritas[0].corpo).toMatchObject({ title: 'Enviar relatório', priority: 'low', description: 'com os números' });
    expect(escritas[0].corpo.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('excluir some na hora, "Desfazer" devolve e nada vai ao servidor', async ({ page }) => {
    const escritas = await entrar(page, tarefas(3));
    await page.goto('/tasks');
    await pronta(page);
    const cartao = page.locator('.animate-card-in').filter({ hasText: 'Tarefa de exemplo 0' });
    await cartao.hover();
    await cartao.getByRole('button', { name: 'Excluir tarefa' }).click();
    await expect(cartao).toHaveCount(0);
    await page.locator('[role=status]').filter({ hasText: 'excluída' }).getByRole('button', { name: 'Desfazer' }).click();
    await expect(page.locator('.animate-card-in').filter({ hasText: 'Tarefa de exemplo 0' })).toHaveCount(1);
    await page.waitForTimeout(7000); // passou a janela do aviso
    expect(escritas.filter(e => e.metodo === 'DELETE')).toEqual([]);
  });

  test('"Adicionar tarefa" cria já no status da coluna', async ({ page }) => {
    const escritas = await entrar(page, tarefas(3));
    await page.goto('/tasks');
    await pronta(page);
    const coluna = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Em andamento' }) });
    await coluna.getByRole('button', { name: 'Adicionar tarefa' }).click();
    await page.keyboard.type('Ligar fornecedor !alta');
    await page.keyboard.press('Enter');
    await expect.poll(() => escritas.length).toBe(1);
    expect(escritas[0].corpo).toMatchObject({ title: 'Ligar fornecedor', status: 'in_progress', priority: 'high' });
  });

  test('painel lateral edita no lugar e troca de tarefa', async ({ page }) => {
    const escritas = await entrar(page, tarefas(3));
    await page.goto('/tasks');
    await pronta(page);
    await page.locator('.animate-card-in').getByText('Tarefa de exemplo 0', { exact: true }).click();
    const painel = page.locator('aside[role=dialog]');
    await expect(painel).toBeVisible();
    await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
    await painel.getByRole('button', { name: /^Prioridade:/ }).click();
    await page.getByRole('option', { name: 'Alta' }).click();
    await expect.poll(() => escritas.length).toBe(1);
    expect(escritas[0]).toMatchObject({ metodo: 'PATCH', caminho: '/tasks/t0', corpo: { priority: 'high' } });
    await page.locator('.animate-card-in').getByText('Tarefa de exemplo 1', { exact: true }).click();
    await expect(painel.getByLabel('Título da tarefa')).toHaveValue('Tarefa de exemplo 1');
    await page.keyboard.press('Escape');
    await expect(painel).toHaveCount(0);
  });

  test('atalhos: ? abre a lista e G T vai para Tarefas', async ({ page }) => {
    await entrar(page);
    await page.goto('/reports');
    await pronta(page);
    await page.keyboard.press('Shift+Slash');
    await expect(page.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeVisible();
    await page.keyboard.press('Escape');
    // Durante a animação de saída a janela ainda conta como aberta, e os
    // atalhos de uma tecla ficam quietos de propósito.
    await expect(page.getByRole('dialog', { name: 'Atalhos de teclado' })).toHaveCount(0);
    await page.keyboard.press('g');
    await page.keyboard.press('t');
    await expect(page).toHaveURL(/\/tasks$/);
  });
});

test.describe('celular', () => {
  test.skip(({ isMobile }) => !isMobile, 'abas e folha são do celular');

  test('quadro em abas: uma coluna por vez', async ({ page }) => {
    await entrar(page, tarefas(9));
    await page.goto('/tasks');
    await pronta(page);
    const abas = page.getByRole('tab');
    await expect(abas).toHaveCount(3);
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await page.getByRole('tab', { name: /Em andamento/ }).click();
    await expect(page.getByRole('tab', { selected: true })).toContainText('Andamento');
  });

  test('nova tarefa abre como folha embaixo', async ({ page }) => {
    await entrar(page);
    await page.goto('/tasks?nova=1');
    await pronta(page);
    const folha = page.getByRole('dialog', { name: 'Nova tarefa' });
    await expect(folha).toBeVisible();
    const caixa = await folha.boundingBox();
    const vp = page.viewportSize()!;
    expect(Math.round(caixa!.y + caixa!.height)).toBeGreaterThanOrEqual(vp.height - 2);
    await page.keyboard.type('Comprar pão');
    await expect(page.getByLabel('Título da tarefa')).toHaveValue('Comprar pão');
  });
});
