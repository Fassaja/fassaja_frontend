import React from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { transicao } from '@/components/motion/tokens';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAlturaDoTeclado } from '@/hooks/useAlturaDoTeclado';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * `folha`: no celular, o painel sobe de baixo, ocupa a largura e fica colado
   * ao teclado (ver useAlturaDoTeclado) — onde o polegar e o campo de texto
   * estão. Do `sm` para cima continua sendo o modal centralizado.
   */
  variante?: 'centro' | 'folha';
  /** Rodapé fixo (botões), fora da área que rola. */
  rodape?: React.ReactNode;
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
  variante = 'centro',
  rodape,
}) => {
  useBodyScrollLock(isOpen);
  const folha = variante === 'folha';
  const celular = useMediaQuery('(max-width: 639px)');
  const teclado = useAlturaDoTeclado(isOpen && folha && celular);

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
    // Exceção: se um campo de dentro já pegou o foco sozinho (`autoFocus`, como
    // o título da nova tarefa), ele fica — tirar o foco dali fazia o que a
    // pessoa já começou a digitar ir para lugar nenhum.
    const t = window.setTimeout(() => {
      const painel = painelRef.current;
      if (painel && !painel.contains(document.activeElement)) painel.focus();
    }, 0);

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
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: transicao.saida }}
            transition={transicao.media}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-scrim/75 z-[60]"
          />

          {/* O wrapper de tela cheia só faz fade (barato); o scale/subida fica
              no painel pequeno — transformar uma camada do tamanho da viewport
              a cada frame era a causa do travamento ao abrir. */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: transicao.saida }}
            transition={transicao.media}
            className={`fixed inset-0 z-[70] flex justify-center ${
              folha ? 'items-end p-0 sm:items-center sm:p-4' : 'items-center p-4'
            }`}
            // Com o teclado aberto, a folha sobe junto e fica colada nele.
            style={folha && teclado ? { paddingBottom: teclado } : undefined}
            onClick={onClose}
          >
            {/* max-h no PAINEL + corpo rolável, em vez de altura fixa calculada
                no corpo: some o número mágico (o antigo -200px chutava a altura
                do cabeçalho) e o modal nunca ultrapassa a tela. dvh em vez de
                vh porque no celular a 100vh inclui a área da barra de
                endereço. */}
            <m.div
              ref={painelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={tituloId}
              tabIndex={-1}
              initial={folha && celular ? { y: 48 } : { scale: 0.96, y: 12 }}
              animate={folha && celular ? { y: 0 } : { scale: 1, y: 0 }}
              exit={
                folha && celular
                  ? { y: 48, transition: transicao.saida }
                  : { scale: 0.97, y: 8, transition: transicao.saida }
              }
              transition={transicao.media}
              className={`bg-surface shadow-lg ${sizeClasses[size]} w-full flex flex-col focus:outline-none ${
                folha
                  ? 'rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[90dvh] pb-[env(safe-area-inset-bottom)] sm:pb-0'
                  : 'rounded-2xl max-h-[90dvh]'
              }`}
              onClick={e => e.stopPropagation()}
            >
              {/* Alça da folha: diz "isto é um painel que subiu", como nos apps. */}
              {folha && (
                <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" />
              )}
              {/* Header */}
              <div
                className={`flex shrink-0 items-center justify-between border-b border-border ${
                  folha ? 'px-5 py-3 sm:p-6' : 'p-6'
                }`}
              >
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
              <div className={`min-h-0 flex-1 overflow-y-auto ${folha ? 'p-5 sm:p-6' : 'p-6'}`}>
                {children}
              </div>
              {rodape && (
                <div className={`shrink-0 border-t border-border ${folha ? 'px-5 py-3 sm:px-6' : 'px-6 py-3'}`}>
                  {rodape}
                </div>
              )}
            </m.div>
          </m.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
