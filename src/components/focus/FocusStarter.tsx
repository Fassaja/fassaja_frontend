import React, { useState } from 'react';
import { Timer } from 'lucide-react';
import { useFocus } from '@/contexts/FocusContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * "Focar nesta tarefa" — o começo de uma sessão, a partir da tarefa aberta.
 *
 * As durações são fixas de propósito. Um campo livre transformaria a decisão
 * de "vou trabalhar nisto agora" numa configuração, e o gesto tem de caber num
 * clique. 25 é o Pomodoro clássico; 15 é para quando sobra pouco tempo; 50 é
 * para quem já entrou no ritmo.
 */
const DURACOES = [15, 25, 50];

export const FocusStarter: React.FC<{ taskId: string }> = ({ taskId }) => {
  const { sessao, iniciar, iniciando } = useFocus();
  const { isGuest } = useAuth();
  const [aberto, setAberto] = useState(false);

  /*
   * Visitante não tem onde guardar a sessão: ela vive no servidor, e ele não
   * tem conta. Sem esta guarda o botão aparecia, o pedido saía, voltava 401 e
   * a pessoa recebia um erro vermelho por ter clicado no que estava à mostra.
   * Some inteiro — oferecer e recusar em seguida é pior do que não oferecer.
   */
  if (isGuest) return null;

  const emAndamentoNesta = sessao?.taskId === taskId;

  if (emAndamentoNesta) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-vibrant">
        <Timer size={14} /> Sessão de foco em andamento
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-primary-vibrant/50 hover:text-primary-vibrant min-h-[36px] sm:min-h-0"
        >
          <Timer size={14} /> Focar nesta tarefa
        </button>
      ) : (
        <>
          <span className="text-xs text-text-soft">Por quanto tempo?</span>
          {DURACOES.map(m => (
            <button
              key={m}
              type="button"
              disabled={iniciando}
              onClick={async () => {
                await iniciar(m, taskId);
                setAberto(false);
              }}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-primary-vibrant/50 hover:text-primary-vibrant disabled:opacity-50 min-h-[36px] sm:min-h-0"
            >
              {m} min
            </button>
          ))}
        </>
      )}
      {sessao && !emAndamentoNesta && (
        // Sem este aviso, começar aqui pareceria não ter feito nada — a sessão
        // da outra tarefa some e a pessoa não sabe por quê.
        <span className="text-[11px] text-text-soft">Isto encerra a sessão em andamento.</span>
      )}
    </div>
  );
};
