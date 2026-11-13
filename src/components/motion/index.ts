/**
 * Kit de movimento do Fassajá.
 *
 * Entrada ........ Reveal, Stagger, TextReveal
 * Texto .......... ShinyText, GradientText
 * Ponteiro ....... TiltCard, Magnetic, useSpotlight (+ classe `fx-spotlight`)
 * Enfeite ........ BorderBeam, Aurora, Marquee (+ classe `fx-dots`)
 *
 * Os efeitos são CSS (bloco "KIT DE MOVIMENTO" em index.css); os componentes
 * só dão a largada. Todos respeitam "reduzir movimento" e nenhum depende de
 * hover para mostrar conteúdo.
 */
export { Reveal } from './Reveal';
export { Stagger } from './Stagger';
export { TextReveal } from './TextReveal';
export { ShinyText, GradientText } from './Text';
export { TiltCard } from './TiltCard';
export { Magnetic } from './Magnetic';
export { BorderBeam, Aurora, Marquee } from './Decor';
export { useSpotlight } from './useSpotlight';
export { useInView } from './useInView';
