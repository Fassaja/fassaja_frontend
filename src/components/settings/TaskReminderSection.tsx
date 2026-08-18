import React, { useState } from 'react';
import { Toggle } from '@/components/common/Toggle';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { fusoDoNavegador, reminderService } from '@/services/reminderService';

const ANTECEDENCIA = [
  { valor: 0, rotulo: 'No dia do prazo' },
  { valor: 1, rotulo: 'Um dia antes' },
  { valor: 2, rotulo: 'Dois dias antes' },
  { valor: 7, rotulo: 'Uma semana antes' },
];

/**
 * Lembrete de prazo de tarefa.
 *
 * Uma preferência só, e não uma por tarefa: o prazo já é escolhido na criação,
 * e perguntar "quer ser avisada?" toda vez seria uma decisão repetida com a
 * mesma resposta. Mudar aqui reagenda o que já existe — o servidor cuida
 * disso —, senão trocar o horário valeria só para tarefas futuras.
 */
export const TaskReminderSection: React.FC = () => {
  const { account, patchAccount } = useAuth();
  const toast = useToast();

  const [ligado, setLigado] = useState(account?.taskReminder ?? true);
  const [hora, setHora] = useState(account?.taskReminderTime ?? '09:00');
  const [antes, setAntes] = useState(account?.taskReminderDaysBefore ?? 0);
  const [salvando, setSalvando] = useState(false);

  const semPermissao =
    typeof Notification !== 'undefined' && Notification.permission !== 'granted';

  const salvar = async (patch: {
    taskReminder?: boolean;
    taskReminderTime?: string;
    taskReminderDaysBefore?: number;
  }) => {
    setSalvando(true);
    try {
      // Manda o fuso junto: é a única coisa sem a qual o lembrete não sai, e
      // quem está justamente mexendo nesta tela é quem mais quer que funcione.
      const salvo = await reminderService.update({ ...patch, timeZone: fusoDoNavegador() });
      // Espelha no account para a tela não voltar ao valor antigo quando for
      // reaberta — a rota é do módulo de tarefas e não passa pelo /auth/me.
      patchAccount(salvo);
    } catch {
      toast.error('Não foi possível salvar. Tente novamente.');
      // Devolve a tela ao que o servidor tem, para o controle não mentir.
      setLigado(account?.taskReminder ?? true);
      setHora(account?.taskReminderTime ?? '09:00');
      setAntes(account?.taskReminderDaysBefore ?? 0);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 rounded-xl p-3 transition-colors hover:bg-bg-secondary">
        <div className="min-w-0">
          <p className="font-medium text-text-primary">Avisar sobre prazos</p>
          <p className="text-xs text-text-secondary">
            Uma notificação por tarefa com prazo. Atrasada não vira cobrança diária.
          </p>
        </div>
        <Toggle
          checked={ligado}
          onChange={() => {
            const novo = !ligado;
            setLigado(novo);
            salvar({ taskReminder: novo });
          }}
        />
      </div>

      {ligado && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl p-3">
            <label htmlFor="hora-lembrete" className="font-medium text-text-primary">
              Horário
            </label>
            <input
              id="hora-lembrete"
              type="time"
              value={hora}
              disabled={salvando}
              onChange={e => setHora(e.target.value)}
              // Grava no blur, e não a cada tecla: o seletor de hora emite uma
              // mudança por dígito, e salvar em todas geraria quatro escritas
              // (e quatro reagendamentos) para uma única troca de horário.
              onBlur={() => hora !== account?.taskReminderTime && salvar({ taskReminderTime: hora })}
              className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary focus:border-primary-vibrant focus:outline-none focus:ring-4 focus:ring-primary-light/60"
            />
          </div>

          <div className="rounded-xl p-3">
            <p className="mb-2 font-medium text-text-primary">Quando avisar</p>
            <div className="flex flex-wrap gap-2">
              {ANTECEDENCIA.map(op => {
                const ativo = antes === op.valor;
                return (
                  <button
                    key={op.valor}
                    type="button"
                    disabled={salvando}
                    aria-pressed={ativo}
                    onClick={() => {
                      setAntes(op.valor);
                      salvar({ taskReminderDaysBefore: op.valor });
                    }}
                    className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-60 ${
                      ativo
                        ? 'border-primary-vibrant bg-primary-light text-primary-vibrant'
                        : 'border-border bg-surface text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {op.rotulo}
                  </button>
                );
              })}
            </div>
          </div>

          {semPermissao && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              Este navegador ainda não autorizou notificações — sem isso o aviso não
              chega. Ative as notificações do Fassaja para valer.
            </p>
          )}
        </>
      )}
    </div>
  );
};
