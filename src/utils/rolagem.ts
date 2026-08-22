/**
 * Ainda há conteúdo abaixo do que está visível?
 *
 * Serve para desenhar (ou não) a sombra na borda inferior de uma área que
 * rola. Sem esse aviso, uma lista cortada no limite da caixa parece ter
 * acabado ali — e o que está embaixo simplesmente não existe para quem olha.
 *
 * A folga existe porque as três medidas do navegador são fracionárias em telas
 * com escala (zoom, densidade): no fim da rolagem sobra um resto de menos de
 * um pixel, e sem tolerância a sombra ficaria piscando para sempre.
 */
export function haMaisAbaixo(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  folga = 4,
): boolean {
  return scrollHeight - scrollTop - clientHeight > folga;
}
