import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  aplicarSePertence,
  carregarSePertence,
  type Identidade,
} from '@/utils/identidadeDeSessao';

/**
 * O contrato que todo provedor de dados de conta usa para não misturar sessões
 * (FE-01).
 *
 * `identidade` entra na lista de dependências do efeito de carga: ela muda em
 * login, logout, troca de conta e sessão nova na mesma conta — todas as
 * travessias que a antiga dependência `isGuest` (um booleano) não enxergava.
 *
 * `carregar` e `marcar` fazem a outra metade: descartam o que volta depois que
 * a identidade mudou. Cancelar o transporte não bastaria — um callback que já
 * resolveu continua correndo, e é ele que reescrevia a tela com dados da conta
 * anterior.
 */
export function useSessao() {
  const { identidade, identidadeAtual } = useAuth();

  /** Uma carga inteira: dados, erro e fim do "carregando" valem só se a
   *  identidade continuar a mesma na volta. */
  const carregar = useCallback(
    <T>(opts: {
      buscar: () => Promise<T>;
      aoReceber: (dados: T) => void;
      aoFalhar?: (erro: Error) => void;
      aoTerminar?: () => void;
    }) =>
      carregarSePertence({
        identidade: identidadeAtual(),
        atual: identidadeAtual,
        ...opts,
      }),
    [identidadeAtual],
  );

  /**
   * Carimba a identidade AGORA e devolve o aplicador para usar depois do
   * `await`: resposta de mutação, desfazimento otimista, remoção da lista.
   */
  const marcar = useCallback(() => {
    const marca: Identidade = identidadeAtual();
    return (efeito: () => void) => aplicarSePertence(marca, identidadeAtual, efeito);
  }, [identidadeAtual]);

  return { identidade, identidadeAtual, carregar, marcar };
}
