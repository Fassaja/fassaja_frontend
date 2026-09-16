import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useProStatus } from '@/contexts/ProContext';
import { useToast } from '@/contexts/ToastContext';
import { billingService } from '@/services/billingService';
import { ANDROID_PACKAGE, PLAY_SKU } from '@/utils/playConfig';
import { linkGerenciarAssinatura } from '@/utils/twa';

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * O estado da assinatura de quem É Pro, com a ação certa para cada loja:
 * cancelar em um clique (Mercado Pago) ou gerenciar na Play Store (Google —
 * a assinatura é contrato com eles, não temos como cancelar daqui).
 *
 * Usado na página do Pro e nas Configurações, para o texto e a regra serem
 * um só.
 */
export const AssinaturaAtual: React.FC<{ align?: 'left' | 'center' }> = ({ align = 'left' }) => {
  const { status, recarregar } = useProStatus();
  const toast = useToast();
  const [cancelando, setCancelando] = useState(false);
  if (!status?.pro) return null;

  const cancelarWeb = async () => {
    if (!window.confirm('Cancelar a assinatura? O Pro continua até o fim do período já pago.')) return;
    setCancelando(true);
    try {
      await billingService.cancelMercadoPago();
      await recarregar();
      toast.success('Assinatura cancelada. O Pro vale até o fim do período pago.');
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível cancelar agora.');
    } finally {
      setCancelando(false);
    }
  };

  const ate = status.until ? formatarData(status.until) : null;
  const web = status.provider === 'mercado_pago';
  const textAlign = align === 'center' ? 'text-center' : '';

  return (
    <div className={textAlign}>
      <p className="text-text-secondary">
        {status.autoRenewing ? (
          <>
            Renova em <strong className="text-text-primary">{ate}</strong>
            {web ? ', no cartão, pelo Mercado Pago.' : ', pela Google Play.'}
          </>
        ) : (
          <>
            Renovação cancelada — o Pro continua até{' '}
            <strong className="text-text-primary">{ate}</strong>.
          </>
        )}
      </p>
      {web ? (
        status.autoRenewing && (
          <button
            type="button"
            onClick={cancelarWeb}
            disabled={cancelando}
            className="mt-4 text-sm font-medium text-text-secondary underline underline-offset-2 hover:text-danger disabled:opacity-60"
          >
            {cancelando ? 'Cancelando…' : 'Cancelar assinatura'}
          </button>
        )
      ) : (
        <a
          href={linkGerenciarAssinatura(ANDROID_PACKAGE, PLAY_SKU)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-vibrant hover:text-primary-hover"
        >
          Gerenciar na Play Store <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
};
