import { dentroDoApp, ondeAssinar, OndeAssinar } from './twa';

/** Nome do pacote Android; vazio até o app ser publicado. */
export const ANDROID_PACKAGE = import.meta.env.VITE_ANDROID_PACKAGE ?? '';
/**
 * Cota semanal do assistente no Pro. Espelha PRO_WEEKLY_LIMIT do back-end
 * (ai-core.service.ts); o número de verdade é o do servidor — este é só o
 * que a tela promete, e os dois precisam andar juntos.
 */
export const PRO_WEEKLY_LIMIT = 12;
/** Cota grátis. Espelha FREE_WEEKLY_LIMIT do back-end. */
export const FREE_WEEKLY_LIMIT = 3;
/**
 * Projetos pessoais em andamento na conta gratuita. Espelha
 * FREE_PROJECT_LIMIT do back-end (projects.service.ts) — o servidor é quem
 * recusa; este número só serve para a tela avisar antes.
 */
export const FREE_PROJECT_LIMIT = 5;
/**
 * Preço mensal mostrado ENQUANTO o servidor não respondeu (GET
 * /billing/plano é quem manda). Mantido perto do real para a tela não
 * "pular" de valor; o número que vale é sempre o do servidor.
 */
export const PRO_PRECO_FALLBACK = 'R$ 12,90';

export function formatarPreco(brl: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(brl);
}
/** Produto de assinatura no Play Console. */
export const PLAY_SKU = import.meta.env.VITE_PLAY_SKU || 'pro_mensal';

/** A assinatura pela web (Mercado Pago) está ligada? '1' quando o servidor tem o token. */
export const PRO_WEB = import.meta.env.VITE_PRO_WEB === '1';

/** Onde ESTA pessoa pode assinar o Pro agora ('app' | 'web' | 'loja' | null). */
export function ondeAssinarAgora(): OndeAssinar {
  return ondeAssinar(dentroDoApp(), ANDROID_PACKAGE, PRO_WEB);
}
