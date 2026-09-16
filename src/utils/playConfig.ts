import { dentroDoApp, ondeAssinar } from './twa';

/** Nome do pacote Android; vazio até o app ser publicado. */
export const ANDROID_PACKAGE = import.meta.env.VITE_ANDROID_PACKAGE ?? '';
/**
 * Cota semanal do assistente no Pro. Espelha PRO_WEEKLY_LIMIT do back-end
 * (ai-core.service.ts); o número de verdade é o do servidor — este é só o
 * que a tela promete, e os dois precisam andar juntos.
 */
export const PRO_WEEKLY_LIMIT = 15;
/**
 * Projetos pessoais em andamento na conta gratuita. Espelha
 * FREE_PROJECT_LIMIT do back-end (projects.service.ts) — o servidor é quem
 * recusa; este número só serve para a tela avisar antes.
 */
export const FREE_PROJECT_LIMIT = 5;
/** Produto de assinatura no Play Console. */
export const PLAY_SKU = import.meta.env.VITE_PLAY_SKU || 'pro_mensal';

/** Onde ESTA pessoa pode assinar o Pro agora ('app' | 'loja' | null). */
export function ondeAssinarAgora(): 'app' | 'loja' | null {
  return ondeAssinar(dentroDoApp(), ANDROID_PACKAGE);
}
