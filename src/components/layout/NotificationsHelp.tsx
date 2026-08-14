import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Check, Smartphone, Monitor, Share } from 'lucide-react';
import { Accordion } from '@/components/common/Accordion';
import { useToast } from '@/contexts/ToastContext';
import {
  pushService,
  pushSupported,
  isIOS,
  isStandalone,
  notificationPermission,
} from '@/services/pushService';

// Bloco "Fale conosco": tutorial + botão para ativar os lembretes por
// notificação (Web Push). Cobre Android/computador e iPhone (PWA).
export const NotificationsHelp: React.FC = () => {
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(notificationPermission());

  const supported = pushSupported();
  const iOS = isIOS();
  const standalone = isStandalone();
  // No iPhone, o push só funciona com o app instalado na tela de início.
  const iosNeedsInstall = iOS && !standalone;

  useEffect(() => {
    pushService.isEnabled().then(setEnabled).catch(() => setEnabled(false));
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    try {
      const ok = await pushService.enable();
      if (ok) {
        setEnabled(true);
        toast.success('Notificações ativadas neste dispositivo.');
      } else if (notificationPermission() === 'denied') {
        toast.error('Permissão bloqueada. Libere nas configurações do navegador.');
      } else {
        toast.info('Não foi possível ativar aqui. Siga o passo a passo abaixo.');
      }
    } catch {
      toast.error('Não foi possível ativar as notificações.');
    } finally {
      setPerm(notificationPermission());
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await pushService.disable();
      setEnabled(false);
      toast.success('Notificações desativadas neste dispositivo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-primary-light text-primary-vibrant flex items-center justify-center shrink-0">
          <BellRing size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">Lembretes por notificação</p>
          <p className="text-xs text-text-secondary">
            Receba um aviso quando um evento da Agenda estiver chegando, mesmo com o app fechado.
          </p>
        </div>
      </div>

      {!supported ? (
        <p className="text-xs text-text-secondary">
          Este navegador não suporta notificações. Tente pelo Chrome (Android/computador) ou pelo
          Safari no iPhone com o app instalado na tela de início.
        </p>
      ) : enabled ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <Check size={16} /> Ativado neste dispositivo
          </span>
          <button
            type="button"
            onClick={handleDisable}
            disabled={busy}
            className="text-xs font-semibold text-text-secondary hover:text-danger disabled:opacity-60"
          >
            Desativar
          </button>
        </div>
      ) : (
        <>
          {!iosNeedsInstall && (
            <button
              type="button"
              onClick={handleEnable}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-vibrant hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100"
            >
              <Bell size={16} /> Ativar notificações
            </button>
          )}
          {perm === 'denied' && (
            <p className="text-xs text-danger">
              As notificações estão bloqueadas para o Fassaja. Libere nas configurações do navegador
              (cadeado na barra de endereço) e tente de novo.
            </p>
          )}
        </>
      )}

      {/* Passo a passo por plataforma.
          Antes os dois ficavam abertos ao mesmo tempo, e quem estava no Android
          lia as instruções de iPhone à toa. Como a plataforma já é conhecida
          (`isIOS`), o item certo abre sozinho e o outro fica a um clique — nada
          some para quem estiver num aparelho diferente do detectado. */}
      <Accordion
        className="pt-1"
        defaultOpenId={iOS ? 'ios' : 'outros'}
        items={[
          {
            id: 'outros',
            icon: <Monitor size={14} className="shrink-0 text-text-secondary" />,
            title: 'Android / Computador',
            content: (
              <p className="text-xs text-text-secondary">
                Toque em <span className="font-semibold">Ativar notificações</span> e escolha{' '}
                <span className="font-semibold">Permitir</span> quando o navegador perguntar.
              </p>
            ),
          },
          {
            id: 'ios',
            icon: <Smartphone size={14} className="shrink-0 text-text-secondary" />,
            title: 'iPhone / iPad',
            content: (
              <>
                <ol className="text-xs text-text-secondary list-decimal pl-4 space-y-0.5">
                  <li>
                    Toque em <Share size={11} className="inline -mt-0.5" />{' '}
                    <span className="font-semibold">Compartilhar</span> no Safari.
                  </li>
                  <li>
                    Escolha <span className="font-semibold">Adicionar à Tela de Início</span>.
                  </li>
                  <li>Abra o Fassaja por esse novo ícone.</li>
                  <li>
                    Toque em <span className="font-semibold">Ativar notificações</span> aqui dentro.
                  </li>
                </ol>
                {iosNeedsInstall && (
                  <p className="text-[11px] text-primary-vibrant font-semibold mt-1.5">
                    Detectamos um iPhone/iPad — instale na tela de início para liberar o botão.
                  </p>
                )}
              </>
            ),
          },
        ]}
      />
    </div>
  );
};
