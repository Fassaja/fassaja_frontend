/**
 * Testes dos links de assinatura.
 *
 * O que importa aqui é o ESCAPE: a URL do feed vai dentro de outra URL, como
 * parâmetro. Sem codificar, o "://" e o "?" da nossa URL seriam lidos como
 * parte do endereço do Google — e o botão levaria a lugar nenhum, em silêncio.
 * Rodar: npm test
 */
import assert from 'node:assert';

const API = 'https://api.fassaja.com/api';
const urlDoFeed = (t: string) => `${API}/calendar/${t}.ics`;
const urlWebcal = (t: string) => urlDoFeed(t).replace(/^https?:/, 'webcal:');
function linksDeAssinatura(token: string, nome = 'Fassaja') {
  const feed = urlDoFeed(token);
  const webcal = urlWebcal(token);
  return {
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
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

test('webcal troca o esquema e preserva o resto', () => {
  assert.strictEqual(urlWebcal(TOKEN), 'webcal://api.fassaja.com/api/calendar/abc-123_XYZ.ics');
});

test('link do Google codifica a URL inteira no cid', () => {
  const { google } = linksDeAssinatura(TOKEN);
  assert.ok(google.includes('cid=webcal%3A%2F%2F'), google);
  // Sem "://" cru: se aparecer, o Google leu como endereço dele e o botão morre.
  assert.ok(!google.slice(google.indexOf('cid=')).includes('://'));
});

test('link do Outlook codifica url e nome', () => {
  const { outlook } = linksDeAssinatura(TOKEN, 'Fassaja — Demo');
  assert.ok(outlook.includes('url=https%3A%2F%2F'), outlook);
  // O travessão e o espaço do nome precisam sair codificados.
  assert.ok(outlook.includes('name=Fassaja%20%E2%80%94%20Demo'), outlook);
});

test('token com caractere especial nao escapa do parametro', () => {
  const { google } = linksDeAssinatura('a&b=c');
  assert.ok(!google.slice(google.indexOf('cid=')).includes('&'), google);
});

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
