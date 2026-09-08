import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  // Para conteúdo em duas colunas (comando de um lado, rascunho do outro).
  // Abaixo de lg: o layout já empilha sozinho, então isto só amplia no desktop.
  xl: 'max-w-4xl',
};

/**
 * Pilha de modais abertos.
 *
 * Modal sobre modal existe no app (um diálogo de confirmação por cima de um
 * formulário). Sem a pilha, o Escape fechava OS DOIS: cada instância tinha seu
 * próprio ouvinte no window e todos disparavam no mesmo evento. Só o do topo
 * responde.
 */
let pilha: symbol[] = [];

const FOCAVEIS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal.
 *
 * Semântica de diálogo de verdade: `role="dialog"` + `aria-modal` + nome
 * acessível vindo do próprio título (`aria-labelledby`). Sem isso, o leitor de
 * tela anuncia "grupo" e continua lendo a página inteira atrás do véu, como se
 * nada tivesse aberto.
 *
 * O foco entra no painel ao abrir, fica preso nele enquanto está aberto (Tab e
 * Shift+Tab circulam) e VOLTA para o elemento que abriu o modal ao fechar —
 * senão quem navega por teclado é jogado para o começo do documento.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  useBodyScrollLock(isOpen);

  const painelRef = React.useRef<HTMLDivElement>(null);
  const tituloId = React.useId();
  // Quem tinha o foco antes de abrir — é para lá que ele volta no fim.
  const focoAnteriorRef = React.useRef<HTMLElement | null>(null);
  const meuLugarRef = React.useRef<symbol>(Symbol('modal'));

  /**
   * `onClose` vive numa ref, e o efeito de foco abaixo depende SÓ de `isOpen`.
   *
   * Com `onClose` na lista de dependências, o efeito era desmontado e remontado
   * sempre que o pai entregasse uma função nova — e quase todo chamador passa
   * uma arrow inline (`onClose={() => setX(false)}`), que é nova a cada render
   * do pai. Pior: o CreateTaskModal passa um `handleClose` declarado no corpo
   * do componente, então ele nascia diferente A CADA TECLA digitada no título.
   *
   * O estrago não era desperdício de render, era o foco: a LIMPEZA do efeito
   * devolve o foco a `focoAnteriorRef` (o botão que abriu o modal), e o efeito
   * novo o manda para o painel. Resultado: digitava-se uma letra, o foco saía
   * do campo, e não dava para digitar a segunda. Um formulário inteiro que
   * aceitava exatamente um caractere.
   *
   * De quebra, o efeito novo gravava `focoAnteriorRef = document.activeElement`
   * — que a essa altura já era o próprio painel —, então o "volta o foco para
   * quem abriu" também tinha sido perdido no caminho.
   *
   * A ref é atualizada em todo render (efeito sem lista de dependências), então
   * o Escape e o clique fora continuam chamando a versão mais recente.
   */
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  });

  React.useEffect(() => {
    if (!isOpen) return;
    const meuLugar = meuLugarRef.current;
    pilha.push(meuLugar);
    focoAnteriorRef.current = document.activeElement as HTMLElement | null;

    // Foco inicial no painel, e não no primeiro campo: o leitor de tela começa
    // pelo título do diálogo, que é o que diz onde a pessoa acabou de entrar.
    const t = window.setTimeout(() => painelRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      // Só o modal do topo responde.
      if (pilha[pilha.length - 1] !== meuLugar) return;

      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const painel = painelRef.current;
      if (!painel) return;
      const focaveis = Array.from(painel.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        el => el.offsetParent !== null || el === document.activeElement,
      );
      if (focaveis.length === 0) {
        // Nada focável dentro: o Tab não pode escapar para a página atrás.
        e.preventDefault();
        painel.focus();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;
      if (e.shiftKey && (ativo === primeiro || ativo === painel)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && ativo === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      pilha = pilha.filter(p => p !== meuLugar);
      focoAnteriorRef.current?.focus?.();
    };
    // SÓ `isOpen`: ver a nota sobre `onCloseRef` acima. Acrescentar `onClose`
    // aqui reintroduz o bug de "só dá para digitar uma letra".
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          {/* Sem backdrop-blur: desfocar a viewport inteira a cada frame do fade
              derruba FPS em GPU integrada. O véu escuro sozinho dá o mesmo foco. */}
          {/* aria-hidden: o véu é decoração. Fechar pelo clique fora continua
              valendo para quem usa mouse; para o teclado, o caminho é o Escape
              e o botão de fechar — por isso ele não precisa ser um controle. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-scrim/75 z-[60]"
          />

          {/* O wrapper de tela cheia só faz fade (barato); o scale/subida fica
              no painel pequeno — transformar uma camada do tamanho da viewport
              a cada frame era a causa do travamento ao abrir. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* max-h no PAINEL + corpo rolável, em vez de altura fixa calculada
                no corpo: some o número mágico (o antigo -200px chutava a altura
                do cabeçalho) e o modal nunca ultrapassa a tela. dvh em vez de
                vh porque no celular a 100vh inclui a área da barra de
                endereço. */}
            <motion.div
              ref={painelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={tituloId}
              tabIndex={-1}
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 8, transition: { duration: 0.15, ease: 'easeIn' } }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className={`bg-surface rounded-2xl shadow-lg ${sizeClasses[size]} w-full max-h-[90dvh] flex flex-col focus:outline-none`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between p-6 border-b border-border">
                <h2 id={tituloId} className="text-xl font-bold text-text-primary">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  // Nome acessível: o botão só tem um ícone, e ícone não é texto.
                  aria-label="Fechar"
                  className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
                >
                  <X size={20} className="text-text-secondary" aria-hidden="true" />
                </button>
              </div>

              {/* Content — ocupa o que sobrar do painel e rola sozinho. */}
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {children}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
