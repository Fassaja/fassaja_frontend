import React, { useState } from 'react';
import { Chrome, X } from 'lucide-react';
import { emAbaComBarra } from '@/utils/twa';
import { rodandoInstalado } from '@/utils/modoApp';

const KEY_SESSAO = 'fassaja_abriu_de_app';
const KEY_DISPENSADO = 'fassaja_aviso_barra';

/**
 * "Para tela cheia, defina o Chrome como navegador padrão."
 *
 * Aparece só quando o app da loja abriu como aba personalizada (navegador
 * padrão sem TWA — Brave, Firefox). Não dá para abrir a tela de apps
 * padrão do Android a partir de uma página, então o aviso ensina o caminho.
 * Dispensar guarda em localStorage: quem prefere o Brave não precisa ler
 * isso toda vez.
 */
export const AvisoAbaComBarra: React.FC = () => {
  const [fechado, setFechado] = useState(false);
  let mostrar = false;
  try {
    mostrar =
      !fechado &&
      localStorage.getItem(KEY_DISPENSADO) !== '1' &&
      emAbaComBarra({
        abriuDeApp: sessionStorage.getItem(KEY_SESSAO) === '1',
        standalone: rodandoInstalado(),
      });
  } catch {
    mostrar = false;
  }
  if (!mostrar) return null;

  const fechar = () => {
    setFechado(true);
    try {
      localStorage.setItem(KEY_DISPENSADO, '1');
    } catch {
      /* volta na próxima; inofensivo */
    }
  };

  return (
    <div
      role="status"
      className="mb-5 flex items-start gap-3 rounded-2xl border border-border bg-bg-secondary px-4 py-3 text-sm"
    >
      <Chrome size={18} className="mt-0.5 shrink-0 text-primary-vibrant" />
      <p className="flex-1 text-text-secondary">
        <strong className="text-text-primary">Quer o Fassajá em tela cheia?</strong> O seu
        navegador padrão não suporta isso. Em <em>Configurações → Apps → Apps padrão →
        Navegador</em>, escolha o <strong className="text-text-primary">Chrome</strong> e abra o
        app de novo. Você pode continuar navegando com o seu navegador de sempre.
      </p>
      <button
        type="button"
        onClick={fechar}
        aria-label="Dispensar aviso"
        className="shrink-0 rounded-lg p-1 text-text-soft hover:bg-surface hover:text-text-primary"
      >
        <X size={16} />
      </button>
    </div>
  );
};
