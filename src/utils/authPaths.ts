/**
 * Quando um 401 significa "sessão expirada" — e quando não significa.
 *
 * Fica fora do api.ts para poder ser testado no Node: aquele módulo lê
 * `import.meta.env`, que só existe sob o Vite.
 */

/**
 * Rotas em que um 401 NÃO é expiração de sessão.
 *
 * As de entrada (login, register, verify…) porque ali o 401 é credencial
 * inválida — não existe sessão para expirar.
 *
 * E `password`: essa rota é autenticada, mas o 401 dela podia ser "senha atual
 * incorreta", que fala do valor ENVIADO e não da sessão. Sem esta exceção,
 * errar a digitação da senha atual deslogava a pessoa na hora.
 *
 * O servidor passou a responder 400 nesse caso, mas a exceção fica: cobre o
 * intervalo até o deploy e qualquer cliente antigo. O custo é pequeno — uma
 * sessão que expire exatamente durante a troca de senha só é percebida na
 * requisição seguinte, em vez de na hora.
 */
/*
 * O fim é `(?:$|[/?])`, e não `\b`: em JavaScript o `\b` casa entre caractere
 * de palavra e não-palavra, e o hífen é não-palavra — então `password\b`
 * casaria também com `/auth/password-policy`, isentando uma rota que ninguém
 * quis isentar. Aqui só vale se o segmento terminar ali, ou for seguido de
 * barra ou de query.
 */
const AUTH_ENTRY_RE =
  /^\/auth\/(login|register|resend-verification|verify|logout|me|forgot-password|reset-password|password)(?:$|[/?])/;

/** O 401 nesta rota deve encerrar a sessão? */
export function isSessionExpiry(path: string): boolean {
  return !AUTH_ENTRY_RE.test(path);
}
