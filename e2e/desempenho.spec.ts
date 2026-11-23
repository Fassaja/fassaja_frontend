import { test, expect, entrar, tarefas } from './apoio';

/**
 * Orçamento de desempenho da tela de Tarefas no celular.
 *
 * O que se mede é o NÚMERO DE ELEMENTOS na página logo depois de abrir, e não
 * o tempo: tempo varia com a máquina do CI e daria um teste que falha ao
 * acaso. A quantidade de elementos é determinística e é exatamente o que
 * causou a travada original — com 80 tarefas eram 3.437 elementos (três
 * colunas empilhadas, todos os cartões de uma vez). Com as abas e os lotes,
 * a primeira tela fica bem abaixo do teto.
 *
 * O tempo de bloqueio (soma das tarefas longas) também é medido e anotado no
 * relatório, só para acompanhar — ele não reprova o teste.
 */
const TETO_DE_ELEMENTOS = 1500;

test('Tarefas no celular com 80 tarefas fica abaixo do teto de elementos', async ({ page, isMobile }, info) => {
  test.skip(!isMobile, 'orçamento do celular');
  await page.addInitScript(() => {
    (window as unknown as { __longas: number[] }).__longas = [];
    new PerformanceObserver(l =>
      l.getEntries().forEach(e => (window as unknown as { __longas: number[] }).__longas.push(e.duration)),
    ).observe({ type: 'longtask', buffered: true });
  });
  await entrar(page, tarefas(80));
  await page.goto('/tasks');
  await expect(page.getByRole('tabpanel')).toBeVisible();
  await page.waitForTimeout(1500);

  const elementos = await page.evaluate(() => document.querySelectorAll('*').length);
  const bloqueio = await page.evaluate(() =>
    Math.round((window as unknown as { __longas: number[] }).__longas.reduce((s, d) => s + Math.max(0, d - 50), 0)),
  );
  info.annotations.push({ type: 'elementos', description: String(elementos) });
  info.annotations.push({ type: 'bloqueio (ms, só acompanhamento)', description: String(bloqueio) });
  console.log(`Tarefas/celular: ${elementos} elementos, ${bloqueio} ms de bloqueio`);

  expect(elementos, `teto de ${TETO_DE_ELEMENTOS} elementos`).toBeLessThan(TETO_DE_ELEMENTOS);
});
