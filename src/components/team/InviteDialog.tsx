import React, { useEffect, useState } from 'react';
import { Check, Copy, Link2, Mail, Send } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useToast } from '@/contexts/ToastContext';
import { invitesService } from '@/services/invitesService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
}

/**
 * O link de convite.
 *
 * Estava embutido na página da equipe; saiu para cá porque é o mesmo diálogo
 * chamado do cabeçalho e da aba de Gestão, e duplicá-lo era o caminho mais
 * curto para as duas versões divergirem.
 *
 * O link é gerado ao ABRIR, não antes: criar um convite é uma escrita no
 * servidor, e fazê-la ao carregar a página deixaria um convite ativo para toda
 * equipe que alguém apenas visitou.
 */
export const InviteDialog: React.FC<Props> = ({ isOpen, onClose, teamId }) => {
  const toast = useToast();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState('');

  const link = token ? `${window.location.origin}/join/${token}` : '';

  useEffect(() => {
    if (!isOpen) return;
    let vivo = true;
    setCopied(false);
    setToken('');
    setLoading(true);
    invitesService
      .createInvite(teamId)
      .then(r => vivo && setToken(r.token))
      .catch(err => {
        if (vivo) toast.error((err as Error).message || 'Não foi possível gerar o link de convite.');
      })
      .finally(() => vivo && setLoading(false));
    return () => {
      vivo = false;
    };
    // `toast` fora das dependências de propósito: recriado a cada render do
    // provedor, ele faria este efeito gerar um convite novo sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, teamId]);

  /** Revoga o link atual e gera outro — invalida o que já foi compartilhado. */
  const rotacionar = async () => {
    setCopied(false);
    setToken('');
    setLoading(true);
    try {
      await invitesService.revokeInvites(teamId);
      const { token: novo } = await invitesService.createInvite(teamId);
      setToken(novo);
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível gerar um novo link.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Convite por e-mail — o caminho principal.
   *
   * Convidar alguém saía do produto: gerava-se um link e mandava-se por
   * WhatsApp ou e-mail à mão. Aqui o Fassaja manda, dizendo quem convidou e
   * para qual equipe, e quem aceita entra DIRETO: o convite é nominal, e exigir
   * aprovação depois seria quem digitou o endereço se autorizando duas vezes.
   */
  const convidarPorEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const alvo = email.trim();
    if (!alvo) return;
    setEnviando(true);
    try {
      await invitesService.inviteByEmail(teamId, alvo);
      setEnviado(alvo);
      setEmail('');
      setTimeout(() => setEnviado(''), 5000);
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível enviar o convite.');
    } finally {
      setEnviando(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponível */
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convidar para a equipe" size="md">
      <div className="space-y-5">
        <form onSubmit={convidarPorEmail} className="space-y-3">
          <Input
            label="Convidar por e-mail"
            type="email"
            placeholder="pessoa@empresa.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            icon={<Mail size={16} />}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">
              Ela recebe o convite e entra direto ao aceitar — sem passar por aprovação, porque
              você já escolheu o endereço. Começa como <strong>Membro</strong>.
            </p>
            <Button
              type="submit"
              size="sm"
              isLoading={enviando}
              disabled={!email.trim()}
              icon={<Send size={15} />}
              className="shrink-0 rounded-xl"
            >
              Enviar
            </Button>
          </div>
          {enviado && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-success">
              <Check size={15} /> Convite enviado para {enviado}.
            </p>
          )}
        </form>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-wide text-text-soft">ou</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <p className="text-sm text-text-secondary">
          Compartilhe um <strong>link aberto</strong>. Serve para várias pessoas, e por isso quem
          chega precisa pedir acesso e alguém da gestão aprovar em "Gestão".
        </p>
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-bg-secondary px-3 py-2.5">
            <Link2 size={16} className="shrink-0 text-text-secondary" />
            <span className="truncate text-sm text-text-primary">
              {loading ? 'Gerando link...' : link}
            </span>
          </div>
          <Button
            onClick={copiar}
            disabled={!link}
            icon={copied ? <Check size={16} /> : <Copy size={16} />}
            className="shrink-0 rounded-xl"
          >
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-text-secondary">
            O link expira em 7 dias e serve para várias pessoas.
          </p>
          <button
            type="button"
            onClick={rotacionar}
            disabled={loading}
            className="shrink-0 text-xs font-semibold text-primary-vibrant transition-colors hover:text-primary-hover disabled:opacity-60"
          >
            Gerar novo link
          </button>
        </div>
      </div>
    </Modal>
  );
};
