/**
 * "Estamos dentro do app da Play Store?" e "onde se assina o Pro?".
 *
 * O que estes testes protegem: o site nunca pode achar que está dentro do app
 * sem estar (mostraria o Play Billing a quem está no Chrome comum, que não
 * tem a API e veria um botão morto), e — pior — nunca pode falar do Pro como
 * comprável antes de o app existir na loja (pacote vazio).
 *
 * Rodar: npm run test
 */
import {
  veioDoApp,
  linkLoja,
  linkGerenciarAssinatura,
  ondeAssinar,
  deveAvisarDaLoja,
} from '../src/utils/twa.ts';

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

const PACOTE = 'com.fassaja.app';

console.log('\nveioDoApp');
check('referrer do nosso pacote, com barra', veioDoApp('android-app://com.fassaja.app/', PACOTE));
check('referrer do nosso pacote, sem barra', veioDoApp('android-app://com.fassaja.app', PACOTE));
check('outro app não conta', !veioDoApp('android-app://com.outro.app/', PACOTE));
check('prefixo parecido não conta', !veioDoApp('android-app://com.fassaja.appx/', PACOTE));
check('referrer http não conta', !veioDoApp('https://www.google.com/', PACOTE));
check('referrer vazio não conta', !veioDoApp('', PACOTE));
check('sem pacote configurado, nunca é o app', !veioDoApp('android-app://com.fassaja.app/', ''));

console.log('\nlinks');
check(
  'ficha na loja',
  linkLoja(PACOTE) === 'https://play.google.com/store/apps/details?id=com.fassaja.app',
  linkLoja(PACOTE),
);
check(
  'gerenciar assinatura aponta para a nossa',
  linkGerenciarAssinatura(PACOTE, 'pro_mensal') ===
    'https://play.google.com/store/account/subscriptions?sku=pro_mensal&package=com.fassaja.app',
  linkGerenciarAssinatura(PACOTE, 'pro_mensal'),
);

console.log('\nondeAssinar');
check('dentro do app → compra aqui', ondeAssinar(true, PACOTE) === 'app');
check('no site, app publicado → manda para a loja', ondeAssinar(false, PACOTE) === 'loja');
check('app não publicado → o Pro não existe, nem no app', ondeAssinar(true, '') === null);
check('app não publicado → nem no site', ondeAssinar(false, '') === null);
check('no site com web ativa → compra pela web', ondeAssinar(false, PACOTE, true) === 'web');
check('no site com web ativa e sem app → web mesmo assim', ondeAssinar(false, '', true) === 'web');
check('dentro do app NUNCA é web, mesmo com web ativa', ondeAssinar(true, PACOTE, true) === 'app');
check('dentro do app sem pacote (impossível, mas fail-closed) → null', ondeAssinar(true, '', true) === null);

console.log('\ndeveAvisarDaLoja');
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/128 Safari/537.36';
const base = { userAgent: ANDROID, noApp: false, pacote: PACOTE, dispensado: false };
check('Android no navegador, app publicado → avisa', deveAvisarDaLoja(base));
check('dentro do app → não avisa (já instalou)', !deveAvisarDaLoja({ ...base, noApp: true }));
check('app não publicado → não avisa', !deveAvisarDaLoja({ ...base, pacote: '' }));
check('já dispensou → não avisa', !deveAvisarDaLoja({ ...base, dispensado: true }));
check('iPhone → não avisa (não tem como instalar)', !deveAvisarDaLoja({ ...base, userAgent: IPHONE }));
check('computador → não avisa', !deveAvisarDaLoja({ ...base, userAgent: MAC }));

console.log(`\n${passed} ok, ${failed} falha(s)`);
if (failed > 0) process.exit(1);
