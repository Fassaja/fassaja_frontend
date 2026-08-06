import React, { useEffect, useState } from 'react';
import { Flame, Moon } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { updateStreakDays } from '@/services/authService';

const WEEKDAYS = [
  { value: 0, short: 'Dom', label: 'Domingo' },
  { value: 1, short: 'Seg', label: 'Segunda' },
  { value: 2, short: 'Ter', label: 'Terça' },
  { value: 3, short: 'Qua', label: 'Quarta' },
  { value: 4, short: 'Qui', label: 'Quinta' },
  { value: 5, short: 'Sex', label: 'Sexta' },
  { value: 6, short: 'Sáb', label: 'Sábado' },
];

interface StreakDaysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Editor dos dias que contam para a sequência produtiva. Dias desmarcados
// são "folga": ficar sem concluir tarefas neles não quebra a sequência.
export const StreakDaysModal: React.FC<StreakDaysModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useUser();
  const { isGuest } = useAuth();
  const toast = useToast();
  const [selected, setSelected] = useState<number[]>(user.streakDays ?? [0, 1, 2, 3, 4, 5, 6]);
  const [saving, setSaving] = useState(false);

  // Recarrega a seleção atual sempre que o modal abre.
  useEffect(() => {
    if (isOpen) setSelected(user.streakDays?.length ? user.streakDays : [0, 1, 2, 3, 4, 5, 6]);
  }, [isOpen, user.streakDays]);

  const toggle = (day: number) =>
    setSelected(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b),
    );

  const save = async () => {
    if (selected.length === 0) {
      toast.error('Escolha pelo menos um dia para a sequência.');
      return;
    }

    // Visitante não tem sessão: mantém a preferência só no navegador.
    if (isGuest) {
      updateUser({ streakDays: selected });
      toast.success('Dias da sequência atualizados.');
      onClose();
      return;
    }

    // Autenticado: atualização otimista + persistência no servidor.
    const previous = user.streakDays;
    updateUser({ streakDays: selected });
    setSaving(true);
    try {
      await updateStreakDays(selected);
      toast.success('Dias da sequência atualizados.');
      onClose();
    } catch (err) {
      updateUser({ streakDays: previous }); // reverte a UI se o servidor recusar
      toast.error((err as Error).message || 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dias da sequência" size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Escolha os dias em que você pretende trabalhar. Nos dias de folga (desmarcados), a sua
          sequência <strong>não quebra</strong> — assim o fim de semana não apaga o seu progresso.
        </p>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map(day => {
            const active = selected.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggle(day.value)}
                aria-pressed={active}
                title={day.label}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                  active
                    ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-300'
                    : 'bg-bg-secondary/60 border-dashed border-border text-text-soft'
                }`}
              >
                {active ? <Flame size={16} /> : <Moon size={16} className="opacity-50" />}
                {day.short}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-text-soft">
          <Flame size={12} className="inline -mt-0.5 text-amber-500 dark:text-amber-400" /> dia que conta para a
          sequência · <Moon size={12} className="inline -mt-0.5" /> folga
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
