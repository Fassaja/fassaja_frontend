/**
 * Orçamento do arquivo principal: falha o CI se o JavaScript que toda visita
 * baixa antes da primeira tela crescer além do teto.
 *
 * Lê o dist/index.html para achar o arquivo de entrada (o nome tem hash) e
 * mede o tamanho comprimido com gzip, que é o que de fato viaja.
 *
 * Histórico do teto: 406 KB gzip antes do carregamento sob demanda (PR 30);
 * 165 → 145 KB depois da Fase 1 (PR 32). O teto deixa uma folga pequena de
 * propósito: crescer além dela pede uma decisão consciente (subir o teto
 * aqui, com o motivo no commit), não um acidente.
 *
 * Rodar depois do build: npm run orcamento
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const TETO_KB = 160;

const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const entrada = html.match(/<script[^>]+type="module"[^>]+src="\/?([^"]+\.js)"/)?.[1];
if (!entrada) {
  console.error('Não achei o script de entrada em dist/index.html. Rodou o build?');
  process.exit(1);
}

const bruto = readFileSync(join(dist, entrada));
const kb = n => (n / 1024).toFixed(1);
const gzip = gzipSync(bruto, { level: 9 }).length;

console.log(`Arquivo principal: ${entrada}`);
console.log(`  ${kb(bruto.length)} KB  ·  ${kb(gzip)} KB gzip  (teto: ${TETO_KB} KB gzip)`);

if (gzip / 1024 > TETO_KB) {
  console.error(
    `\nO arquivo principal passou do teto (${kb(gzip)} > ${TETO_KB} KB gzip).\n` +
      'Algo novo entrou no carregamento inicial. Se for de propósito, suba o teto em\n' +
      'scripts/orcamento-bundle.mjs e explique no commit; senão, carregue sob demanda.',
  );
  process.exit(1);
}
console.log('  dentro do orçamento.');
