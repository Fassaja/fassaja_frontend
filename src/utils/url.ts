/**
 * Helpers de URL com foco em segurança.
 *
 * Centraliza num só lugar a normalização de links externos (nunca deixa passar
 * javascript:/data:/etc.) e a checagem de caminho interno usada em redirects —
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
 * True apenas para caminhos internos do app: começa com "/" e não com "//" nem
 * "/\" (que viram URLs protocol-relative e escapariam para outra origem).
 * Use para validar parâmetros de redirect antes de navegar.
 */
export function isInternalPath(path: string): boolean {
  return /^\/(?![/\\])/.test(path);
}
