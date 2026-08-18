/**
 * Testes dos links de assinatura.
 *
 * O que importa aqui é o ESCAPE: a URL do feed vai dentro de outra URL, como
 * parâmetro. Sem codificar, o "://" e o "?" da nossa URL seriam lidos como
 * parte do endereço do Google — e o botão levaria a lugar nenhum, em silêncio.
 * Rodar: npm test
 */
import assert from 'node:assert';

// Espelha src/services/calendarService.ts. O caso que importa é o segundo:
// em produção o VITE_API_URL é "/api", relativo.
function fazerUrlDoFeed(API: string, origem: string) {
  return (t: string) => {
    const base = /^https?:\/\//i.test(API)
      ? API
      : `${origem}${API.startsWith('/') ? '' : '/'}${API}`;
    return `${base.replace(/\/$/, '')}/calendar/${t}.ics`;
  };
}
const API = 'https://api.fassaja.com/api';
const urlDoFeed = fazerUrlDoFeed(API, 'https://www.fassaja.com');
const urlWebcal = (t: string) => urlDoFeed(t).replace(/^https?:/, 'webcal:');
function linksDeAssinatura(token: string, nome = 'Fassaja') {
  const feed = urlDoFeed(token);
  const webcal = urlWebcal(token);
  return {
    google: 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl',
    webcal,
    outlook:
      `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feed)}` +
      `&name=${encodeURIComponent(nome)}`,
  };
}

let passed = 0, failed = 0;
function test(n: string, f: () => void) {
  try { f(); passed++; console.log(`  ok   ${n}`); }
  catch (e) { failed++; console.log(`  FAIL ${n}\n       ${String(e)}`); }
}

const TOKEN = 'abc-123_XYZ';

// --- o bug que o Google mostrou ---------------------------------------------

test('API relativa ("/api") vira endereço ABSOLUTO', () => {
  const f = fazerUrlDoFeed('/api', 'https://www.fassaja.com');
  assert.strictEqual(f(TOKEN), 'https://www.fassaja.com/api/calendar/abc-123_XYZ.ics');
});

test('API relativa produz webcal válido', () => {
  const f = fazerUrlDoFeed('/api', 'https://www.fassaja.com');
  // Sem o esquema não haveria "https:" para trocar, e o webcal nem se formava.
  assert.ok(f(TOKEN).replace(/^https?:/, 'webcal:').startsWith('webcal://'));
});

test('API absoluta continua intocada', () => {
  const f = fazerUrlDoFeed('https://api.fassaja.com/api', 'https://www.fassaja.com');
  assert.strictEqual(f(TOKEN), 'https://api.fassaja.com/api/calendar/abc-123_XYZ.ics');
});

test('barra sobrando na base não vira barra dupla', () => {
  const f = fazerUrlDoFeed('/api/', 'https://www.fassaja.com');
  assert.ok(!f(TOKEN).includes('//calendar'), f(TOKEN));
});

test('endereço final termina em .ics', () => {
  assert.ok(fazerUrlDoFeed('/api', 'https://x.com')(TOKEN).endsWith('.ics'));
});

test('webcal troca o esquema e preserva o resto', () => {
  assert.strictEqual(urlWebcal(TOKEN), 'webcal://api.fassaja.com/api/calendar/abc-123_XYZ.ics');
});

test('Google aponta para a tela oficial de adicionar por URL', () => {
  // Sem parâmetro: o antigo `?cid=` era convenção não documentada e o Google
  // passou a recusá-lo. Esta tela faz parte das configurações e não sai do ar.
  const { google } = linksDeAssinatura(TOKEN);
  assert.strictEqual(google, 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl');
});

test('link do Outlook codifica url e nome', () => {
  const { outlook } = linksDeAssinatura(TOKEN, 'Fassaja — Demo');
  assert.ok(outlook.includes('url=https%3A%2F%2F'), outlook);
  // O travessão e o espaço do nome precisam sair codificados.
  assert.ok(outlook.includes('name=Fassaja%20%E2%80%94%20Demo'), outlook);
});

test('token com caractere especial nao escapa do parametro do Outlook', () => {
  const { outlook } = linksDeAssinatura('a&b=c');
  const url = outlook.slice(outlook.indexOf('url='), outlook.indexOf('&name='));
  assert.ok(!url.includes('a&b'), url);
});

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
