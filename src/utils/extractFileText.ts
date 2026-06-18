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
import * as pdfjsLib from 'pdfjs-dist';
// O Vite resolve este import para uma URL do worker do PDF.js.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const TEXT_EXTENSIONS = ['.txt', '.md'];

export type SupportedKind = 'pdf' | 'docx' | 'text';

export class UnsupportedFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFileError';
  }
}

function kindOf(fileName: string): SupportedKind | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  if (TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'text';
  return null;
}

async function extractPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const parts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    parts.push(pageText);
  }

  return parts.join('\n\n').trim();
}

async function extractDocx(file: File): Promise<string> {
  // mammoth é importado dinamicamente para não pesar no bundle inicial.
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * Lê um arquivo e devolve o texto extraído.
 * Lança UnsupportedFileError para formatos não suportados (ex.: imagem, .doc antigo).
 */
export async function extractFileText(file: File): Promise<string> {
  const kind = kindOf(file.name);

  if (kind === null) {
    throw new UnsupportedFileError(
      'Formato não suportado. Use apenas PDF, Word (.docx), .txt ou .md.',
    );
  }

  if (kind === 'pdf') return extractPdf(file);
  if (kind === 'docx') return extractDocx(file);
  return file.text();
}
