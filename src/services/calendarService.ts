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

/** URL que a pessoa cola no Google/Apple Calendar. */
export function urlDoFeed(token: string): string {
  return `${API_URL}/calendar/${token}.ics`;
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
    // O Google aceita a URL webcal em `cid` e abre a caixa de confirmação.
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    // Deixa o sistema escolher o aplicativo padrão — no Mac e no iPhone é o
    // Calendário, mas pode ser outro, e forçar "Apple" seria mentira.
    webcal,
    outlook:
      `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feed)}` +
      `&name=${encodeURIComponent(nome)}`,
  };
}
