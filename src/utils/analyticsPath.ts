/**
 * Higiene do endereço enviado à medição de acessos.
 *
 * A contagem de visitas manda o CAMINHO de cada página, e rotas nossas carregam
 * segredo dentro do próprio endereço:
 *
 *   /reset-password?token=…  → token de redefinição de senha
 *   /join/<token>            → token de convite para uma equipe
 *
 * O de redefinição é o de maior valor do sistema: vale por 1 hora e dá acesso
 * total à conta. O backend guarda apenas o HASH dele no banco, justamente para
 * que nem quem lê o banco consiga forjar um link — seria contraditório proteger
 * tanto ali e entregar o token cru a um terceiro pela telemetria.
 *
 * Por isso a régua aqui é conservadora: quando há segredo, ou se troca o trecho
 * por um rótulo fixo, ou não se envia nada.
 *
 * ## Por que uma lista de rotas, e não uma comparação de texto
 *
 * A versão anterior comparava o primeiro segmento com a string 'join'. O
 * roteador, porém, casa `/join/:token` de forma INSENSÍVEL A CAIXA e sobre o
 * segmento DECODIFICADO — então `/Join/<token>` e `/%6aoin/<token>` abriam a
 * mesma página de convite e escapavam do mascaramento, com o token intacto no
 * endereço enviado.
 *
 * A classificação agora usa a mesma semântica do roteador (decodifica o
 * segmento, compara sem caixa) sobre uma LISTA FECHADA de rotas conhecidas.
 * Caminho que não casa com nenhuma vira um rótulo genérico: um endereço que
 * ninguém previu é justamente o que pode estar carregando credencial.
 */

/** Rótulo para o que não é rota conhecida. Mede o volume sem levar conteúdo. */
export const ROTA_DESCONHECIDA = '/[desconhecida]';

interface Rota {
  /** Padrão como está em routes/AppRoutes.tsx (`:param` para trecho variável). */
  padrao: string;
  /** O que registrar. Ausente = o próprio padrão (rota sem trecho variável). */
  rotulo?: string;
  /** `false` = nem o rótulo é enviado: a rota inteira é segredo. */
  enviar?: false;
}

/**
 * Espelho de `src/routes/AppRoutes.tsx`. O teste desta suíte lê aquele arquivo
 * e falha se algum `path` novo não estiver aqui — assim uma rota criada amanhã
 * não passa despercebida pela telemetria.
 */
const ROTAS: Rota[] = [
  { padrao: '/' },
  { padrao: '/login' },
  { padrao: '/register' },
  { padrao: '/forgot-password' },
  // Token de acesso total à conta na query. Não se mede esta visita.
  { padrao: '/reset-password', enviar: false },
  // Confirmação de exclusão de conta, aberta por link de e-mail.
  { padrao: '/excluir-conta', enviar: false },
  { padrao: '/join/:token', rotulo: '/join/[token]' },
  { padrao: '/tasks' },
  { padrao: '/apoiar' },
  { padrao: '/termos' },
  { padrao: '/privacidade' },
  { padrao: '/ideas' },
  { padrao: '/projects' },
  { padrao: '/calendar' },
  { padrao: '/agenda' },
  { padrao: '/focus' },
  { padrao: '/priorities' },
  { padrao: '/reports' },
  { padrao: '/team' },
  // O id da equipe não é segredo, mas também não é métrica: vira rótulo para
  // as visitas contarem como uma página só.
  { padrao: '/team/:teamId', rotulo: '/team/[id]' },
  { padrao: '/team/:teamId/:tab', rotulo: '/team/[id]/[aba]' },
  { padrao: '/ai' },
  { padrao: '/profile' },
  { padrao: '/settings' },
];

/** Os padrões declarados aqui — usado pelo teste que confere o AppRoutes. */
export const PADROES_CONHECIDOS = ROTAS.map(r => r.padrao);

function segmentos(caminho: string): string[] {
  return caminho.split('/').filter(Boolean);
}

/**
 * Decodifica UM segmento como o roteador faz, e devolve `null` quando a
 * sequência é inválida (`%zz`). `null` derruba a comparação para
 * "desconhecida" em vez de lançar no meio do `beforeSend`.
 */
function decodificar(segmento: string): string | null {
  try {
    return decodeURIComponent(segmento).toLowerCase();
  } catch {
    return null;
  }
}

function casa(padrao: string, partes: (string | null)[]): boolean {
  const esperados = segmentos(padrao);
  if (esperados.length !== partes.length) return false;
  return esperados.every((esperado, i) => {
    if (esperado.startsWith(':')) return partes[i] !== null && partes[i] !== '';
    return partes[i] === esperado.toLowerCase();
  });
}

/**
 * Devolve o CAMINHO a registrar, ou `null` para não registrar nada.
 *
 * Aceita caminho com ou sem query; a query é sempre descartada, porque nada do
 * que colocamos nela precisa ser medido.
 *
 * Para o que vai ao `beforeSend`, use `sanitizeUrl` — a medição espera uma URL
 * inteira, e entregar só o caminho faz o servidor recusar com 400.
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

  const partes = segmentos(path).map(decodificar);
  const rota = ROTAS.find(r => casa(r.padrao, partes));
  if (!rota) return ROTA_DESCONHECIDA;
  if (rota.enviar === false) return null;
  return rota.rotulo ?? rota.padrao;
}

/**
 * A URL a enviar à medição, ou `null` para não enviar nada.
 *
 * Mantém a origem e troca só o caminho. A primeira versão devolvia o caminho
 * puro ("/", "/join/[token]"), e o endpoint respondeu **400 em toda visita** —
 * ele espera uma URL inteira. O erro passou despercebido porque nada disso roda
 * em localhost: só apareceu no console em produção.
 */
export function sanitizeUrl(raw: string): string | null {
  const path = sanitizePath(raw);
  if (path === null) return null;

  try {
    const u = new URL(raw);
    return `${u.origin}${path}`;
  } catch {
    // `raw` relativo (não deve acontecer, mas não custa): devolve o caminho,
    // que é o melhor possível sem saber a origem.
    return path;
  }
}
