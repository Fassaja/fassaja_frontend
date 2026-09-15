import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { billingService } from '@/services/billingService';
import { dentroDoApp } from '@/utils/twa';
import * as play from '@/utils/playBilling';

const KEY = 'fassaja_play_sync';

/**
 * Ao abrir o app logado, entrega ao servidor as compras que a conta Google
 * já fez do nosso app. Não renderiza nada.
 *
 * É o que recupera a assinatura num celular novo, e o que re-tenta um verify
 * que falhou por rede na hora da compra — sem isso o Google estorna em 3
 * dias uma compra que o servidor nunca soube que existia. Uma vez por sessão
 * do app basta: a compra nova passa pelo próprio fluxo de compra.
 *
 * Erros são engolidos de propósito: isto roda em segundo plano, e um 409
 * ("compra de outra conta") ou 503 (loja fora) não é algo para interromper
 * quem só abriu o app para ver as tarefas.
 */
export const PlayBillingSync: React.FC = () => {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'authed' || !dentroDoApp() || !play.disponivel()) return;
    try {
      if (sessionStorage.getItem(KEY) === '1') return;
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* sem sessionStorage, sincroniza a cada abertura — inofensivo */
    }
    void (async () => {
      let tokens: string[] = [];
      try {
        tokens = await play.comprasExistentes();
      } catch {
        return;
      }
      for (const token of tokens) {
        await billingService.verifyGoogle(token).catch(() => undefined);
      }
    })();
  }, [status]);

  return null;
};
