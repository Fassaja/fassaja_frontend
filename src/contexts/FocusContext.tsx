import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { focusService, FocusSession } from '@/services/focusService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { segundosAte } from '@/utils/timer';
import { SessaoConcluidaModal } from '@/components/focus/SessaoConcluidaModal';

interface FocusContextValue {
  sessao: FocusSession | null;
  /**
   * A sessão que ACABOU de terminar e ainda não foi resolvida.
   *
   * Fica aqui, e não numa página, porque o fim pode pegar a pessoa em
   * qualquer tela — inclusive com o app em segundo plano. É este objeto que
   * abre o aviso de "o que fazer com este tempo".
   */
  concluida: FocusSession | null;
  /** Descarta o tempo da sessão recém-terminada. */
  descartar: () => Promise<void>;
  /** Fecha o aviso mantendo o tempo registrado. */
  manter: () => void;
  /** Recalculado a cada segundo A PARTIR DO RELÓGIO, nunca decrementado. */
  restante: number;
  iniciando: boolean;
  iniciar: (minutes: number, taskId?: string, kind?: 'foco' | 'pausa') => Promise<void>;
  encerrar: () => Promise<void>;
}

const FocusContext = createContext<FocusContextValue>({
  sessao: null,
  concluida: null,
  descartar: async () => {},
  manter: () => {},
  restante: 0,
  iniciando: false,
  iniciar: async () => {},
  encerrar: async () => {},
});

export const useFocus = () => useContext(FocusContext);

/**
 * A sessão de foco em andamento.
 *
 * O estado vive no SERVIDOR, e este contexto só reflete: ao abrir o app ele
 * pergunta o que está rodando. Assim quem começou no celular e abriu no
 * computador vê o mesmo tempo — o timer não é um estado de aba.
 */
export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, isGuest } = useAuth();
  const toast = useToast();
  const [sessao, setSessao] = useState<FocusSession | null>(null);
  const [concluida, setConcluida] = useState<FocusSession | null>(null);
  const [restante, setRestante] = useState(0);
  const [iniciando, setIniciando] = useState(false);
  // Espelho para o intervalo não depender do estado capturado no fechamento.
  const sessaoRef = useRef<FocusSession | null>(null);
  sessaoRef.current = sessao;

  // Ao entrar: o que está rodando? Convidado não tem servidor onde guardar.
  useEffect(() => {
    if (status !== 'authed' || isGuest) return;
    let vivo = true;
    focusService
      .current()
      .then(s => vivo && setSessao(s))
      // Silencioso: sem sessão a tela funciona igual, só sem o timer.
      .catch(() => vivo && setSessao(null));
    return () => {
      vivo = false;
    };
  }, [status, isGuest]);

  /*
   * O intervalo só REDESENHA. O valor sai sempre de `endsAt - agora`, então
   * um segundo perdido (aba de fundo, celular bloqueado) não acumula erro:
   * o próximo desenho já mostra o número certo.
   */
  useEffect(() => {
    if (!sessao) {
      setRestante(0);
      return;
    }
    const recalcular = () => {
      const s = sessaoRef.current;
      if (!s) return;
      const falta = segundosAte(s.endsAt);
      setRestante(falta);
      if (falta === 0) {
        // Acabou. O servidor já encerrou (ou vai encerrar no próximo minuto).
        setSessao(null);
        if (s.kind === 'foco') {
          // Foco abre o aviso: o tempo acabou de virar um número e há uma
          // decisão a tomar sobre ele — registrar, descartar, concluir a
          // tarefa. Um toast desapareceria antes de a pessoa decidir.
          setConcluida(s);
        } else {
          // Pausa não tem o que decidir: não conta tempo e não tem tarefa.
          toast.success('Pausa encerrada.');
        }
      }
    };
    recalcular();
    const id = setInterval(recalcular, 1000);
    // `visibilitychange`: voltar para a aba recalcula na hora, sem esperar o
    // próximo tique — que pode ter sido estrangulado enquanto ela estava atrás.
    document.addEventListener('visibilitychange', recalcular);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', recalcular);
    };
  }, [sessao, toast]);

  const iniciar = useCallback(
    async (minutes: number, taskId?: string, kind: 'foco' | 'pausa' = 'foco') => {
      // Trava também aqui, e não só no botão: a sessão vive no servidor, e um
      // caminho novo que esqueça a guarda de tela cairia num 401 em vez de num
      // aviso claro.
      if (isGuest) {
        toast.info('Entre para usar as sessões de foco — elas ficam guardadas na sua conta.');
        return;
      }
      setIniciando(true);
      try {
        setSessao(await focusService.start(minutes, taskId, kind));
      } catch (err) {
        toast.error((err as Error).message || 'Não foi possível iniciar a sessão.');
      } finally {
        setIniciando(false);
      }
    },
    [toast, isGuest],
  );

  const encerrar = useCallback(async () => {
    const s = sessaoRef.current;
    if (!s) return;
    // Some da tela na hora: parar é o gesto em que a espera mais incomoda.
    setSessao(null);
    try {
      await focusService.stop(s.id);
    } catch (err) {
      setSessao(s); // o servidor recusou: devolve o que estava lá
      toast.error((err as Error).message || 'Não foi possível encerrar a sessão.');
    }
  }, [toast]);

  const descartar = useCallback(async () => {
    const s = concluida;
    if (!s) return;
    setConcluida(null);
    try {
      await focusService.discard(s.id);
      toast.info('Tempo descartado.');
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível descartar o tempo.');
    }
  }, [concluida, toast]);

  const manter = useCallback(() => setConcluida(null), []);

  return (
    <FocusContext.Provider
      value={{ sessao, concluida, restante, iniciando, iniciar, encerrar, descartar, manter }}
    >
      {children}
      {/* Renderizado aqui, dentro do provider: o fim da sessão pega a pessoa
          em qualquer tela, e pendurar o aviso numa página só faria ele não
          aparecer justamente quando ela está em outra. */}
      <SessaoConcluidaModal />
    </FocusContext.Provider>
  );
};
