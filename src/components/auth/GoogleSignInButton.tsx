import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useGoogleSignIn, googleEnabled } from '@/hooks/useGoogleSignIn';

/**
 * Botão "Continuar com o Google", renderizado pelo próprio Google.
 *
 * O botão é desenhado pelo GIS dentro de um container nosso — as regras da
 * marca do Google não permitem recriá-lo à mão, e um botão próprio quebraria
 * a expectativa visual de quem já reconhece esse controle.
 *
 * Some sozinho quando o login com Google não está configurado ou quando o
 * script não carrega (CSP, bloqueador). A tela segue funcionando com e-mail e
 * senha; nada nela depende deste componente.
 */
export const GoogleSignInButton: React.FC<{
  /** Faz o login na API. Devolve mensagem de erro, ou null se deu certo. */
  onToken: (idToken: string) => Promise<string | null>;
  /** Mostrar o One Tap de quem já tem sessão no Google. Só na tela de login. */
  oneTap?: boolean;
}> = ({ onToken, oneTap }) => {
  const { ref, disponivel, erro, entrando } = useGoogleSignIn({ onToken, oneTap });

  // Sem Client ID neste build não há nem o que tentar renderizar.
  if (!googleEnabled) return null;

  return (
    <div className="space-y-2">
      {/* O container fica montado desde o início: o GIS precisa de um nó real
          para desenhar dentro. Enquanto não carrega, ocupa altura zero. */}
      <div className="flex justify-center" aria-busy={entrando}>
        <div ref={ref} />
      </div>

      {entrando && (
        <p className="flex items-center justify-center gap-2 text-xs text-text-secondary">
          <Loader2 size={13} className="animate-spin" />
          Entrando com o Google…
        </p>
      )}

      {erro && (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-xs text-danger"
        >
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          {erro}
        </p>
      )}

      {/* Script bloqueado (CSP ou extensão): avisa em vez de deixar um vazio
          inexplicável onde a pessoa esperava o botão. */}
      {!disponivel && !entrando && (
        <p className="text-center text-xs text-text-soft">
          O login com Google não está disponível neste navegador.
        </p>
      )}
    </div>
  );
};
