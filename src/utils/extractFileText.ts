/**
 * Extração de texto de arquivos, 100% no navegador (sem back-end, sem custo).
 *
 * Suporta apenas:
 *   - PDF  → via pdfjs-dist (PDF.js da Mozilla)
 *   - DOCX → via mammoth
 *   - texto (.txt, .md) → leitura direta
 *
 * Não suporta .doc antigo (Word 97-2003, binário) — só o .docx moderno.
 */
// Antes de qualquer coisa: o PDF.js v6 usa Promise.withResolvers, que só existe
// no Safari 17.4+. Sem isto a importação de PDF falha com "undefined is not a
// function" — no Safari sim, no Chrome/Opera não.
import './jsPolyfills';
import * as pdfjsLib from 'pdfjs-dist';
// Worker próprio (pdfWorkerEntry) em vez do arquivo do pacote: ele aplica os
// polyfills dentro do escopo do worker, que não enxerga os da página.
import pdfWorkerUrl from './pdfWorkerEntry?worker&url';
import {
  MAX_CARACTERES_EXTRAIDOS,
  MAX_MS_EXTRACAO,
  MAX_PAGINAS_PDF,
  recusaDeDocumento,
  truncarTexto,
} from './limitesDeArquivo';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const TEXT_EXTENSIONS = ['.txt', '.md'];

export type SupportedKind = 'pdf' | 'docx' | 'text';

export class UnsupportedFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFileError';
  }
}

/** Arquivo recusado pelo orçamento (tamanho, tempo). Mensagem já pronta. */
export class ArquivoAcimaDoLimiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArquivoAcimaDoLimiteError';
  }
}

/** Resultado da extração: o texto e o que foi preciso cortar para chegar nele. */
export interface TextoExtraido {
  texto: string;
  /** Ficou texto de fora (documento grande demais ou muitas páginas). */
  truncado: boolean;
  /** Páginas efetivamente lidas / total do PDF, quando for um PDF. */
  paginas?: { lidas: number; total: number };
}

function kindOf(fileName: string): SupportedKind | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  if (TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'text';
  return null;
}

async function extractPdf(file: File, cancelado: () => boolean): Promise<TextoExtraido> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  let pdf: Awaited<typeof loadingTask.promise> | null = null;
  try {
    pdf = await loadingTask.promise;
    const parts: string[] = [];
    let caracteres = 0;
    // Teto de páginas: o custo de um PDF é o número de páginas, não o tamanho
    // do arquivo — 20 MB podem ser 5 páginas de imagem ou 8 000 de texto.
    const total = pdf.numPages;
    const limite = Math.min(total, MAX_PAGINAS_PDF);
    let lidas = 0;

    for (let pageNum = 1; pageNum <= limite; pageNum++) {
      // Prazo estourado ou importação nova: para de trabalhar de verdade, em
      // vez de deixar o laço rodando atrás de um Promise.race já resolvido.
      if (cancelado()) break;
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      // A página é liberada assim que o texto sai dela: sem isto o PDF inteiro
      // fica retido em memória até o documento ser destruído.
      page.cleanup();
      parts.push(pageText);
      lidas = pageNum;
      caracteres += pageText.length;
      if (caracteres > MAX_CARACTERES_EXTRAIDOS) break;
    }

    const { texto, truncado } = truncarTexto(parts.join('\n\n').trim());
    return { texto, truncado: truncado || lidas < total, paginas: { lidas, total } };
  } finally {
    // Sempre: um documento (e seu worker) que não é destruído fica segurando
    // memória pelo resto da vida da aba, mesmo quando a extração falhou.
    await pdf?.cleanup().catch(() => undefined);
    // destroy() no loadingTask encerra também o worker do PDF.js.
    await loadingTask.destroy().catch(() => undefined);
  }
}

async function extractDocx(file: File): Promise<TextoExtraido> {
  // mammoth é importado dinamicamente para não pesar no bundle inicial.
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  // DOCX é um ZIP: o texto de saída pode ser muitas vezes maior que o arquivo
  // em disco. O teto de bytes da entrada não cobre isso — o de caracteres sim.
  const result = await mammoth.extractRawText({ arrayBuffer });
  const { texto, truncado } = truncarTexto(result.value.trim());
  return { texto, truncado };
}

/**
 * Lê um arquivo e devolve o texto extraído, dentro do orçamento de
 * limitesDeArquivo (bytes, páginas, caracteres e tempo).
 *
 * Lança UnsupportedFileError para formatos não suportados (ex.: imagem, .doc
 * antigo) e ArquivoAcimaDoLimiteError quando o arquivo não cabe no orçamento.
 *
 * `sinal` permite a quem chamou desistir (uma importação nova, a saída da
 * tela). O prazo interno usa o mesmo caminho: o laço do PDF consulta o
 * cancelamento a cada página, porque um Promise.race sozinho devolveria o
 * controle sem parar o trabalho caro que continua rodando atrás.
 */
export async function extractFileText(
  file: File,
  sinal?: AbortSignal,
): Promise<TextoExtraido> {
  const kind = kindOf(file.name);

  if (kind === null) {
    throw new UnsupportedFileError(
      'Formato não suportado. Use apenas PDF, Word (.docx), .txt ou .md.',
    );
  }

  const recusa = recusaDeDocumento(file);
  if (recusa) throw new ArquivoAcimaDoLimiteError(recusa);

  const limite = Date.now() + MAX_MS_EXTRACAO;
  const cancelado = () => sinal?.aborted === true || Date.now() > limite;

  if (kind === 'pdf') return extractPdf(file, cancelado);
  if (kind === 'docx') return extractDocx(file);
  const { texto, truncado } = truncarTexto((await file.text()).trim());
  return { texto, truncado };
}
