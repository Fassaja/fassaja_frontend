import { useEffect, useRef, useState } from 'react';
import { API_URL } from '@/services/api';

/**
 * Integração com o Google Identity Services (GIS).
 *
 * O GIS entrega um ID token assinado; quem valida é a nossa API. O front nunca
 * decide quem é a pessoa — só encaminha.
 *
 * MODO REDIRECT, não popup. O padrão do GIS é abrir um popup e devolver o token
 * para a janela que o abriu, via postMessage. Isso só funciona onde existe
 * janela filha: no desktop. No celular o clique abre uma aba nova — ou, com o
 * app instalado como PWA, o navegador do sistema — e o vínculo com a página
 * original se perde. O Google autenticava, tentava responder para uma janela
 * que não existia mais, e a pessoa ficava olhando para uma tela branca sem
 * volta. No modo redirect não há janela para reencontrar: o Google faz um POST
 * de navegação para /auth/google/callback e a nossa API devolve a sessão.
 *
 * A consequência é que este hook não recebe mais token nenhum. Ele só desenha o
 * botão; quem conclui o login é o backend, e o app descobre isso ao voltar.
 *
 * O script é carregado sob demanda, e só na tela de login: são ~60KB de
 * terceiro que não fazem falta em nenhuma outra rota, e carregá-lo em todo
 * lugar entregaria ao Google um sinal de navegação que ele não precisa ter.
 *
 * Aqui existe SÓ o botão. O One Tap (aquele card que o Google abre sozinho no
 * canto superior direito) foi removido: ele aparecia sobrepondo a tela e
 * oferecendo exatamente a mesma ação do botão que já está logo abaixo, sem
 * escolha de quem chegou. Um prompt de terceiro que se impõe na primeira tela
 * do app custa mais em confiança do que economiza em cliques.
 */

const SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/**
 * Para onde o Google faz o POST com o token.
 *
 * Precisa ser absoluta e bater EXATAMENTE com um "URI de redirecionamento
 * autorizado" cadastrado no Google Cloud, senão o Google recusa antes de
 * mostrar qualquer tela. `new URL` resolve os dois formatos que a base da API
 * assume: '/api' (produção, atrás do proxy da Vercel) e
 * 'http://localhost:3333/api' (desenvolvimento).
 */
export const googleLoginUri = new URL(
  `${API_URL.replace(/\/$/, '')}/auth/google/callback`,
  window.location.origin,
).toString();

/** O login com Google está configurado neste build? */
export const googleEnabled = !!CLIENT_ID;

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    ux_mode: 'popup' | 'redirect';
    login_uri: string;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

/** Carrega o script uma vez só, mesmo com várias montagens. */
let carregando: Promise<void> | null = null;
function carregarScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (carregando) return carregando;
  carregando = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      // Bloqueio por CSP ou por extensão de privacidade cai aqui. Zerar a
      // promessa permite tentar de novo numa próxima montagem.
      carregando = null;
      reject(new Error('Não foi possível carregar o login do Google.'));
    };
    document.head.appendChild(el);
  });
  return carregando;
}

interface Estado {
  /** Onde o botão do Google deve ser renderizado. */
  ref: React.RefObject<HTMLDivElement>;
  /** Falso quando falta o Client ID ou o script não carregou. */
  disponivel: boolean;
}

export function useGoogleSignIn(): Estado {
  const ref = useRef<HTMLDivElement>(null);
  const [disponivel, setDisponivel] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let vivo = true;

    carregarScript()
      .then(() => {
        const id = window.google?.accounts?.id;
        if (!vivo || !id || !ref.current) return;

        id.initialize({
          client_id: CLIENT_ID,
          ux_mode: 'redirect',
          login_uri: googleLoginUri,
        });

        // O GIS ANEXA um botão; sem limpar, uma remontagem deixaria dois.
        ref.current.innerHTML = '';
        id.renderButton(ref.current, {
          type: 'standard',
          // Fixo em 'outline' porque este botão só existe na tela de login, e
          // ela é sempre clara (src/utils/lightOnlyRoutes.ts). Foi o tema
          // escuro aqui que motivou a mudança: o botão é desenhado pelo Google
          // e não herda nosso CSS, então ficava com uma borda branca dura sobre
          // o fundo escuro — sem como corrigir de fora.
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          locale: 'pt-BR',
          width: ref.current.clientWidth || 320,
        });

        setDisponivel(true);
      })
      .catch(() => {
        // Sem botão: a tela continua funcionando com e-mail e senha.
        if (vivo) setDisponivel(false);
      });

    return () => {
      vivo = false;
    };
  }, []);

  return { ref, disponivel };
}
