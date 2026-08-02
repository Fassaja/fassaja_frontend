/**
 * Entrada do worker do PDF.js, com os polyfills aplicados antes.
 *
 * O worker roda num escopo global separado: o polyfill importado na página não
 * existe lá dentro. Como o `pdf.worker` usa Promise.withResolvers 13 vezes, sem
 * este envelope ele quebra em Safari antigo mesmo com a página já corrigida.
 *
 * A ordem é garantida: imports de módulo são avaliados na ordem em que
 * aparecem, então os polyfills rodam antes do código do PDF.js.
 */
import './jsPolyfills';
import 'pdfjs-dist/build/pdf.worker.min.mjs';
