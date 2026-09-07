/**
 * FE-06 — orçamento de importação de arquivos.
 *
 * Testa a régua (bytes, pixels, truncagem) sem fixtures pesadas: gerar uma
 * bomba de descompressão de verdade travaria a máquina, que é justamente o
 * comportamento que estes limites existem para evitar.
 *
 * Rodar: npm run test
 */
import {
  MAX_BYTES_DOCUMENTO,
  MAX_BYTES_IMAGEM,
  MAX_CARACTERES_EXTRAIDOS,
  MAX_PIXELS_IMAGEM,
  recusaDeDimensoes,
  recusaDeDocumento,
  recusaDeImagem,
  truncarTexto,
} from '../src/utils/limitesDeArquivo.ts';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}`);
  }
}

// --- documento -----------------------------------------------------------
check('arquivo comum passa', recusaDeDocumento({ size: 200 * 1024, name: 'a.pdf' }) === null);
check('no limite exato passa', recusaDeDocumento({ size: MAX_BYTES_DOCUMENTO, name: 'a.pdf' }) === null);
check('um byte acima é recusado', recusaDeDocumento({ size: MAX_BYTES_DOCUMENTO + 1, name: 'a.pdf' }) !== null);
check('a recusa diz o limite', (recusaDeDocumento({ size: 1e9, name: 'a.pdf' }) ?? '').includes('MB'));
check('arquivo vazio é recusado', recusaDeDocumento({ size: 0, name: 'a.pdf' }) !== null);
check('tamanho inválido é recusado', recusaDeDocumento({ size: Number.NaN, name: 'a.pdf' }) !== null);
check('tamanho negativo é recusado', recusaDeDocumento({ size: -1, name: 'a.pdf' }) !== null);

// --- imagem (avatar) -----------------------------------------------------
check('foto comum passa', recusaDeImagem({ size: 900 * 1024, type: 'image/jpeg' }) === null);
check('imagem acima do limite é recusada', recusaDeImagem({ size: MAX_BYTES_IMAGEM + 1, type: 'image/png' }) !== null);
check('não-imagem é recusada', recusaDeImagem({ size: 10, type: 'application/pdf' }) !== null);
check('tipo ausente não impede a checagem de bytes', recusaDeImagem({ size: MAX_BYTES_IMAGEM + 1 }) !== null);

// Bytes não bastam: um PNG pequeno pode declarar dimensões enormes, e é a
// DECODIFICAÇÃO (≈4 bytes por pixel) que derruba a aba.
check('foto de celular passa nos pixels', recusaDeDimensoes(4032, 3024) === null);
check('30000x30000 é recusado', recusaDeDimensoes(30000, 30000) !== null);
check('no limite de pixels passa', recusaDeDimensoes(MAX_PIXELS_IMAGEM / 1000, 1000) === null);
check('acima do limite de pixels não passa', recusaDeDimensoes(MAX_PIXELS_IMAGEM / 1000 + 1, 1000) !== null);
check('dimensão zero é recusada', recusaDeDimensoes(0, 100) !== null);

// --- texto extraído ------------------------------------------------------
{
  const curto = truncarTexto('abc');
  check('texto curto não é cortado', curto.texto === 'abc' && curto.truncado === false);

  const enorme = truncarTexto('x'.repeat(MAX_CARACTERES_EXTRAIDOS + 5000));
  check('texto enorme é cortado no limite', enorme.texto.length === MAX_CARACTERES_EXTRAIDOS);
  check('e o corte é sinalizado (a pessoa precisa saber)', enorme.truncado === true);

  const noLimite = truncarTexto('y'.repeat(MAX_CARACTERES_EXTRAIDOS));
  check('exatamente no limite não conta como cortado', noLimite.truncado === false);

  const proprio = truncarTexto('abcdef', 3);
  check('o limite é parametrizável', proprio.texto === 'abc' && proprio.truncado === true);
}

console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) process.exit(1);
