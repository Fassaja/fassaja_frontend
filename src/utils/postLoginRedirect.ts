// Relativo e com extensão, não '@/utils/url': os testes rodam em Node puro,
// que não conhece o alias do Vite nem completa a extensão sozinho. O tsconfig
// já liga `allowImportingTsExtensions`, então vale para tsc, Vite e Node.
import { isInternalPath } from './url.ts';

/**
 * Guarda para onde levar a pessoa depois de ela voltar do login com o Google.
 *
 * No modo redirect a aba sai do app, vai para o Google e volta numa navegação
 * nova. Todo o estado em memória do React morre no caminho, então o destino
 * precisa sobreviver fora dele. É por isso que existe este arquivo: sem ele,
 * quem clicou num link protegido (`/login?redirect=/reports`) e entrou com o
 * Google cairia no Dashboard, não no relatório que pediu.
 *
 * localStorage, e não sessionStorage: quando o app está instalado como PWA, a
 * ida ao Google pode acontecer num contexto de navegação separado, e não dá
 * para contar que o sessionStorage da janela original seja o mesmo na volta.
 *
 * Duas travas, porque isto é um destino de navegação lido de um armazenamento
 * que qualquer script da própria origem pode escrever:
 *
 * - só caminho interno (`isInternalPath`), para não virar um open redirect;
 * - prazo de validade, para um destino esquecido de semanas atrás não
 *   sequestrar um login futuro.
 */
const KEY = 'fassaja_pos_login';

/** Um destino guardado só vale para a ida e a volta que estão acontecendo agora. */
const VALIDADE_MS = 10 * 60 * 1000;

export function guardarDestinoPosLogin(path: string): void {
  try {
    // '/' é o padrão: guardar não acrescenta nada e só deixa lixo para trás.
    if (path === '/' || !isInternalPath(path)) return;
    localStorage.setItem(KEY, JSON.stringify({ path, ts: Date.now() }));
  } catch {
    /* localStorage indisponível: cai no destino padrão, sem quebrar o login */
  }
}

/**
 * Lê e APAGA o destino guardado. Devolve '/' quando não há nada válido.
 *
 * Apaga sempre, inclusive quando o valor é inválido ou venceu: um destino que
 * não foi consumido agora não deve ressurgir no próximo login.
 */
export function consumirDestinoPosLogin(): string {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return '/';

    const dados = JSON.parse(raw) as { path?: unknown; ts?: unknown };
    const path = typeof dados.path === 'string' ? dados.path : '';
    const ts = typeof dados.ts === 'number' ? dados.ts : 0;

    if (!path || !isInternalPath(path)) return '/';
    if (Date.now() - ts > VALIDADE_MS) return '/';
    return path;
  } catch {
    // JSON corrompido por uma versão antiga ou por outra aba: o login continua,
    // só perde o destino.
    return '/';
  }
}
