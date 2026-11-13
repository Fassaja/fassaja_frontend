import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const CHAVE_RECARGA = 'fassaja_recarga_por_chunk';

/**
 * Página carregada só quando é aberta.
 *
 * Antes, as vinte páginas vinham no mesmo arquivo: quem abria o Login baixava
 * também Relatórios, Assistente, Equipe e a biblioteca de gráficos. Agora cada
 * uma é um arquivo próprio, pedido na primeira visita.
 *
 * Dois cuidados que carregamento sob demanda exige:
 *
 * 1. DEPLOY NO MEIO DA SESSÃO. Os arquivos têm hash no nome; depois de um
 *    deploy, a aba que já estava aberta pede um nome que não existe mais e o
 *    import falha. Recarregar resolve (o index.html novo aponta para os nomes
 *    novos) — mas só UMA vez por sessão, senão uma falha de rede de verdade
 *    viraria um laço de recargas.
 *
 * 2. `preload`: quem sabe que a página será aberta em seguida (ver
 *    AppRoutes) pode pedir o arquivo antes do clique.
 */
// `any` nas props é a mesma assinatura do próprio `React.lazy`: o tipo exato
// do componente é inferido de quem chama e preservado no retorno.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Componente = ComponentType<any>;

export type PaginaSobDemanda<T extends Componente> = LazyExoticComponent<T> & {
  preload: () => void;
};

export function paginaSobDemanda<T extends Componente>(
  importar: () => Promise<{ default: T }>,
): PaginaSobDemanda<T> {
  const carregar = () =>
    importar().then(
      modulo => {
        try {
          sessionStorage.removeItem(CHAVE_RECARGA);
        } catch {
          /* armazenamento bloqueado: só perde a trava de recarga */
        }
        return modulo;
      },
      (erro: unknown) => {
        let jaTentou = true;
        try {
          jaTentou = sessionStorage.getItem(CHAVE_RECARGA) === '1';
          if (!jaTentou) sessionStorage.setItem(CHAVE_RECARGA, '1');
        } catch {
          /* sem armazenamento não dá para garantir "uma vez só": não recarrega */
        }
        if (!jaTentou) {
          window.location.reload();
          // A página está indo embora; uma promessa pendente evita piscar a
          // tela de erro nesse meio-tempo.
          return new Promise<never>(() => {});
        }
        throw erro;
      },
    );

  const Pagina = lazy(carregar) as PaginaSobDemanda<T>;
  Pagina.preload = () => {
    // Falha de pré-carga é silenciosa: se a pessoa abrir a página, o `lazy`
    // tenta de novo e trata o erro de verdade.
    importar().catch(() => {});
  };
  return Pagina;
}
