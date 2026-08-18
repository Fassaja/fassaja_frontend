import React, { useEffect, useState } from 'react';
import { Copy, Check, RefreshCw, CalendarPlus, AlertTriangle } from 'lucide-react';
import { calendarService, urlDoFeed, urlWebcal } from '@/services/calendarService';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

/**
 * Assinatura de calendário (.ics).
 *
 * Uma URL secreta que o Google, o Apple Calendar ou o Outlook buscam sozinhos.
 * Vale por si: quem tem o endereço lê a agenda inteira sem senha — daí o aviso
 * e o botão de gerar outra.
 */
export const CalendarSubscriptionSection: React.FC = () => {
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [confirmarTroca, setConfirmarTroca] = useState(false);

  useEffect(() => {
    calendarService
      .get()
      .then(setToken)
      .catch(() => toast.error('Não foi possível carregar o endereço do calendário.'))
      .finally(() => setCarregando(false));
    // toast é estável no provider; incluí-lo recriaria o efeito a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copiar = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(urlDoFeed(token));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Área de transferência bloqueada (contexto inseguro, permissão negada):
      // o campo é selecionável, então dá para copiar à mão.
      toast.error('Não foi possível copiar. Selecione o endereço e copie manualmente.');
    }
  };

  const trocar = async () => {
    setConfirmarTroca(false);
    try {
      setToken(await calendarService.rotate());
      toast.success('Endereço novo gerado. Assine de novo nos seus calendários.');
    } catch {
      toast.error('Não foi possível gerar um endereço novo.');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        Seus eventos da Agenda e os prazos das tarefas pessoais, dentro do calendário
        que você já usa. Tarefas de equipe não entram.
      </p>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={carregando ? 'Carregando...' : token ? urlDoFeed(token) : 'indisponível'}
          onFocus={e => e.currentTarget.select()}
          aria-label="Endereço do calendário"
          className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-bg-secondary px-3 font-mono text-xs text-text-secondary focus:outline-none focus:ring-4 focus:ring-primary-light/60"
        />
        <button
          type="button"
          onClick={copiar}
          disabled={!token}
          aria-label="Copiar endereço"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary transition-colors hover:text-primary-vibrant disabled:opacity-50"
        >
          {copiado ? <Check size={16} className="text-success" /> : <Copy size={16} />}
        </button>
      </div>

      {token && (
        <a
          href={urlWebcal(token)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-vibrant px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <CalendarPlus size={16} /> Assinar no aplicativo de calendário
        </a>
      )}

      <details className="rounded-xl border border-border p-3 text-sm">
        <summary className="cursor-pointer font-medium text-text-primary">
          Como assinar, e quando as mudanças aparecem
        </summary>
        <div className="mt-2 space-y-2 text-text-secondary">
          <p>
            <strong className="text-text-primary">Google Agenda:</strong> Outros calendários → De
            URL → cole o endereço.
          </p>
          <p>
            <strong className="text-text-primary">Apple Calendar:</strong> Arquivo → Nova assinatura
            de calendário → cole o endereço.
          </p>
          <p>
            O Google atualiza calendários assinados no ritmo dele — costuma levar de algumas horas
            a um dia, e não há como acelerar. No Apple Calendar você escolhe o intervalo ao
            assinar, e ali a atualização é bem mais rápida.
          </p>
        </div>
      </details>

      <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        <span>
          Quem tiver este endereço vê sua agenda sem precisar de senha. Não publique em lugar
          aberto — e se ele vazar, gere outro.
        </span>
      </div>

      <button
        type="button"
        onClick={() => setConfirmarTroca(true)}
        disabled={!token}
        className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
      >
        <RefreshCw size={15} /> Gerar endereço novo
      </button>

      <ConfirmDialog
        isOpen={confirmarTroca}
        tone="danger"
        title="Gerar um endereço novo?"
        message="O endereço atual deixa de funcionar imediatamente."
        hint={
          <>
            <strong className="text-text-primary">Atenção:</strong> os calendários que já assinaram
            vão parar de atualizar até você assinar de novo com o endereço novo.
          </>
        }
        confirmLabel="Gerar novo"
        cancelLabel="Cancelar"
        onConfirm={trocar}
        onClose={() => setConfirmarTroca(false)}
      />
    </div>
  );
};
