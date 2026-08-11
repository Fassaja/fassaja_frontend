import { api } from './api';

// Faixas espelhadas do back-end (pro-interest/dto/create-pro-interest.dto.ts).
// Mudar um valor aqui sem mudar lá derruba a validação com "Escolha uma das
// faixas de preço" — o rótulo é livre, o `value` não.
export type PriceBand = 'ate-9' | '10-19' | '20-29' | '30-mais' | 'nao-pagaria';

export interface ProInterestInput {
  email: string;
  priceBand: PriceBand;
  message?: string;
}

// Lista de espera do plano Pro. `register` é público (funciona para visitante e
// vincula à conta sozinho quando há sessão); `status` exige sessão e responde
// só sobre o próprio usuário — é o que o sino consulta para não lembrar quem já
// respondeu. A regra dos 7 dias fica em utils/proReminder.
export const proService = {
  register: (input: ProInterestInput) =>
    api.post<{ registered: boolean }>('/pro-interest', input),
  status: () => api.get<{ responded: boolean }>('/pro-interest/status'),
};
