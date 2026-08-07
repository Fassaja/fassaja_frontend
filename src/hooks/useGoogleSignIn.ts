import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Integração com o Google Identity Services (GIS).
 *
 * O GIS entrega um ID token assinado direto no navegador; quem valida é a
 * nossa API. O front nunca decide quem é a pessoa — só transporta o token.
 *
 * O script é carregado sob demanda, e só na tela de login: são ~60KB de
 * terceiro que não fazem falta em nenhuma outra rota, e carregá-lo em todo
 * lugar entregaria ao Google um sinal de navegação que ele não precisa ter.
 */

const SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/** O login com Google está configurado neste build? */
export const googleEnabled = !!CLIENT_ID;

interface CredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (res: CredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
    auto_select?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  prompt(): void;
  cancel(): void;
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

interface Options {
  /** Recebe o ID token. Deve devolver erro em texto, ou null se deu certo. */
  onToken: (idToken: string) => Promise<string | null>;
  /** Mostrar o One Tap (o prompt automático de quem já está logado no Google). */
  oneTap?: boolean;
}

interface Estado {
  /** Onde o botão do Google deve ser renderizado. */
  ref: React.RefObject<HTMLDivElement>;
  /** Falso quando falta o Client ID ou o script não carregou. */
  disponivel: boolean;
  /** Erro vindo da nossa API depois de o Google devolver o token. */
  erro: string | null;
  /** Verdadeiro entre receber o token e a API responder. */
  entrando: boolean;
}

export function useGoogleSignIn({ onToken, oneTap = false }: Options): Estado {
  const ref = useRef<HTMLDivElement>(null);
  // O botão é desenhado pelo Google, então ele não herda nosso CSS: o tema
  // precisa ser informado. Sem isto, o tema escuro ganha um retângulo branco
  // no meio da tela — que é justamente o que o modo escuro existe para evitar.
  const { resolved } = useTheme();
  const [disponivel, setDisponivel] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  // `onToken` costuma ser recriada a cada render; guardá-la numa ref evita
  // reinicializar o GIS (e piscar o botão) a cada digitação no formulário.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!CLIENT_ID) return;
    let vivo = true;

    carregarScript()
      .then(() => {
        const id = window.google?.accounts?.id;
        if (!vivo || !id || !ref.current) return;

        id.initialize({
          client_id: CLIENT_ID,
          callback: async (res: CredentialResponse) => {
            if (!res.credential) return;
            setErro(null);
            setEntrando(true);
            try {
              const msg = await onTokenRef.current(res.credential);
              if (vivo && msg) setErro(msg);
            } finally {
              if (vivo) setEntrando(false);
            }
          },
          // Clicar fora fecha o One Tap. Sem isto ele insiste, e um prompt de
          // terceiro que não fecha é o tipo de coisa que faz a pessoa sair.
          cancel_on_tap_outside: true,
        });

        // O GIS ANEXA um botão; sem limpar, trocar de tema deixaria dois.
        ref.current.innerHTML = '';
        id.renderButton(ref.current, {
          type: 'standard',
          theme: resolved === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          locale: 'pt-BR',
          width: ref.current.clientWidth || 320,
        });

        if (oneTap) id.prompt();
        setDisponivel(true);
      })
      .catch(() => {
        // Sem botão: a tela continua funcionando com e-mail e senha.
        if (vivo) setDisponivel(false);
      });

    return () => {
      vivo = false;
      // Fecha o One Tap ao sair da tela; senão ele sobrevive à navegação e
      // aparece flutuando sobre uma página que não tem nada a ver com login.
      window.google?.accounts?.id?.cancel();
    };
    // `resolved` entra aqui para o botão ser redesenhado ao trocar de tema.
  }, [oneTap, resolved]);

  return { ref, disponivel, erro, entrando };
}
