/**
 * O motor de animação do framer-motion, num arquivo à parte.
 *
 * Os componentes do app são os `m.*` (versão enxuta do `motion.*`): sozinhos
 * eles só desenham o elemento. Quem os faz animar são estes recursos,
 * entregues pelo `<LazyMotion>` do App — e, carregados sob demanda, não
 * entram no arquivo principal. A primeira tela aparece sem esperar por eles;
 * as animações começam assim que o arquivo chega, logo em seguida.
 *
 * `domMax`, e não o `domAnimation` menor: o app usa animação de layout (a
 * pílula que desliza nos seletores e na dock, as listas que reordenam), e só
 * o `domMax` a inclui.
 */
import { domMax } from 'framer-motion';

export default domMax;
