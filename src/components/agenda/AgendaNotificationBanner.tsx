import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import {
  pushService,
  pushSupported,
  isIOS,
  isStandalone,
  notificationPermission,
} from '@/services/pushService';

/**
 * Aviso na Agenda para ativar os lembretes. Aparece sempre que a pessoa entra
 * na página ENQUANTO as notificações não estiverem permitidas; some quando ela
 * concede a permissão. Pode ser dispensado só na visita atual (volta na próxima).
 */
export const AgendaNotificationBanner: React.FC = () => {
  const toast = useToast();
  const [permission, setPermission] = useState(notificationPermission());
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (permission === 'granted' || dismissed) return null;

  const needsInstall = isIOS() && !isStandalone(); // iOS só permite push no PWA instalado
  const supported = pushSupported();
  // Nada a oferecer (navegador sem suporte e não é caso de instalar no iPhone).
  if (!supported && !needsInstall) return null;

  const canEnableHere = supported && !needsInstall && permission !== 'denied';

  const handleEnable = async () => {
    setBusy(true);
    try {
      const ok = await pushService.enable();
      if (ok) {
        setPermission('granted');
        toast.success('Notificações ativadas! Avisaremos quando um evento estiver chegando.');
      } else {
        const p = notificationPermission();
        setPermission(p);
        if (p === 'denied') toast.error('Permissão bloqueada. Libere nas configurações do navegador.');
      }
    } catch {
      toast.error('Não foi possível ativar as notificações.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-primary-vibrant/30 bg-primary-light px-4 py-3">
      <span className="w-9 h-9 rounded-xl bg-white text-primary-vibrant flex items-center justify-center shrink-0">
        <Bell size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">Ative os lembretes da Agenda</p>
        {needsInstall ? (
          <p className="text-xs text-text-secondary mt-0.5">
            No iPhone, instale o Fassaja na tela de início para receber os avisos. Passo a passo em
            Ajuda → Fale conosco.
          </p>
        ) : permission === 'denied' ? (
          <p className="text-xs text-text-secondary mt-0.5">
            As notificações estão bloqueadas. Libere nas configurações do navegador (cadeado na barra
            de endereço) para receber lembretes.
          </p>
        ) : (
          <p className="text-xs text-text-secondary mt-0.5">
            Receba um aviso quando um evento estiver chegando, mesmo com o app fechado.
          </p>
        )}
        {canEnableHere && (
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-primary-vibrant hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100"
          >
            <Bell size={15} /> Ativar notificações
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dispensar"
        className="p-1.5 rounded-lg text-text-secondary hover:bg-white/60 transition-colors shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
};
