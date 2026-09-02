import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, CheckCircle2, Clock, XCircle, ArrowRight, LogIn } from 'lucide-react';
import { Mascot, MascotState } from '@/components/mascot/Mascot';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/contexts/AuthContext';
import { invitesService } from '@/services/invitesService';
import { InviteState } from '@/types/team';

const JoinPage: React.FC = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { account, isGuest } = useAuth();

  const [state, setState] = useState<InviteState | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await invitesService.getInviteState(token);
      setState(s);
    } catch {
      setState({ valid: false, team: null, alreadyMember: false, myRequestStatus: null });
    } finally {
      setLoading(false);
    }
  }, [token, account?.id]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Aceita um convite NOMINAL: entra na equipe e vai direto para lá.
   *
   * Sem pedido nem aprovação — o convite foi enviado ao endereço desta pessoa
   * por alguém que já podia aprovar. Pedir aprovação depois seria a mesma
   * pessoa se autorizando duas vezes.
   */
  const handleAccept = async () => {
    if (!account) return;
    setRequesting(true);
    setError('');
    try {
      await invitesService.accept(token);
      navigate('/team');
    } catch (err) {
      setError((err as Error).message);
      setRequesting(false);
    }
  };

  const handleRequest = async () => {
    if (!account) return;
    setRequesting(true);
    setError('');
    try {
      await invitesService.requestJoin(token);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRequesting(false);
    }
  };

  // Define o conteúdo (mascote, título, texto, ação) conforme o estado.
  const view = ((): { mascot: MascotState; title: string; text: string; node?: React.ReactNode } => {
    if (!state || !state.valid) {
      return {
        mascot: 'confused',
        title: 'Convite inválido',
        text: 'Este convite não existe mais ou foi desativado.',
        node: (
          <Button onClick={() => navigate('/')} className="rounded-xl">
            Ir para o início
          </Button>
        ),
      };
    }

    const teamName = state.team?.name ?? 'equipe';

    if (state.alreadyMember) {
      return {
        mascot: 'happy',
        title: 'Você já faz parte!',
        text: `Você já é membro de "${teamName}".`,
        node: (
          <Button onClick={() => navigate('/team')} icon={<Users size={18} />} className="rounded-xl">
            Ir para a equipe
          </Button>
        ),
      };
    }

    if (state.myRequestStatus === 'pending') {
      return {
        mascot: 'happy',
        title: 'Pedido enviado!',
        text: `Aguarde o dono de "${teamName}" aprovar a sua entrada.`,
      };
    }

    if (state.myRequestStatus === 'rejected') {
      return {
        mascot: 'sad',
        title: 'Pedido recusado',
        text: `O dono de "${teamName}" recusou o seu último pedido. Você pode tentar de novo.`,
        node: (
          <Button onClick={handleRequest} isLoading={requesting} className="rounded-xl">
            Pedir novamente
          </Button>
        ),
      };
    }

    // --- Convite NOMINAL (enviado por e-mail a um endereço) ---
    if (state.forEmail) {
      if (isGuest) {
        return {
          mascot: 'strong',
          title: `Você foi convidado para "${teamName}"`,
          text: `O convite foi enviado para ${state.forEmail}. Entre com essa conta (ou crie uma) para aceitar.`,
          node: (
            <Button
              onClick={() => navigate(`/login?redirect=/join/${token}`)}
              icon={<LogIn size={18} />}
              className="rounded-xl"
            >
              Entrar para aceitar
            </Button>
          ),
        };
      }
      // Logado com OUTRA conta: o convite é daquele endereço, e repassar o
      // link não pode transformá-lo num convite aberto. Dizer isso aqui evita
      // o 403 seco depois do clique.
      if (!state.forMe) {
        return {
          mascot: 'confused',
          title: 'Este convite é de outra pessoa',
          text: `Ele foi enviado para ${state.forEmail}, e você está em outra conta. Entre com a conta convidada para aceitar.`,
          node: (
            <Button onClick={() => navigate('/')} variant="secondary" className="rounded-xl">
              Ir para o início
            </Button>
          ),
        };
      }
      return {
        mascot: 'strong',
        title: `Você foi convidado para "${teamName}"`,
        text: 'É só aceitar — você entra na equipe agora mesmo.',
        node: (
          <Button
            onClick={handleAccept}
            isLoading={requesting}
            icon={<ArrowRight size={18} />}
            className="rounded-xl"
          >
            Entrar na equipe
          </Button>
        ),
      };
    }

    if (isGuest) {
      return {
        mascot: 'strong',
        title: `Você foi convidado para "${teamName}"`,
        text: 'Entre na sua conta (ou crie uma) para pedir acesso à equipe.',
        node: (
          <Button
            onClick={() => navigate(`/login?redirect=/join/${token}`)}
            icon={<LogIn size={18} />}
            className="rounded-xl"
          >
            Entrar para pedir acesso
          </Button>
        ),
      };
    }

    return {
      mascot: 'strong',
      title: `Você foi convidado para "${teamName}"`,
      text: 'Envie um pedido de entrada. O dono da equipe vai aprovar ou recusar.',
      node: (
        <Button
          onClick={handleRequest}
          isLoading={requesting}
          icon={<ArrowRight size={18} />}
          className="rounded-xl"
        >
          Pedir para entrar
        </Button>
      ),
    };
  })();

  const StatusIcon =
    state?.myRequestStatus === 'pending'
      ? Clock
      : state?.alreadyMember
      ? CheckCircle2
      : state?.myRequestStatus === 'rejected'
      ? XCircle
      : null;

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl border-2 border-border ring-1 ring-primary-vibrant/20 shadow-xl p-8 text-center">
        {loading ? (
          <div className="py-10 text-text-secondary">Carregando convite...</div>
        ) : (
          <>
            <div className="flex justify-center mb-2">
              <Mascot state={view.mascot} size="lg" animate />
            </div>
            <h1 className="text-xl font-bold text-text-primary flex items-center justify-center gap-2">
              {StatusIcon && <StatusIcon size={20} className="text-primary-vibrant" />}
              {view.title}
            </h1>
            <p className="text-text-secondary mt-2 mb-6">{view.text}</p>
            {error && <p className="text-sm text-danger mb-4">{error}</p>}
            {view.node && <div className="flex justify-center">{view.node}</div>}
          </>
        )}
      </div>
    </div>
  );
};

export default JoinPage;
