/**
 * O domínio canônico do Fassajá, e o que fazer quando não é ele.
 *
 * O Fassajá já morou em `fassaja.vercel.app`. Esse endereço hoje não serve
 * deployment nenhum (404 DEPLOYMENT_NOT_FOUND), mas continua vivo em lugares
 * que ninguém controla: favoritos, e-mails antigos, atalhos na tela inicial e
 * — o caso que motivou este arquivo — o **service worker** de quem instalou o
 * app por lá. O SW abre o clique da notificação na ORIGEM dele, então um
 * aviso de "aprovar pedido da equipe" levava a `fassaja.vercel.app/team` e
 * morria num 404 da Vercel. A rota existe e funciona; o domínio é que não.
 *
 * A lista é fechada de propósito. Mandar toda origem que não é a canônica
 * para produção quebraria os previews da Vercel, que existem justamente para
 * testar antes de publicar.
 */
export const HOST_CANONICO = 'www.fassaja.com';
export const ORIGEM_CANONICA = `https://${HOST_CANONICO}`;

/** Endereços que já foram o Fassajá e hoje não levam a lugar nenhum. */
const HOSTS_LEGADOS = new Set(['fassaja.vercel.app']);

export function ehHostLegado(hostname: string): boolean {
  return HOSTS_LEGADOS.has(hostname.trim().toLowerCase());
}

/**
 * Para onde mandar quem chegou num endereço antigo — mantendo o caminho.
 *
 * Manter caminho, busca e âncora é o ponto: quem clicou em "aprovar" quer
 * cair na equipe, não na página inicial. Devolve `null` quando o host já é
 * bom, para o chamador não redirecionar à toa.
 */
export function destinoCanonico(url: {
  hostname: string;
  pathname: string;
  search?: string;
  hash?: string;
}): string | null {
  if (!ehHostLegado(url.hostname)) return null;
  return `${ORIGEM_CANONICA}${url.pathname}${url.search ?? ''}${url.hash ?? ''}`;
}
