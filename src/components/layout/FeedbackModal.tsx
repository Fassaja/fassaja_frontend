import React, { useEffect, useState } from 'react';
import { CalendarClock, MessageSquareHeart, Send } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/Textarea';
import { feedbackService, FeedbackStatus } from '@/services/feedbackService';
import { useToast } from '@/contexts/ToastContext';

const MAX_LENGTH = 2000;
const MIN_LENGTH = 10;

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Central de Feedbacks: 1 mensagem por semana, salva no banco de dados.
export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<FeedbackStatus | null>(null);
  const [sending, setSending] = useState(false);

  // Ao abrir, consulta se o envio da semana ainda está disponível.
  useEffect(() => {
    if (!isOpen) return;
    setStatus(null);
    feedbackService
      .status()
      .then(setStatus)
      .catch(() => setStatus({ canSend: true, nextAllowedAt: null }));
  }, [isOpen]);

  const nextDate = status?.nextAllowedAt
    ? new Date(status.nextAllowedAt).toLocaleDateString('pt-BR')
    : null;

  const send = async () => {
    const text = message.trim();
    if (text.length < MIN_LENGTH) {
      toast.error(`Conte um pouco mais — pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    setSending(true);
    try {
      const result = await feedbackService.send(text);
      setStatus(result);
      setMessage('');
      toast.success('Feedback enviado. Obrigado por ajudar o Fassaja a melhorar! 💙');
      onClose();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível enviar o feedback.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Central de feedbacks" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-primary-light/60">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-surface text-primary-vibrant flex items-center justify-center">
            <MessageSquareHeart size={18} />
          </span>
          <p className="text-sm text-primary-dark/80">
            Sugestões, elogios ou algo que incomodou? Sua mensagem vai direto para a equipe.
            Você pode enviar <strong>1 feedback por semana</strong>.
          </p>
        </div>

        {status && !status.canSend ? (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-bg-secondary/60">
            <CalendarClock size={20} className="text-text-secondary shrink-0" />
            <p className="text-sm text-text-secondary">
              Você já enviou seu feedback desta semana — obrigado!
              {nextDate && (
                <>
                  {' '}
                  Um novo envio libera em <strong>{nextDate}</strong>.
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            <Textarea
              label="Sua mensagem"
              rows={5}
              maxLength={MAX_LENGTH}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="O que podemos melhorar? O que você adorou?"
              helperText={`${message.length}/${MAX_LENGTH} caracteres`}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={send}
                isLoading={sending}
                disabled={status === null}
                icon={<Send size={16} />}
              >
                Enviar feedback
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
