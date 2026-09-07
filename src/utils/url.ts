/**
 * Helpers de URL com foco em segurança.
 *
 * Centraliza num só lugar a normalização de links externos (nunca deixa passar
 * javascript:/data:/etc.) e a política de navegação interna usada em redirects —
 * para ficarem testáveis e reutilizáveis.
 */

/**
 * Normaliza um link digitado pelo usuário para um href navegável e seguro.
 * Qualquer coisa que não comece com http(s):// recebe o prefixo https://, então
 * esquemas perigosos (javascript:, data:, vbscript:) jamais chegam ao href —
 * viram um host inócuo (ex.: "https://javascript:alert(1)").
 */
export function toExternalHref(link: string): string {
  const trimmed = link.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Base fictícia para resolver o destino. Um host que não existe e não resolve:
 * se um dia um caminho escapar da política, ele não chega a lugar nenhum.
 * `.invalid` é reservado justamente para isso (RFC 2606).
 */
const BASE_INTERNA = 'https://interno.invalid';

/**
 * Caracteres que o parser de URL JOGA FORA antes de interpretar o endereço.
 *
 * É esse descarte que quebrava a checagem antiga: um caminho com TAB
 * ("/<TAB>evil.com") não começa por "//", então a regex aprovava — mas o
 * navegador remove o TAB e o que sobra vira outra origem. O mesmo vale para LF
 * e CR. Junto vão os demais controles (C0/DEL) e a barra invertida, que o
 * WHATWG trata como "/".
 *
 * Ver https://url.spec.whatwg.org/#url-parsing (tab/newline removal) e o
 * advisory GHSA-wrjc-x8rr-h8h6 do react-router (open redirect por barra
 * invertida no <Link>/useNavigate).
 */
// Os controles literais são o ALVO da checagem — é o TAB/LF/CR de verdade que
// o parser remove —, então a regra que os proíbe em regex não se aplica aqui.
// eslint-disable-next-line no-control-regex
const PROIBIDOS_RE = /[\u0000-\u001F\u007F\\]/;

/**
 * Política de navegação interna.
 *
 * Recebe um destino vindo de fora (query `?redirect=`, localStorage, payload de
 * push) e devolve a FORMA CANÔNICA a navegar, ou `null` quando o destino não é
 * comprovadamente interno.
 *
 * A régua não é "parece um caminho": é resolver contra uma base confiável e
 * exigir que a origem continue sendo a mesma. Antes de resolver, recusa o que o
 * parser removeria (controles) ou reinterpretaria (barra invertida) — sem isso a
 * comparação seria feita sobre um texto diferente do que o navegador usaria.
 *
 * Devolve `pathname + search + hash` já normalizados pelo próprio parser, e
 * confere o resultado de novo: um pathname que comece por `//` reintroduziria o
 * problema no ponto de uso, que reinterpreta a string.
 */
export function caminhoInternoSeguro(entrada: unknown): string | null {
  if (typeof entrada !== 'string' || entrada === '') return null;
  if (PROIBIDOS_RE.test(entrada)) return null;
  // Só caminho absoluto do próprio app. Relativo ("tasks") depende de onde a
  // pessoa está, e "//host" é URL sem esquema — outra origem.
  if (!entrada.startsWith('/') || entrada.startsWith('//')) return null;

  let u: URL;
  try {
    u = new URL(entrada, BASE_INTERNA);
  } catch {
    return null;
  }

  // Credencial embutida ("/x@host") e qualquer mudança de origem estão fora.
  if (u.origin !== BASE_INTERNA || u.username || u.password) return null;

  const canonico = `${u.pathname}${u.search}${u.hash}`;
  if (!canonico.startsWith('/') || canonico.startsWith('//')) return null;
  return canonico;
}

/**
 * True apenas para destinos internos do app. Fina camada sobre
 * `caminhoInternoSeguro` — prefira a forma canônica dele quando for NAVEGAR,
 * porque é ela que o navegador vai interpretar.
 */
export function isInternalPath(path: string): boolean {
  return caminhoInternoSeguro(path) !== null;
}
