import React from 'react';
import { useGoogleSignIn, googleEnabled } from '@/hooks/useGoogleSignIn';

/**
 * Botão "Continuar com o Google", renderizado pelo próprio Google.
 *
 * O botão é desenhado pelo GIS dentro de um container nosso — as regras da
 * marca do Google não permitem recriá-lo à mão, e um botão próprio quebraria
 * a expectativa visual de quem já reconhece esse controle.
 *
 * Clicar aqui LEVA A PESSOA EMBORA da página: o fluxo é o modo redirect (ver
 * useGoogleSignIn), então quem termina o login é a API, e o app só descobre o
 * resultado quando o navegador volta. Por isso este componente não tem estado
 * de "entrando" nem mostra erro: não existe um "depois" dentro desta montagem.
 * Quem informa o que deu errado é a tela de login ao ser reaberta, lendo o
 * ?google= que a API devolve.
 *
 * Some sozinho quando o login com Google não está configurado ou quando o
 * script não carrega (CSP, bloqueador). A tela segue funcionando com e-mail e
 * senha; nada nela depende deste componente.
 */
export const GoogleSignInButton: React.FC = () => {
  const { ref, disponivel } = useGoogleSignIn();

  // Sem Client ID neste build não há nem o que tentar renderizar.
  if (!googleEnabled) return null;

  return (
    <div className="space-y-2">
      {/* O container fica montado desde o início: o GIS precisa de um nó real
          para desenhar dentro. Enquanto não carrega, ocupa altura zero. */}
      <div className="flex justify-center">
        <div ref={ref} />
      </div>

      {/* Script bloqueado (CSP ou extensão): avisa em vez de deixar um vazio
          inexplicável onde a pessoa esperava o botão. */}
      {!disponivel && (
        <p className="text-center text-xs text-text-soft">
          O login com Google não está disponível neste navegador.
        </p>
      )}
    </div>
  );
};
