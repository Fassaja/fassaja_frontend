/**
 * Orçamento de trabalho para arquivos que a pessoa importa (FE-06).
 *
 * A importação roda inteira no navegador: ler o arquivo, abrir o PDF página a
 * página, descompactar o DOCX, decodificar a imagem do avatar. Sem teto, o
 * custo é ditado pelo arquivo — um PDF de milhares de páginas, um DOCX que
 * expande muito mais do que ocupa em disco (a expansão do ZIP), uma imagem de
 * dimensões absurdas — e a aba trava. Não é uma falha de memória do servidor:
 * é a máquina de quem usa o app que para.
 *
 * Os limites ficam aqui, num módulo puro, para serem testáveis e para estarem
 * no MESMO lugar em que a mensagem ao usuário é decidida. Cada um é checado
 * ANTES do trabalho caro sempre que o dado permite (tamanho em bytes), e
 * DURANTE quando só o processamento revela (páginas, caracteres, tempo).
 */

/** Teto do arquivo de entrada (PDF/DOCX/TXT/MD). */
export const MAX_BYTES_DOCUMENTO = 15 * 1024 * 1024;

/** Páginas de PDF percorridas. Além disso, o texto é truncado com aviso. */
export const MAX_PAGINAS_PDF = 300;

/**
 * Teto do texto extraído. Um pouco acima do limite de envio da IA
 * (MAX_DOC_CHARS, 50 000) de propósito: quem importa um documento maior
 * precisa ver o texto e a mensagem de "passou do limite", em vez de receber um
 * arquivo silenciosamente cortado no tamanho exato do envio.
 */
export const MAX_CARACTERES_EXTRAIDOS = 400_000;

/** Tempo total de extração. Passou disso, o trabalho é abortado de verdade. */
export const MAX_MS_EXTRACAO = 30_000;

/** Teto da imagem de avatar em bytes, antes de qualquer decodificação. */
export const MAX_BYTES_IMAGEM = 8 * 1024 * 1024;

/**
 * Teto em PIXELS da imagem de avatar.
 *
 * Bytes não bastam: um PNG de poucos KB pode declarar 30000x30000, e o
 * navegador aloca ~4 bytes por pixel ao decodificar. 40 megapixels cobre
 * qualquer foto de celular ou câmera com folga.
 */
export const MAX_PIXELS_IMAGEM = 40_000_000;

function emMB(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/**
 * O arquivo cabe no orçamento? Devolve a mensagem de recusa, ou `null` quando
 * está tudo bem. Aceita qualquer objeto com `size`/`name` — o teste não precisa
 * de um `File` de verdade.
 */
export function recusaDeDocumento(arquivo: { size: number; name?: string }): string | null {
  if (!Number.isFinite(arquivo.size) || arquivo.size < 0) {
    return 'Não consegui ler o tamanho deste arquivo.';
  }
  if (arquivo.size === 0) return 'O arquivo está vazio.';
  if (arquivo.size > MAX_BYTES_DOCUMENTO) {
    return `Arquivo muito grande (limite de ${emMB(MAX_BYTES_DOCUMENTO)}). Envie um trecho ou cole o texto.`;
  }
  return null;
}

/** Mesma ideia para a imagem do avatar, antes de decodificar. */
export function recusaDeImagem(arquivo: { size: number; type?: string }): string | null {
  if (arquivo.type !== undefined && !arquivo.type.startsWith('image/')) {
    return 'Escolha um arquivo de imagem.';
  }
  if (!Number.isFinite(arquivo.size) || arquivo.size <= 0) {
    return 'Não consegui ler esta imagem.';
  }
  if (arquivo.size > MAX_BYTES_IMAGEM) {
    return `Imagem muito grande (limite de ${emMB(MAX_BYTES_IMAGEM)}).`;
  }
  return null;
}

/** A imagem já decodificada cabe no orçamento de pixels? */
export function recusaDeDimensoes(largura: number, altura: number): string | null {
  if (!(largura > 0) || !(altura > 0)) return 'Não consegui ler esta imagem.';
  if (largura * altura > MAX_PIXELS_IMAGEM) {
    return 'Imagem com dimensões grandes demais. Reduza o tamanho e tente de novo.';
  }
  return null;
}

/** Corta o texto no teto e avisa que cortou — silêncio aqui seria pior. */
export function truncarTexto(texto: string, limite = MAX_CARACTERES_EXTRAIDOS): {
  texto: string;
  truncado: boolean;
} {
  if (texto.length <= limite) return { texto, truncado: false };
  return { texto: texto.slice(0, limite), truncado: true };
}
