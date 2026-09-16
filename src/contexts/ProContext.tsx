import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Mascot } from '@/components/mascot/Mascot';
import { useAuth } from '@/contexts/AuthContext';
import { billingService, ProStatus } from '@/services/billingService';
import { PRO_REQUIRED_EVENT } from '@/services/api';
import {
  ondeAssinarAgora,
  definirWebAtiva,
  PRO_WEEKLY_LIMIT,
  FREE_PROJECT_LIMIT,
  PRO_PRECO_FALLBACK,
  formatarPreco,
} from '@/utils/playConfig';
import type { OndeAssinar } from '@/utils/twa';

/** As áreas que o Pro destrava. O rótulo aparece no aviso e no convite. */
export type AreaPro = 'equipe' | 'ideias' | 'agenda' | 'foco';
export const AREAS_PRO: Record<AreaPro, { titulo: string; oQue: string }> = {
  equipe: { titulo: 'Equipes', oQue: 'criar equipes' },
  ideias: { titulo: 'Ideias', oQue: 'registrar e editar ideias' },
  agenda: { titulo: 'Agenda', oQue: 'marcar e editar compromissos' },
  foco: { titulo: 'Foco', oQue: 'iniciar sessões de foco' },
};

interface ProContextValue {
  /** Status vindo do servidor; null enquanto carrega ou sem sessão. */
  status: ProStatus | null;
  pro: boolean;
  /**
   * As áreas do Pro estão TRANCADAS para esta pessoa? Só quando o Pro existe
   * (app na loja) e ela não é Pro. Antes da loja, nada é trancado — o
   * servidor segue a mesma regra (ProGuard).
   */
  trancado: boolean;
  recarregar: () => Promise<void>;
  /** Abre o convite ao Pro. As telas chamam antes de uma ação trancada. */
  convidar: (area?: AreaPro) => void;
  /** Preço mensal formatado ("R$ 12,90"), vindo do servidor. */
  preco: string;
  /**
   * Onde esta pessoa pode assinar agora — reativo: muda quando o servidor
   * responde qual loja está ligada. Use este em componentes, e não
   * `ondeAssinarAgora()`, que é a foto do momento.
   */
  onde: OndeAssinar;
}

const ProContext = createContext<ProContextValue>({
  status: null,
  pro: false,
  trancado: false,
  recarregar: async () => undefined,
  convidar: () => undefined,
  preco: PRO_PRECO_FALLBACK,
  onde: null,
});

export const useProStatus = () => useContext(ProContext);

/**
 * "Sou Pro?" para o app inteiro, e o convite quando a resposta é não.
 *
 * O servidor é quem decide de verdade — cada rota trancada responde 402 e
 * o `api.ts` dispara PRO_REQUIRED_EVENT, que abre o mesmo convite. O que
 * este contexto guarda é só para a tela avisar ANTES do clique.
 */
export const ProProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status: auth } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ProStatus | null>(null);
  const [preco, setPreco] = useState(PRO_PRECO_FALLBACK);
  const [onde, setOnde] = useState<OndeAssinar>(() => ondeAssinarAgora());
  const [convite, setConvite] = useState<AreaPro | 'geral' | null>(null);
  /** Motivo vindo do servidor (402), quando o convite nasce de uma recusa. */
  const [motivo, setMotivo] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (auth !== 'authed' || !onde) {
      setStatus(null);
      return;
    }
    try {
      setStatus(await billingService.status());
    } catch {
      /* sem resposta, a tela não tranca nada; o servidor tranca se precisar */
    }
  }, [auth, onde]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  // Público e sem sessão, na subida: é o servidor quem diz se a web está
  // à venda (e por quanto). Sem resposta, fica como estava — desligada.
  useEffect(() => {
    billingService
      .plano()
      .then((p) => {
        definirWebAtiva(p.lojas.mercadoPago);
        setPreco(formatarPreco(p.precoBrl));
        setOnde(ondeAssinarAgora());
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const abrir = (e: Event) => {
      const detail = (e as CustomEvent<unknown>).detail;
      setMotivo(typeof detail === 'string' && detail ? detail : null);
      setConvite('geral');
    };
    window.addEventListener(PRO_REQUIRED_EVENT, abrir);
    return () => window.removeEventListener(PRO_REQUIRED_EVENT, abrir);
  }, []);

  const pro = status?.pro === true;
  const proExiste = onde !== null;
  // Enquanto o status não chegou, NÃO tranca: um aviso de "isto é do Pro"
  // piscando para quem é Pro seria pior do que um clique que o servidor
  // responde com o convite.
  const trancado = proExiste && status !== null && !pro;

  const value = useMemo<ProContextValue>(
    () => ({
      status,
      pro,
      trancado,
      recarregar,
      preco,
      onde,
      convidar: (a) => {
        setMotivo(null);
        setConvite(a ?? 'geral');
      },
    }),
    [status, pro, trancado, recarregar, preco, onde],
  );

  const area = convite && convite !== 'geral' ? AREAS_PRO[convite] : null;

  return (
    <ProContext.Provider value={value}>
      {children}
      <Modal isOpen={convite !== null} onClose={() => setConvite(null)} title="Isso faz parte do Pro" size="sm">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Mascot state="happy" size="md" animate />
          </div>
          <p className="text-text-secondary">
            {area ? (
              <>
                <strong className="text-text-primary">{area.oQue[0].toUpperCase() + area.oQue.slice(1)}</strong>{' '}
                é do plano Pro. O que você já tem continua aqui, como sempre.
              </>
            ) : motivo ? (
              <>{motivo}</>
            ) : (
              <>Esta ação é do plano Pro. O que você já tem continua aqui, como sempre.</>
            )}
          </p>
          <ul className="mt-4 text-left text-sm text-text-secondary space-y-1.5">
            <li className="flex gap-2"><Sparkles size={16} className="mt-0.5 shrink-0 text-primary-vibrant" />Projetos ilimitados (a conta gratuita tem {FREE_PROJECT_LIMIT} em andamento)</li>
            <li className="flex gap-2"><Sparkles size={16} className="mt-0.5 shrink-0 text-primary-vibrant" />Equipes, ideias, agenda e foco</li>
            <li className="flex gap-2"><Sparkles size={16} className="mt-0.5 shrink-0 text-primary-vibrant" />{PRO_WEEKLY_LIMIT} usos do assistente por semana</li>
          </ul>
          <Button
            size="lg"
            className="mt-5 w-full rounded-xl"
            onClick={() => {
              setConvite(null);
              navigate('/apoiar');
            }}
          >
            Conhecer o Pro
          </Button>
          <button
            type="button"
            onClick={() => setConvite(null)}
            className="mt-3 text-sm text-text-soft hover:text-text-primary"
          >
            Agora não
          </button>
        </div>
      </Modal>
    </ProContext.Provider>
  );
};
