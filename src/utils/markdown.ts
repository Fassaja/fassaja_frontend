/**
 * Markdown → HTML para os textos legais (Termos de Uso, Política de
 * Privacidade), que vivem em docs/legal/*.md e são a fonte de verdade — o
 * mesmo arquivo que se lê no GitHub é o que a página mostra.
 *
 * É um subconjunto de propósito: títulos, parágrafos, negrito, itálico,
 * código, links, listas, tabelas e linha horizontal. É tudo o que os dois
 * documentos usam, e uma biblioteca inteira de Markdown seria mais código
 * baixado por todo mundo para servir duas páginas que quase ninguém abre.
 *
 * O texto é ESCAPADO antes de qualquer transformação. Os arquivos são nossos,
 * mas a regra vale mesmo assim — um `<script>` num .md nunca vira script.
 */

function escapar(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Só http(s), mailto e caminhos do próprio site viram link. */
function hrefSeguro(url: string): string | null {
  if (/^(https?:\/\/|mailto:|\/)/i.test(url)) return url;
  return null;
}

// Marcador que não aparece em texto: guarda os trechos de código enquanto o
// resto da linha é transformado, para `**` dentro de crase ficar literal.
const MARCA = String.fromCharCode(1);

/** Negrito, itálico, código e links dentro de uma linha já escapada. */
export function inline(texto: string): string {
  const codigos: string[] = [];
  let s = texto.replace(/`([^`]+)`/g, (_m, c: string) => {
    codigos.push(`<code>${c}</code>`);
    return `${MARCA}${codigos.length - 1}${MARCA}`;
  });
  s = s.replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g, (_m, rotulo: string, url: string) => {
    const href = hrefSeguro(url);
    if (!href) return rotulo;
    const externo = /^https?:\/\//i.test(href);
    const extra = externo ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${extra}>${rotulo}</a>`;
  });
  s = s.replace(/\*\*([^*]+(?:\*[^*]+\*[^*]*)*)\*\*/g, (_m, c: string) => `<strong>${c}</strong>`);
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return s.replace(new RegExp(`${MARCA}(\\d+)${MARCA}`, 'g'), (_m, i: string) => codigos[Number(i)]);
}

function tabela(linhas: string[]): string {
  const celulas = (l: string) =>
    l
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => inline(c.trim()));
  const [cab, , ...corpo] = linhas;
  const th = celulas(cab).map((c) => `<th>${c}</th>`).join('');
  const trs = corpo
    .map((l) => `<tr>${celulas(l).map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

const ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const TITULO = /^(#{1,3})\s+(.*)$/;
const REGUA = /^---+$/;

export function markdownParaHtml(md: string): string {
  const linhas = escapar(md).split('\n');
  const saida: string[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (linha.trim() === '') {
      i++;
      continue;
    }
    if (REGUA.test(linha.trim())) {
      saida.push('<hr>');
      i++;
      continue;
    }
    const titulo = TITULO.exec(linha);
    if (titulo) {
      const n = titulo[1].length;
      saida.push(`<h${n}>${inline(titulo[2])}</h${n}>`);
      i++;
      continue;
    }
    if (linha.trim().startsWith('|')) {
      const bloco: string[] = [];
      while (i < linhas.length && linhas[i].trim().startsWith('|')) bloco.push(linhas[i++]);
      if (bloco.length >= 2) saida.push(tabela(bloco));
      continue;
    }
    const item = ITEM.exec(linha);
    if (item) {
      const ordenada = /\d/.test(item[2]);
      const itens: string[] = [];
      while (i < linhas.length) {
        const m = ITEM.exec(linhas[i]);
        if (m) {
          itens.push(m[3]);
          i++;
        } else if (linhas[i].startsWith('  ') && itens.length) {
          // Continuação do item (linha indentada).
          itens[itens.length - 1] += ' ' + linhas[i].trim();
          i++;
        } else break;
      }
      const tag = ordenada ? 'ol' : 'ul';
      saida.push(`<${tag}>${itens.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }
    // Parágrafo: junta linhas até a próxima em branco ou bloco.
    const par: string[] = [];
    while (
      i < linhas.length &&
      linhas[i].trim() !== '' &&
      !TITULO.test(linhas[i]) &&
      !linhas[i].trim().startsWith('|') &&
      !REGUA.test(linhas[i].trim()) &&
      !ITEM.test(linhas[i])
    ) {
      par.push(linhas[i++].trim());
    }
    saida.push(`<p>${inline(par.join(' '))}</p>`);
  }
  return saida.join('\n');
}
