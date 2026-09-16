/**
 * O Fassaja dentro do app da Play Store (Trusted Web Activity).
 *
 * A TWA é o site inteiro rodando no Chrome, sem barra de endereço. Para o
 * código é o mesmo site — a única pista de que estamos DENTRO DO APP é o
 * `document.referrer` da primeira navegação, que o Android preenche com
 * `android-app://<pacote>/`. Nas navegações seguintes (SPA) o referrer não
 * muda, mas um reload perde a pista; por isso a resposta é LEMBRADA em
 * `sessionStorage`, que vive exatamente o tempo da aba do app.
 *
 * Por que importa saber: dentro do app, a assinatura do Pro tem de passar
 * pelo Google Play Billing, e qualquer caminho de pagamento por fora é motivo
 * de rejeição na loja. Fora do app, nada disso vale.
 *
 * Funções puras recebem os valores como parâmetro (referrer, pacote) para
 * serem testáveis fora do navegador — quem lê `document` e `import.meta.env`
 * são as duas de baixo, finas de propósito.
 */
const KEY = 'fassaja_twa';

/** O referrer é o do nosso app Android? */
export function veioDoApp(referrer: string, pacote: string): boolean {
  if (!pacote) return false;
  return referrer === `android-app://${pacote}` || referrer.startsWith(`android-app://${pacote}/`);
}

/** Anota "estamos dentro do app" quando o referrer diz isso. Chamado na subida. */
export function registrarTwa(referrer: string, pacote: string): void {
  try {
    if (veioDoApp(referrer, pacote)) sessionStorage.setItem(KEY, '1');
  } catch {
    /* sem armazenamento: a página vai se comportar como site, o que é seguro */
  }
}

/** Estamos dentro do app da Play Store, agora? */
export function dentroDoApp(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Ficha do app na loja. */
export function linkLoja(pacote: string): string {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pacote)}`;
}

/** Tela de "gerenciar assinatura" do Google Play, já na nossa assinatura. */
export function linkGerenciarAssinatura(pacote: string, sku: string): string {
  return (
    'https://play.google.com/store/account/subscriptions' +
    `?sku=${encodeURIComponent(sku)}&package=${encodeURIComponent(pacote)}`
  );
}

export type OndeAssinar = 'app' | 'web' | 'loja' | null;

/**
 * Onde esta pessoa pode assinar o Pro, se em algum lugar.
 *
 * - `'app'`: está dentro do app → compra pelo Play Billing, aqui mesmo.
 *   Dentro do app NUNCA é `'web'`: oferecer pagamento por fora ali é motivo
 *   de rejeição na Play Store, mesmo que a web exista.
 * - `'web'`: está no site e a assinatura pela web (Mercado Pago) está ligada
 *   → compra aqui, no cartão.
 * - `'loja'`: está no site, sem web, mas o app existe → mandar para a ficha.
 * - `null`: nada publicado → o Pro não existe para esta pessoa, e nenhuma
 *   tela deve falar dele como se existisse.
 */
export function ondeAssinar(noApp: boolean, pacote: string, webAtiva = false): OndeAssinar {
  if (noApp) return pacote ? 'app' : null;
  if (webAtiva) return 'web';
  return pacote ? 'loja' : null;
}

/**
 * Vale avisar "o Fassaja está na Play Store" a esta pessoa?
 *
 * Só para quem pode fazer algo com o aviso: está num Android, NÃO está
 * dentro do app (senão já instalou), o app existe na loja e ela ainda não
 * dispensou o aviso. Para iPhone e computador o aviso seria um convite que
 * não dá para aceitar — o Pro para essas pessoas é explicado em /apoiar, não
 * empurrado num banner.
 */
export function deveAvisarDaLoja(opts: {
  userAgent: string;
  noApp: boolean;
  pacote: string;
  dispensado: boolean;
}): boolean {
  if (!opts.pacote || opts.noApp || opts.dispensado) return false;
  return /android/i.test(opts.userAgent);
}
