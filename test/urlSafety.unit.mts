/**
 * Testes de segurança dos helpers de URL (sem navegador, sem dependências).
 * Garante que o sanitizador de href nunca deixe passar esquema executável e
 * que a política de navegação interna barre redirects externos. Rodar: npm run test
 */
import { toExternalHref, isInternalPath, caminhoInternoSeguro } from '../src/utils/url.ts';

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

// --- FE-02: controles que o parser de URL REMOVE antes de interpretar -------
//
// A checagem antiga era a regex /^\/(?![/\\])/. Ela aprovava um caminho com TAB
// porque o segundo caractere não é barra — mas o navegador descarta o TAB e o
// que sobra ("//evil.com") é outra ORIGEM. Foi assim que o helper original
// levou uma navegação real de 127.0.0.1 para localhost.
const NUL = String.fromCharCode(0);
const DEL = String.fromCharCode(127);
const REGEX_ANTIGA = /^\/(?![/\\])/;
const CONTROLES: Array<[string, string]> = [
  ['TAB', '/\tevil.com'],
  ['LF', '/\nevil.com'],
  ['CR', '/\revil.com'],
  ['TAB no meio', '/ag\tenda'],
  ['NUL', `/${NUL}evil.com`],
  ['DEL', `/${DEL}evil.com`],
];
for (const [nome, entrada] of CONTROLES) {
  check(`(regressão) a regex antiga aprovava ${nome}`, REGEX_ANTIGA.test(entrada));
  check(`rejeita ${nome} real`, caminhoInternoSeguro(entrada) === null);
}

// Percent-encoded NÃO é o mesmo caso: o parser mantém %09 codificado, ele nunca
// vira um TAB, e o caminho continua interno. Recusar aqui seria decodificar
// duas vezes — exatamente o erro que se quer evitar.
check('%09 codificado continua interno', caminhoInternoSeguro('/%09/agenda') === '/%09/agenda');
check('%09 na query continua interno', caminhoInternoSeguro('/agenda?x=%09') === '/agenda?x=%09');
check('%2f codificado não vira barra', caminhoInternoSeguro('/%2f%2fevil.com') === '/%2f%2fevil.com');

// Esquemas, credenciais e formas malformadas.
check('rejeita http://evil', caminhoInternoSeguro('http://evil.com') === null);
check('rejeita //evil.com', caminhoInternoSeguro('//evil.com') === null);
check('rejeita /\\/evil.com', caminhoInternoSeguro('/\\/evil.com') === null);
check('rejeita \\\\evil.com', caminhoInternoSeguro('\\\\evil.com') === null);
check('rejeita vazio', caminhoInternoSeguro('') === null);
check('rejeita não-string', caminhoInternoSeguro(null) === null && caminhoInternoSeguro(42) === null);
check('rejeita undefined', caminhoInternoSeguro(undefined) === null);

// Query e hash legítimos sobrevivem — o destino pós-login precisa deles.
check('preserva query', caminhoInternoSeguro('/reports?range=7d') === '/reports?range=7d');
check('preserva hash', caminhoInternoSeguro('/tasks#hoje') === '/tasks#hoje');
check('preserva query + hash', caminhoInternoSeguro('/tasks?a=1#b') === '/tasks?a=1#b');

// Devolve a forma CANÔNICA: é ela que o navegador interpreta, e é ela que deve
// ser guardada/navegada. Um '/..' resolvido depois poderia mudar o destino.
check('normaliza /a/../b', caminhoInternoSeguro('/a/../b') === '/b');
check('normaliza /./agenda', caminhoInternoSeguro('/./agenda') === '/agenda');
check(
  'a forma canônica passa de novo pela política (idempotente)',
  caminhoInternoSeguro(caminhoInternoSeguro('/a/../b') as string) === '/b',
);

// A saída nunca pode começar por '//': quem recebe reinterpreta a string.
for (const entrada of ['/', '/agenda', '/a/../b', '/join/abc?x=1', '/./']) {
  const saida = caminhoInternoSeguro(entrada);
  check(`saída de "${entrada}" não é protocol-relative`, saida !== null && !saida.startsWith('//'));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
