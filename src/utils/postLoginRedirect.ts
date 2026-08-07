// Relativo e com extensão, não '@/utils/url': os testes rodam em Node puro,
// que não conhece o alias do Vite nem completa a extensão sozinho. O tsconfig
// já liga `allowImportingTsExtensions`, então vale para tsc, Vite e Node.
import { isInternalPath } from './url.ts';

/**
 * A ida ao Google: o que precisa sobreviver enquanto o app perde o controle.
 *
 * No modo redirect a aba sai do app, vai para o Google e volta numa navegação
 * nova. Todo o estado em memória do React morre no caminho, então duas coisas
 * precisam ficar guardadas fora dele:
 *
 * 1. QUE existe um login em andamento. É isso que permite ao app, ao voltar
 *    para o primeiro plano, desconfiar que já há sessão e ir conferir. Sem essa
 *    marca ele teria de perguntar "e agora, estou logado?" a cada vez que a
 *    aba ganha foco — barulho inútil para quem só está navegando como visitante.
 * 2. PARA ONDE levar depois. Sem isso, quem clicou num link protegido
 *    (`/login?redirect=/reports`) e entrou com o Google cairia no Dashboard.
 *
 * localStorage, e não sessionStorage: com o app instalado como PWA, a ida ao
 * Google acontece num contexto de navegação separado — o sistema abre o
 * navegador —, e não dá para contar que o sessionStorage da janela original
 * seja o mesmo na volta.
 *
 * Duas travas, porque o destino é lido de um armazenamento que qualquer script
 * da própria origem pode escrever e vira uma NAVEGAÇÃO:
 *
 * - só caminho interno (`isInternalPath`), para não virar um open redirect;
 * - prazo de validade, para um destino esquecido de semanas atrás não
 *   sequestrar um login futuro.
 */
const KEY = 'fassaja_pos_login';

/** Uma ida ao Google só vale para a viagem que está acontecendo agora. */
const VALIDADE_MS = 10 * 60 * 1000;

interface Registro {
  path: string;
  ts: number;
}

function ler(): Registro | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const dados = JSON.parse(raw) as { path?: unknown; ts?: unknown };
    const ts = typeof dados.ts === 'number' ? dados.ts : 0;
    if (Date.now() - ts > VALIDADE_MS) return null;
    return { path: typeof dados.path === 'string' ? dados.path : '/', ts };
  } catch {
    // JSON corrompido por uma versão antiga ou por outra aba: trata como
    // inexistente. O login segue; no máximo perde o destino.
    return null;
  }
}

/**
 * Registra que a pessoa está saindo para o Google, e para onde levá-la na volta.
 *
 * Guarda mesmo quando o destino é '/': o valor aqui não é só o destino, é a
 * própria marca de "tem login em andamento".
 */
export function marcarIdaAoGoogle(path: string): void {
  try {
    const destino = isInternalPath(path) ? path : '/';
    localStorage.setItem(KEY, JSON.stringify({ path: destino, ts: Date.now() }));
  } catch {
    /* localStorage indisponível: cai no destino padrão, sem quebrar o login */
  }
}

/**
 * Existe um login com Google em andamento (recente e ainda não consumido)?
 *
 * Só isto autoriza o app a ir conferir a sessão quando volta ao primeiro plano.
 */
export function idaAoGoogleEmAndamento(): boolean {
  return ler() !== null;
}

/** Encerra a ida sem navegar — para quando a conferência diz que não há sessão. */
export function limparIdaAoGoogle(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada a fazer */
  }
}

/**
 * Lê e APAGA o destino guardado. Devolve '/' quando não há nada válido.
 *
 * Apaga sempre, inclusive quando o valor é inválido ou venceu: uma ida que não
 * foi consumida agora não deve ressurgir no próximo login.
 */
export function consumirDestinoPosLogin(): string {
  const registro = ler();
  limparIdaAoGoogle();
  if (!registro) return '/';
  // Revalida na LEITURA, não só na escrita: o cenário real de abuso é alguém
  // escrever direto no localStorage, sem passar pela nossa função.
  if (!isInternalPath(registro.path)) return '/';
  return registro.path;
}
