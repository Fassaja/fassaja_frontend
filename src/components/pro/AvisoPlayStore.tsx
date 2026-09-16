import React, { useState } from 'react';
import { Smartphone, X, ExternalLink } from 'lucide-react';
import { ANDROID_PACKAGE, ondeAssinarAgora } from '@/utils/playConfig';
import { deveAvisarDaLoja, dentroDoApp, linkLoja } from '@/utils/twa';

const KEY = 'fassaja_aviso_play';

function dispensado(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * "O Fassajá está na Play Store" — para quem usa o site num Android.
 *
 * É o único lugar em que o app é EMPURRADO; o resto (rodapé da IA, sino,
 * /apoiar) só responde a quem perguntou. Dispensar guarda em localStorage e
 * o aviso não volta: quem disse "não" uma vez não precisa dizer de novo a
 * cada abertura. O motivo de existir: o Pro só se assina pelo app, e quem
 * está no navegador do celular não tem como adivinhar isso.
 */
export const AvisoPlayStore: React.FC = () => {
  const [fechado, setFechado] = useState(false);
  // Com a assinatura pela web ligada, o site vende sozinho e a frase "é por
  // lá que se assina" deixaria de ser verdade. O app continua na loja para
  // quem procurar; só não é empurrado.
  const mostrar =
    !fechado &&
    ondeAssinarAgora() !== 'web' &&
    deveAvisarDaLoja({
      userAgent: navigator.userAgent,
      noApp: dentroDoApp(),
      pacote: ANDROID_PACKAGE,
      dispensado: dispensado(),
    });
  if (!mostrar) return null;

  const fechar = () => {
    setFechado(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* sem armazenamento, volta na próxima abertura — inofensivo */
    }
  };

  return (
    <div
      role="status"
      className="mb-5 flex items-center gap-3 rounded-2xl border border-primary-vibrant/20 bg-primary-light px-4 py-3 text-sm"
    >
      <Smartphone size={18} className="shrink-0 text-primary-vibrant" />
      <p className="flex-1 text-text-primary">
        <strong>O Fassajá está na Play Store.</strong>{' '}
        <span className="text-text-secondary">
          Mesma conta, e é por lá que se assina o Pro.
        </span>
      </p>
      <a
        href={linkLoja(ANDROID_PACKAGE)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1 font-medium text-primary-vibrant hover:text-primary-hover"
      >
        Instalar <ExternalLink size={14} />
      </a>
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
