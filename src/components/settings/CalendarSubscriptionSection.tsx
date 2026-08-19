import React, { useEffect, useState } from 'react';
import { Copy, Check, RefreshCw, CalendarDays, AlertTriangle } from 'lucide-react';
import { calendarService, urlDoFeed, linksDeAssinatura } from '@/services/calendarService';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

/**
 * Assinatura de calendário (.ics).
 *
 * Uma URL secreta que o Google, o Apple Calendar ou o Outlook buscam sozinhos.
 * Vale por si: quem tem o endereço lê a agenda inteira sem senha — daí o aviso
 * e o botão de gerar outra.
 */

/**
 * Marca do Google, no traçado de 18×18 que ele publica para botões de login.
 *
 * Só o Google ganha logotipo: para Apple e Outlook uso um glifo de calendário
 * na cor da marca. O `webcal://` nem sempre abre o Calendário da Apple — abre o
 * aplicativo PADRÃO do sistema —, então carimbar a maçã ali seria promessa que
 * o link não cumpre.
 */
const MarcaGoogle: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden focusable="false">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
  </svg>
);

const BotaoCalendario: React.FC<{
  href: string;
  cor: string;
  icone: React.ReactNode;
  children: React.ReactNode;
  desabilitado?: boolean;
  /** Por que está desabilitado — vira o `title`, para não ser um botão morto e mudo. */
  motivo?: string;
  onClick?: () => void;
}> = ({ href, cor, icone, children, desabilitado = false, motivo, onClick }) => {
  const conteudo = (
    <>
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: cor }}
      >
        {icone}
      </span>
      {children}
    </>
  );
  // min-h de 40px no celular: com py-2 o botão fica em ~36px, abaixo do alvo
  // confortável de toque que o resto do app já adota.
  const base =
    'inline-flex min-h-[40px] sm:min-h-0 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold transition-all';

  if (desabilitado) {
    return (
      <span
        title={motivo}
        aria-disabled="true"
        className={`${base} cursor-not-allowed bg-bg-secondary text-text-soft opacity-60`}
      >
        {conteudo}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`${base} bg-surface text-text-primary hover:border-primary-vibrant/40 hover:bg-bg-secondary active:scale-95`}
    >
      {conteudo}
    </a>
  );
};

/**
 * O endereço é local? O Google busca o arquivo dos servidores DELE, então
 * `localhost` ali é a máquina do próprio Google — onde não há Fassaja nenhum.
 * Oferecer o botão em desenvolvimento só entrega um erro sem explicação.
 * (Apple e Outlook web também não alcançam; só o webcal local funciona, porque
 * quem busca é o aplicativo na mesma máquina.)
 */
const ehLocal = (url: string) => /^(webcal|https?):\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(url);

export const CalendarSubscriptionSection: React.FC = () => {
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [confirmarTroca, setConfirmarTroca] = useState(false);
  const local = !!token && ehLocal(urlDoFeed(token));

  /**
   * Copia o endereço ANTES de abrir a Agenda.
   *
   * A tela que abre pede a URL num campo; ter o endereço já na área de
   * transferência transforma "vá buscar o link em outra aba" num Cmd+V. A
   * cópia não bloqueia a navegação: se a permissão for negada, o link abre
   * assim mesmo e o endereço continua visível aqui embaixo.
   */
  const abrirNoGoogle = () => {
    if (!token) return;
    navigator.clipboard
      ?.writeText(urlDoFeed(token))
      .then(() => toast.info('Endereço copiado. Cole no campo que abriu na Agenda.'))
      .catch(() => toast.info('Cole o endereço do calendário no campo que abriu.'));
  };

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

      {token && (
        <div className="flex flex-wrap gap-2">
          <BotaoCalendario
            href={linksDeAssinatura(token).google}
            cor="#fff"
            icone={<MarcaGoogle />}
            desabilitado={local}
            motivo="O Google busca o arquivo pelos servidores dele e não enxerga localhost. Funciona no site publicado."
            onClick={abrirNoGoogle}
          >
            Google Agenda
          </BotaoCalendario>
          <BotaoCalendario
            href={linksDeAssinatura(token).webcal}
            cor="#111827"
            icone={<CalendarDays size={14} className="text-white" />}
          >
            Apple / iPhone
          </BotaoCalendario>
          <BotaoCalendario
            href={linksDeAssinatura(token).outlook}
            cor="#0F6CBD"
            icone={<CalendarDays size={14} className="text-white" />}
            desabilitado={local}
            motivo="O Outlook na web também busca pelo servidor dele; não enxerga localhost."
          >
            Outlook
          </BotaoCalendario>
        </div>
      )}
      {carregando && <p className="text-sm text-text-soft">Carregando...</p>}

      <details className="rounded-xl border border-border p-3 text-sm">
        <summary className="cursor-pointer font-medium text-text-primary">
          Endereço manual, e quando as mudanças aparecem
        </summary>
        <div className="mt-2 space-y-2 text-text-secondary">
          {/* Fica à mão de propósito: os botões acima usam endereços que o
              Google e a Microsoft podem mudar sem aviso, e quando um quebrar é
              por aqui que a pessoa se vira sozinha. */}
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={token ? urlDoFeed(token) : ''}
              onFocus={e => e.currentTarget.select()}
              aria-label="Endereço do calendário"
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-bg-secondary px-2 font-mono text-[11px] text-text-secondary focus:outline-none"
            />
            <button
              type="button"
              onClick={copiar}
              disabled={!token}
              aria-label="Copiar endereço"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:text-primary-vibrant disabled:opacity-50 sm:h-9 sm:w-9"
            >
              {copiado ? <Check size={15} className="text-success" /> : <Copy size={15} />}
            </button>
          </div>
          <p>
            <strong className="text-text-primary">Google:</strong> o botão copia o endereço e abre
            a tela "Adicionar por URL" — é só colar e confirmar.
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
