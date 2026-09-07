import { useEffect } from 'react';

/**
 * Higiene das telas que carregam segredo no endereço (FE-04).
 *
 * Duas coisas, ambas por tela e desfeitas ao sair dela:
 *
 * 1. **Referrer mais restrito.** O cabeçalho global é
 *    `strict-origin-when-cross-origin` — bom padrão, mas ele ainda envia a
 *    ORIGEM para terceiros, e numa navegação de mesma origem envia a URL
 *    inteira. Nestas telas a URL É o segredo (`/join/<token>`,
 *    `?token=…`), então vale `no-referrer` enquanto elas estão abertas: um
 *    clique num link ou o carregamento de um recurso não deve carregar o token
 *    junto.
 *
 * 2. **Limpeza do endereço.** Depois de capturado, o token não precisa
 *    continuar na barra: ele fica no histórico, aparece em captura de tela e
 *    volta a viajar se a pessoa compartilhar o link. `replaceState` tira-o da
 *    URL sem recarregar a página nem criar uma entrada nova no histórico.
 *
 * O que ISTO NÃO FAZ: não protege contra script de terceiro na página (nenhum é
 * carregado nestas telas), nem contra o registro de acesso da hospedagem, que
 * vê a URL completa antes de qualquer JavaScript rodar.
 */
export function useTelaSensivel(opts?: { limparQuery?: boolean }): void {
  const limparQuery = opts?.limparQuery ?? false;

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  useEffect(() => {
    if (!limparQuery) return;
    // Só a query sai. O caminho fica: em `/join/<token>` o token É a rota, e
    // apagá-lo tiraria a página do ar embaixo de quem está lendo.
    if (!window.location.search) return;
    const semQuery = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', semQuery);
  }, [limparQuery]);
}
