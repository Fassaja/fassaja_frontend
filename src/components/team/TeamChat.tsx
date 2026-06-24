import React, { useEffect, useRef, useState } from 'react';
import { Send, MessagesSquare } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Message } from '@/types/message';
import { messagesService } from '@/services/messagesService';
import { useToast } from '@/contexts/ToastContext';
import { initialsOf } from '@/contexts/UserContext';

interface TeamChatProps {
  teamId: string;
  currentUserId?: string;
}

const POLL_MS = 4000;
const AVATAR_COLORS = ['#2477FF', '#8B5CF6', '#22C55E', '#FB7185', '#FBBF24', '#2DD4BF'];

// Cor estável por autor (mesma pessoa, mesma cor).
function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Junta mantendo ordem cronológica e sem duplicar (dedupe por id). ISO ordena
// lexicograficamente = cronologicamente.
function merge(existing: Message[], incoming: Message[]): Message[] {
  if (incoming.length === 0) return existing;
  const map = new Map(existing.map(m => [m.id, m]));
  incoming.forEach(m => map.set(m.id, m));
  return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export const TeamChat: React.FC<TeamChatProps> = ({ teamId, currentUserId }) => {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesRef = useRef<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Carga inicial + polling incremental (busca só o que chegou depois do último).
  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessages([]);
    atBottomRef.current = true;

    messagesService
      .list(teamId, { limit: 50 })
      .then(initial => {
        if (active) setMessages(initial);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    const poll = setInterval(async () => {
      const current = messagesRef.current;
      const since = current.length ? current[current.length - 1].createdAt : undefined;
      try {
        const news = await messagesService.list(teamId, since ? { since } : { limit: 50 });
        if (active && news.length) setMessages(prev => merge(prev, news));
      } catch {
        /* silencioso: o próximo ciclo tenta de novo */
      }
    }, POLL_MS);

    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [teamId]);

  // Mantém o scroll no fim quando o usuário já estava embaixo.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const msg = await messagesService.send(teamId, text);
      setMessages(prev => merge(prev, [msg]));
      setInput('');
      atBottomRef.current = true;
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <MessagesSquare size={18} className="text-primary-vibrant" />
        <h3 className="text-sm font-bold text-text-primary">Chat da equipe</h3>
        <span className="text-xs text-text-soft ml-auto">Mensagens somem após 7 dias</span>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 h-80 bg-bg-secondary/40"
      >
        {loading ? (
          <p className="text-sm text-text-soft text-center py-8">Carregando mensagens…</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-1">
            <MessagesSquare size={28} className="text-text-soft" />
            <p className="text-sm font-semibold text-text-primary">Nenhuma mensagem ainda</p>
            <p className="text-xs text-text-secondary">Diga olá para a equipe! 👋</p>
          </div>
        ) : (
          messages.map(m => {
            const mine = m.authorId === currentUserId;
            return (
              <div key={m.id} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: colorFor(m.authorId) }}
                  title={m.authorName}
                >
                  {initialsOf(m.authorName)}
                </div>
                <div className={`min-w-0 max-w-[75%] ${mine ? 'items-end' : ''} flex flex-col`}>
                  {!mine && (
                    <span className="text-[11px] font-semibold text-text-secondary mb-0.5 px-1">
                      {m.authorName}
                    </span>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap ${
                      mine
                        ? 'bg-primary-vibrant text-white rounded-br-sm'
                        : 'bg-white border border-border text-text-primary rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="text-[10px] text-text-soft mt-0.5 px-1">{formatTime(m.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-border">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escreva uma mensagem…"
          maxLength={2000}
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm text-text-primary placeholder:text-text-soft focus:outline-none focus:border-primary-vibrant"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          aria-label="Enviar mensagem"
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary-vibrant text-white hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
        >
          <Send size={17} />
        </button>
      </form>
    </Card>
  );
};
