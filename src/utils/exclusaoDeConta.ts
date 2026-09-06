/**
 * Que prova de identidade esta conta precisa dar para ser excluída.
 *
 * A exclusão é irreversível, então o servidor não aceita só o cookie de sessão
 * — um cookie roubado não pode apagar a conta de ninguém. Quem tem senha
 * confirma com ela, num passo só. Quem não tem (entrou pelo Google e nunca
 * definiu uma) confirma pelo link que chega no e-mail.
 *
 * Fica aqui, e não dentro do componente, por causa do `undefined`.
 * `hasPassword` é opcional no `Account`: uma sessão hidratada de um cache
 * antigo, ou de uma versão do app anterior ao campo, chega sem ele. Tratar
 * `undefined` como "não tem senha" mandaria quem TEM senha para o caminho do
 * e-mail e deixaria a exclusão travada num link que nunca vai chegar. O
 * default seguro é 'senha', e é isso que o teste guarda.
 */
export type ProvaDeExclusao = 'senha' | 'email';

export function provaDeExclusao(hasPassword: boolean | undefined): ProvaDeExclusao {
  return hasPassword === false ? 'email' : 'senha';
}
