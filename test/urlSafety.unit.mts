/**
 * Testes de segurança dos helpers de URL (sem navegador, sem dependências).
 * Garante que o sanitizador de href nunca deixe passar esquema executável e
 * que a checagem de caminho interno barre redirects externos. Rodar: npm run test
 */
import { toExternalHref, isInternalPath } from '../src/utils/url.ts';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}`);
  }
}

// toExternalHref nunca deve emitir um esquema executável/perigoso.
for (const evil of [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  '  javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'javascript:https://ok.com',
]) {
  const href = toExternalHref(evil);
  check(`neutraliza "${evil.slice(0, 20)}"`, /^https?:\/\//i.test(href) && !/^javascript:|^data:|^vbscript:/i.test(href));
}

// Links http(s) legítimos passam intactos; sem esquema vira https.
check('https intacto', toExternalHref('https://ex.com/x') === 'https://ex.com/x');
check('http intacto', toExternalHref('http://ex.com') === 'http://ex.com');
check('sem esquema vira https', toExternalHref('ex.com') === 'https://ex.com');

// isInternalPath: aceita só caminhos internos.
check('aceita /agenda', isInternalPath('/agenda') === true);
check('aceita / raiz', isInternalPath('/') === true);
check('aceita /join/<token> com path', isInternalPath('/join/abc?x=1') === true);
check('rejeita //evil.com', isInternalPath('//evil.com') === false);
check('rejeita /\\evil.com (backslash)', isInternalPath('/\\evil.com') === false);
check('rejeita https://evil', isInternalPath('https://evil.com') === false);
check('rejeita javascript:', isInternalPath('javascript:alert(1)') === false);
check('rejeita relativo "tasks"', isInternalPath('tasks') === false);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
