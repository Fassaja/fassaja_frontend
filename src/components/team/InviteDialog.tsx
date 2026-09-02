import React, { useEffect, useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
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
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Compartilhe este link. A pessoa abre, pede acesso, e alguém da gestão aprova em
          "Gestão" — nada automático. Quem entra começa como <strong>Membro</strong>.
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
