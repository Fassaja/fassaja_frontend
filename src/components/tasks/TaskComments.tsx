import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Trash2, Pencil, Send, X } from 'lucide-react';
import { commentsService, TaskComment } from '@/services/commentsService';
import { useToast } from '@/contexts/ToastContext';
import { initialsOf } from '@/contexts/UserContext';
import { tempoRelativo } from '@/utils/date';

const MAX_COMMENT = 2000; // igual ao teto do servidor

/**
 * A conversa da tarefa.
 *
 * Carrega sob demanda, quando a tarefa é aberta: a lista de tarefas tem
 * dezenas de itens e trazer a conversa de todas de antemão pagaria por algo
 * que quase nunca é lido.
 *
 * Numa tarefa pessoal isto continua sendo só um campo de anotação — não muda
 * nada de quem usa sozinho, que simplesmente nunca vai ter um comentário aqui.
 */
export const TaskComments: React.FC<{ taskId: string }> = ({ taskId }) => {
  const toast = useToast();
  const [comentarios, setComentarios] = useState<TaskComment[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [textoEditado, setTextoEditado] = useState('');
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    commentsService
      .list(taskId)
      .then(lista => {
        // A tarefa pode ter mudado enquanto a resposta vinha; sem esta guarda
        // a conversa de uma tarefa apareceria dentro de outra.
        if (!cancelado) setComentarios(lista);
      })
      .catch(() => {
        if (!cancelado) setComentarios([]);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [taskId]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const corpo = texto.trim();
    if (!corpo || enviando) return;
    setEnviando(true);
    try {
      const novo = await commentsService.create(taskId, corpo);
      setComentarios(atual => [...atual, novo]);
      setTexto('');
      // Rola até o que acabou de ser escrito, senão ele nasce fora da vista.
      requestAnimationFrame(() => fimRef.current?.scrollIntoView({ block: 'nearest' }));
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível comentar.');
    } finally {
      setEnviando(false);
    }
  };

  const salvarEdicao = async (id: string) => {
    const corpo = textoEditado.trim();
    if (!corpo) return;
    try {
      const salvo = await commentsService.update(taskId, id, corpo);
      setComentarios(atual => atual.map(c => (c.id === id ? salvo : c)));
      setEditando(null);
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível editar.');
    }
  };

  const apagar = async (id: string) => {
    // Some da tela na hora; volta se o servidor recusar. Apagar é o gesto em
    // que a espera mais incomoda, e o erro aqui é raro.
    const antes = comentarios;
    setComentarios(atual => atual.filter(c => c.id !== id));
    try {
      await commentsService.remove(taskId, id);
    } catch (err) {
      setComentarios(antes);
      toast.error((err as Error).message || 'Não foi possível apagar.');
    }
  };

  return (
    <section className="pt-4 border-t border-border">
      <h4 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3">
        <MessageSquare size={16} className="text-primary-vibrant" />
        Conversa
        {comentarios.length > 0 && (
          <span className="text-xs font-bold text-text-secondary bg-bg-secondary rounded-full px-2 py-0.5 border border-border">
            {comentarios.length}
          </span>
        )}
      </h4>

      {carregando ? (
        <p className="text-sm text-text-soft py-2">Carregando…</p>
      ) : comentarios.length === 0 ? (
        <p className="text-sm text-text-soft py-2">
          Nada por aqui ainda. Combine o que precisa ser feito.
        </p>
      ) : (
        <ul className="space-y-3 mb-3 max-h-64 overflow-y-auto pr-1">
          {comentarios.map(c => (
            <li key={c.id} className="flex gap-2.5">
              <span
                aria-hidden
                className="w-7 h-7 shrink-0 rounded-full bg-primary-light text-primary-vibrant grid place-items-center text-[11px] font-bold"
              >
                {initialsOf(c.author.name)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-text-primary">{c.author.name}</span>
                  <span className="text-xs text-text-soft">{tempoRelativo(c.createdAt)}</span>
                  {c.editedAt && <span className="text-xs text-text-soft">· editado</span>}
                </div>

                {editando === c.id ? (
                  <div className="mt-1 flex gap-1.5">
                    <textarea
                      autoFocus
                      value={textoEditado}
                      maxLength={MAX_COMMENT}
                      onChange={e => setTextoEditado(e.target.value)}
                      className="flex-1 text-sm rounded-lg border border-border bg-surface px-2.5 py-1.5 text-text-primary focus:outline-none focus:border-primary-vibrant resize-y min-h-[60px]"
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        aria-label="Salvar edição"
                        onClick={() => salvarEdicao(c.id)}
                        className="p-1.5 rounded-lg text-primary-vibrant hover:bg-primary-light min-h-[40px] sm:min-h-0"
                      >
                        <Send size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Cancelar edição"
                        onClick={() => setEditando(null)}
                        className="p-1.5 rounded-lg text-text-soft hover:bg-bg-secondary min-h-[40px] sm:min-h-0"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-start gap-1">
                    {/* whitespace-pre-wrap: quebras de linha do texto original
                        são parte do que a pessoa escreveu. */}
                    <p className="flex-1 text-sm text-text-secondary whitespace-pre-wrap break-words">
                      {c.body}
                    </p>
                    {c.canEdit && (
                      <button
                        type="button"
                        aria-label="Editar comentário"
                        onClick={() => {
                          setEditando(c.id);
                          setTextoEditado(c.body);
                        }}
                        className="p-1 rounded text-text-soft hover:text-primary-vibrant opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {c.canDelete && (
                      <button
                        type="button"
                        aria-label="Apagar comentário"
                        onClick={() => apagar(c.id)}
                        className="p-1 rounded text-text-soft hover:text-danger opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
          <div ref={fimRef} />
        </ul>
      )}

      <form onSubmit={enviar} className="flex items-end gap-2">
        <textarea
          value={texto}
          maxLength={MAX_COMMENT}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => {
            // Enter envia, Shift+Enter quebra linha — o que todo mundo já
            // espera de um campo de conversa.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void enviar(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Escrever um comentário…"
          rows={1}
          className="flex-1 text-sm rounded-xl border border-border bg-surface px-3 py-2 text-text-primary placeholder-text-soft focus:outline-none focus:border-primary-vibrant resize-y min-h-[40px]"
        />
        <button
          type="submit"
          disabled={!texto.trim() || enviando}
          aria-label="Enviar comentário"
          className="shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-primary-vibrant text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </section>
  );
};
