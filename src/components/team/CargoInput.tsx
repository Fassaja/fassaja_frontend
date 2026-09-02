import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { TITLE_SUGGESTIONS } from './teamConstants';

interface Props {
  value: string;
  disabled?: boolean;
  /** Nome de quem recebe o cargo — vai para o rótulo acessível. */
  pessoa: string;
  onSave: (cargo: string) => Promise<void>;
}

/** Mesmo teto do servidor (SetMemberTitleDto). */
const MAX = 40;

/**
 * O cargo de alguém na equipe — texto livre, com sugestões.
 *
 * Era um menu de nove opções fixas, e essa era a coisa mais parecida com
 * software de demonstração na área inteira: o produto decidindo quais cargos
 * uma empresa pode ter. Uma equipe jurídica teria que chamar o advogado de
 * "Analista"; um coordenador de operações simplesmente não existia.
 *
 * O servidor NUNCA proibiu isso — `SetMemberTitleDto` aceita qualquer texto de
 * até 40 caracteres desde sempre. A limitação era só de tela.
 *
 * `datalist` em vez de um combobox próprio: entrega as mesmas sugestões, aceita
 * qualquer texto, e já vem com teclado e leitor de tela funcionando. Um menu
 * caseiro custaria mais código para chegar a um resultado pior.
 */
export const CargoInput: React.FC<Props> = ({ value, disabled, pessoa, onSave }) => {
  const [texto, setTexto] = useState(value);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const gravado = useRef(value);

  // Ressincroniza quando o servidor devolve outro valor (outra pessoa editou,
  // ou a lista recarregou) — mas não por cima do que está sendo digitado.
  useEffect(() => {
    if (document.activeElement?.getAttribute('data-cargo') === pessoa) return;
    setTexto(value);
    gravado.current = value;
  }, [value, pessoa]);

  /**
   * Grava ao sair do campo ou no Enter, e só se mudou.
   *
   * Sem o "só se mudou", passar o Tab por seis linhas dispararia seis escritas
   * idênticas — e seis linhas no histórico da equipe dizendo que nada mudou.
   */
  const salvar = async () => {
    const limpo = texto.trim().slice(0, MAX);
    if (limpo === gravado.current) return;
    setSalvando(true);
    try {
      await onSave(limpo);
      gravado.current = limpo;
      setTexto(limpo);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 1600);
    } catch {
      // O aviso vem de quem chamou; aqui o campo volta ao que o servidor tem,
      // para não deixar na tela um cargo que não foi gravado.
      setTexto(gravado.current);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="relative">
      <input
        data-cargo={pessoa}
        list="cargos-sugeridos"
        value={texto}
        maxLength={MAX}
        disabled={disabled || salvando}
        aria-label={`Cargo de ${pessoa}`}
        placeholder="Sem cargo"
        onChange={e => setTexto(e.target.value)}
        onBlur={salvar}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur();
          // Esc desfaz o que foi digitado, em vez de gravar por engano.
          if (e.key === 'Escape') {
            setTexto(gravado.current);
            e.currentTarget.blur();
          }
        }}
        className="h-8 w-full rounded-lg border border-border bg-surface px-2.5 pr-7 text-sm text-text-primary outline-none transition-colors placeholder:text-text-soft focus:border-primary-vibrant/60 disabled:opacity-60"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
        {salvando && <Loader2 size={13} className="animate-spin text-text-soft" />}
        {!salvando && salvo && <Check size={13} className="text-success" />}
      </span>
    </div>
  );
};

/** As sugestões, uma vez por página — um datalist serve a todos os campos. */
export const CargosSugeridos: React.FC = () => (
  <datalist id="cargos-sugeridos">
    {TITLE_SUGGESTIONS.map(c => (
      <option key={c} value={c} />
    ))}
  </datalist>
);
