import React from 'react';

/**
 * Divisão entre regiões — uma linha que começa e se dissolve.
 *
 * O filete de ponta a ponta que existia antes foi tirado por poluir as
 * junções: somado às barras entre os números e às linhas entre as tarefas, a
 * tela virava uma grade de traços. Só que o espaço sozinho também não bastava:
 * com a página reduzida no navegador, as regiões encostam umas nas outras e a
 * fronteira some.
 *
 * Esta é a solução intermediária. A linha nasce cheia na margem esquerda, onde
 * o olho começa a ler e onde de fato precisa saber que outra região começou, e
 * se apaga antes de cruzar a tela. Marca sem cercar: perto do conteúdo é
 * fronteira, longe dele é fundo.
 *
 * `aria-hidden` porque a divisão já é dita pelo <h2> de cada <Section> — para
 * quem usa leitor de tela, um separador aqui seria ruído repetido.
 */
export const SoftDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`h-px bg-gradient-to-r from-border via-border/50 to-transparent ${className}`}
  />
);
