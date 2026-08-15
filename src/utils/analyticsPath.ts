/**
 * Higiene do endereço enviado à medição de acessos.
 *
 * A contagem de visitas manda o CAMINHO de cada página, e duas rotas nossas
 * carregam segredo dentro do próprio endereço:
 *
 *   /reset-password?token=…  → token de redefinição de senha
 *   /join/<token>            → token de convite para uma equipe
 *
 * O de redefinição é o de maior valor do sistema: vale por 1 hora e dá acesso
 * total à conta. O backend guarda apenas o HASH dele no banco, justamente para
 * que nem quem lê o banco consiga forjar um link — seria contraditório
 * proteger tanto ali e entregar o token cru a um terceiro pela telemetria.
 *
 * Por isso a régua aqui é conservadora: quando há segredo, ou se troca o
 * trecho por um rótulo fixo, ou não se envia nada.
 */

/** Rotas cujo acesso NÃO é enviado — o segredo está na query. */
const DESCARTAR = ['/reset-password'];

/**
 * Trechos variáveis que viram rótulo. A chave é o primeiro segmento; o que
 * vem depois é substituído, para todos os convites contarem como uma página
 * só em vez de virarem milhares de endereços distintos.
 */
const MASCARAR: Record<string, string> = { join: '/join/[token]' };

/**
 * Devolve o caminho a registrar, ou `null` para não registrar nada.
 *
 * Aceita caminho com ou sem query; a query é sempre descartada, porque nada
 * do que colocamos nela precisa ser medido.
 */
export function sanitizePath(url: string): string | null {
  if (!url) return null;

  // Aceita tanto '/x?y' quanto uma URL absoluta.
  let path = url;
  try {
    path = new URL(url, 'http://x').pathname;
  } catch {
    path = url.split('?')[0].split('#')[0];
  }

  if (DESCARTAR.some(rota => path === rota || path.startsWith(`${rota}/`))) return null;

  // Só mascara quando há algo DEPOIS do primeiro segmento: é esse "algo" que é
  // o token. `/join` sozinho não carrega segredo e passa como está.
  const partes = path.split('/').filter(Boolean);
  if (partes.length > 1 && MASCARAR[partes[0]]) return MASCARAR[partes[0]];

  return path;
}
