import React from 'react';

export type MascotState = 'happy' | 'strong' | 'confused' | 'sad' | 'error' | 'celebrate' | 'investigate';

interface MascotProps {
  state?: MascotState;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
}

const sizeClasses = {
  xs: 'w-16 h-16',
  sm: 'w-24 h-24',
  md: 'w-32 h-32',
  lg: 'w-48 h-48',
  xl: 'w-64 h-64',
};

/**
 * Exportado para o pré-carregamento poder usar a MESMA fonte.
 *
 * Cada estado é um arquivo de ~100 KB. Trocar de estado sem o arquivo em cache
 * mostra o PNG decodificando de cima para baixo — a "imagem cortada" que
 * aparecia ao iniciar uma sessão de foco. Ver `precarregarMascotes`.
 */
export const mascotImages: Record<MascotState, string> = {
  happy: '/bobjoia.png',
  strong: '/bobforte.png',
  confused: '/bobduvida.png',
  sad: '/bobtriste.png',
  error: '/boberror404.png',
  celebrate: '/bobparabens.png',
  investigate: '/bobinvestigador.png',
};

/**
 * Flutuação via CSS (animate-bob): roda no compositor da GPU, sem custo de JS
 * por frame — vários Bobs na tela não pesam. Reduced motion é respeitado pelo
 * bloco global em index.css.
 */
/**
 * Baixa os estados que a tela vai precisar ANTES de precisar deles.
 *
 * Só os do caminho provável, nunca todos: são doze arquivos, e puxar 1,2 MB
 * para exibir um seria trocar um problema por outro maior.
 *
 * O navegador guarda em cache; chamar de novo não baixa outra vez.
 */
export function precarregarMascotes(estados: MascotState[]): void {
  for (const estado of estados) {
    const img = new Image();
    img.src = mascotImages[estado];
  }
}

export const Mascot: React.FC<MascotProps> = ({
  state = 'happy',
  size = 'md',
  animate = true,
}) => {
  const imageSrc = mascotImages[state];

  return (
    <div
      className={`flex items-center justify-center ${sizeClasses[size]} ${animate ? 'animate-bob' : ''}`}
    >
      <img
        src={imageSrc}
        alt={`Mascot ${state}`}
        /*
         * `key` no src: força o React a criar um <img> NOVO ao trocar de
         * estado, em vez de reaproveitar o mesmo elemento. Reaproveitando, o
         * navegador mantinha o quadro antigo e ia substituindo linha a linha
         * conforme decodificava — o efeito de imagem cortada.
         *
         * `decoding="async"` deixa a decodificação fora da thread principal,
         * então ela não engasga a animação que roda junto.
         */
        key={imageSrc}
        decoding="async"
        className="w-full h-full object-contain drop-shadow-lg"
      />
    </div>
  );
};
