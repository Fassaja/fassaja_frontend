import { api, API_URL } from './api';

export const calendarService = {
  /** Token da assinatura; criado na primeira consulta. */
  async get(): Promise<string> {
    return (await api.get<{ token: string }>('/calendar/subscription')).token;
  },
  /** Gera outro token. A URL anterior para de funcionar na hora. */
  async rotate(): Promise<string> {
    return (await api.post<{ token: string }>('/calendar/subscription/rotate', {})).token;
  },
  async revoke(): Promise<void> {
    await api.delete<{ token: null }>('/calendar/subscription');
  },
};

/**
 * URL que a pessoa cola no Google/Apple Calendar — sempre ABSOLUTA.
 *
 * Em produção o `VITE_API_URL` é `/api`: um caminho relativo, que funciona
 * para o `fetch` do navegador porque ele resolve contra a página atual. Mas
 * este endereço vai para FORA — o Google, o Outlook e o app de calendário
 * precisam de esquema e domínio. Relativo, o Google recusa antes mesmo de
 * tentar buscar ("URL de agenda inválido"), e o webcal:// nem se forma, porque
 * não há "https:" para trocar.
 *
 * Resolver contra a origem da página é o que faz o endereço apontar para
 * `https://www.fassaja.com/api/...` — que é público e serve o feed.
 */
export function urlDoFeed(token: string): string {
  const base = /^https?:\/\//i.test(API_URL)
    ? API_URL
    : `${window.location.origin}${API_URL.startsWith('/') ? '' : '/'}${API_URL}`;
  return `${base.replace(/\/$/, '')}/calendar/${token}.ics`;
}

/**
 * Mesma URL em `webcal://`, que faz o sistema abrir o aplicativo de calendário
 * já na tela de assinar. É só uma troca de esquema — o servidor continua
 * respondendo em https.
 */
export function urlWebcal(token: string): string {
  return urlDoFeed(token).replace(/^https?:/, 'webcal:');
}

/**
 * Links que abrem cada calendário já na tela de "assinar?".
 *
 * `webcal://` é padrão e estável — o sistema operacional entrega ao aplicativo
 * de calendário padrão. Os outros dois são CONVENÇÃO, não API documentada: o
 * Google e a Microsoft podem mudá-los sem aviso. Por isso o endereço manual
 * continua à mostra na tela: quando um link quebrar, o caminho de baixo ainda
 * funciona, e é ele que a pessoa usa para resolver sozinha.
 */
export function linksDeAssinatura(token: string, nome = 'Fassaja') {
  const feed = urlDoFeed(token);
  const webcal = urlWebcal(token);
  return {
    /**
     * Tela de "Adicionar por URL" da Agenda, e NÃO o atalho `?cid=`.
     *
     * O `cid` é convenção não documentada: o Google mudou o comportamento dele
     * ao longo dos anos e em muitas contas ele responde "não foi possível
     * adicionar a agenda", sem dizer por quê. Esta tela é parte da interface
     * de configurações e não some — o preço é a pessoa colar o endereço, que
     * o botão já deixa na área de transferência.
     */
    google: 'https://calendar.google.com/calendar/u/0/r/settings/addbyurl',
    // Deixa o sistema escolher o aplicativo padrão — no Mac e no iPhone é o
    // Calendário, mas pode ser outro, e forçar "Apple" seria mentira.
    webcal,
    outlook:
      `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feed)}` +
      `&name=${encodeURIComponent(nome)}`,
  };
}
