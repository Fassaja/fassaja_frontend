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
