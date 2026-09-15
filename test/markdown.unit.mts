/**
 * O conversor de Markdown dos textos legais. Rodar: npm run test
 *
 * O que estes testes protegem: (1) o HTML que sai é escapado — um `<script>`
 * no .md vira texto, nunca script; (2) links só para http(s), mailto e
 * caminhos do site; (3) o subconjunto que os dois documentos usam (tabelas,
 * listas, negrito, links internos) renderiza sem perder conteúdo.
 */
import { markdownParaHtml, inline } from '../src/utils/markdown.ts';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detalhe?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}`);
    if (detalhe !== undefined) console.log('       recebido:', JSON.stringify(detalhe));
  }
}

console.log('\nsegurança');
let h = markdownParaHtml('<script>alert(1)</script>');
check('tag HTML vira texto', h === '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>', h);
h = inline('[x](javascript:alert(1))');
check('link javascript: é descartado, sobra o rótulo', h === 'x', h);
h = inline('[x](data:text/html,oi)');
check('link data: é descartado', h === 'x', h);
h = inline('[site](https://www.fassaja.com)');
check(
  'link externo abre em nova aba com noopener',
  h.includes('rel="noopener noreferrer"') && h.includes('target="_blank"'),
  h,
);
h = inline('[Termos](/termos)');
check('link interno sem target', h === '<a href="/termos">Termos</a>', h);
h = inline('[e-mail](mailto:x@y.com)');
check('mailto passa', h === '<a href="mailto:x@y.com">e-mail</a>', h);

console.log('\ninline');
h = inline('a **b** c');
check('negrito', h === 'a <strong>b</strong> c', h);
h = inline('em *Configurações → Excluir*');
check('itálico', h === 'em <em>Configurações → Excluir</em>', h);
h = inline('`**x**`');
check('código não vira negrito', h === '<code>**x**</code>', h);
h = inline('**a *b* c**');
check('itálico dentro do negrito', h === '<strong>a <em>b</em> c</strong>', h);
h = inline('**Não.** Nunca.');
check('negrito seguido de texto', h === '<strong>Não.</strong> Nunca.', h);

console.log('\nblocos');
h = markdownParaHtml('# T\n\n## S\n\n### X');
check('títulos h1–h3', h === '<h1>T</h1>\n<h2>S</h2>\n<h3>X</h3>', h);
h = markdownParaHtml('linha um\nlinha dois\n\noutro');
check('parágrafo junta linhas; em branco separa', h === '<p>linha um linha dois</p>\n<p>outro</p>', h);
h = markdownParaHtml('- a\n- b\n  continua\n- c');
check('lista com continuação indentada', h === '<ul><li>a</li><li>b continua</li><li>c</li></ul>', h);
h = markdownParaHtml('1. um\n2. dois');
check('lista numerada', h === '<ol><li>um</li><li>dois</li></ol>', h);
h = markdownParaHtml('---');
check('linha horizontal', h === '<hr>', h);
h = markdownParaHtml('| A | B |\n|---|---|\n| 1 | **2** |');
check(
  'tabela com cabeçalho e negrito na célula',
  h ===
    '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td><strong>2</strong></td></tr></tbody></table>',
  h,
);
h = markdownParaHtml('texto\n| A |\n|---|\n| 1 |\nfim');
check('tabela colada em parágrafo não engole o texto', h.startsWith('<p>texto</p>') && h.endsWith('<p>fim</p>'), h);

console.log(`\n${passed} ok, ${failed} falha(s)`);
if (failed > 0) process.exit(1);
