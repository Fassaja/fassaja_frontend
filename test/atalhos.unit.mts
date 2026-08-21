/**
 * Testes do rótulo de atalho.
 *
 * Existe porque mostrar "⌘K" para quem está no Windows é uma instrução que
 * não funciona — e é o tipo de erro que ninguém percebe testando só no Mac.
 * Rodar: npm test
 */
import { ehMac, rotuloAtalho } from '../src/utils/atalhos.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

check('MacIntel é Mac', ehMac('MacIntel'));
check('macOS é Mac', ehMac('macOS'));
check('iPhone é Mac (mesma tecla)', ehMac('iPhone'));
check('iPad é Mac', ehMac('iPadOS'));
check('Win32 não é Mac', !ehMac('Win32'));
check('Windows não é Mac', !ehMac('Windows'));
check('Linux não é Mac', !ehMac('Linux x86_64'));
check('Android não é Mac', !ehMac('Android'));
check('plataforma vazia cai no lado não-Mac', !ehMac(''));

check('rótulo no Mac usa o símbolo', rotuloAtalho('k', 'MacIntel') === '⌘K');
check('rótulo no Windows usa Ctrl', rotuloAtalho('k', 'Win32') === 'Ctrl K');
check('rótulo no Linux usa Ctrl', rotuloAtalho('k', 'Linux x86_64') === 'Ctrl K');
check('tecla sai maiúscula', rotuloAtalho('k', 'Win32').endsWith('K'));

// O userAgent inteiro do Windows contém "Macintosh"? Não — mas contém outras
// palavras. Este caso trava o risco de um regex frouxo demais.
check('userAgent do Windows não vira Mac',
  !ehMac('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'));
check('userAgent do Mac vira Mac',
  ehMac('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'));

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
