/*
 * Anti-flash do tema: aplica a classe `dark` no <html> ANTES do primeiro paint.
 * Sem isto a página pinta clara, o React monta e só então troca para escura —
 * um flash branco na cara de quem usa tema escuro, justamente onde ele mais
 * incomoda.
 *
 * Por que é um ARQUIVO e não um <script inline> no index.html: a CSP de
 * produção (vercel.json) usa `script-src 'self'` sem 'unsafe-inline' e sem
 * nonce, então um script inline seria BLOQUEADO — o app continuaria
 * funcionando e o flash voltaria só em produção, sem erro visível. Servido de
 * /theme-init.js ele cai em 'self' e passa.
 *
 * Um hash SHA-256 na CSP também resolveria, mas silenciosamente para de valer
 * na primeira vez que alguém editar uma linha daqui e esquecer de recalcular —
 * a mesma falha silenciosa, de volta.
 *
 * A regra de resolução é a mesma de src/contexts/ThemeContext.tsx. Mudar uma
 * exige mudar a outra, senão a página pisca ao trocar de tema no primeiro paint.
 */
(function () {
  // Telas que ficam sempre claras. Cópia obrigatória de
  // src/utils/lightOnlyRoutes.ts: este arquivo roda antes do bundle e não tem
  // como importar de lá. test/lightOnlyTheme.unit.mts lê ESTE arquivo e falha
  // se as duas listas divergirem.
  var LIGHT_ONLY = ['/login', '/register', '/forgot-password', '/reset-password'];

  try {
    if (LIGHT_ONLY.indexOf(location.pathname) !== -1) return;

    var pref = localStorage.getItem('fassaja_theme');
    var dark =
      pref === 'dark' ||
      ((pref === 'system' || !pref) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    /* localStorage bloqueado (modo privado): segue no tema claro */
  }
})();
