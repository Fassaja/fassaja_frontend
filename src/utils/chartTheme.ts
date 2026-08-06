import { useTheme } from '@/contexts/ThemeContext';

/**
 * Cores de CROMO dos gráficos (grade, eixos, tooltip, série neutra).
 *
 * Aqui não dá para usar as variáveis CSS do tema como no resto do app: o
 * Recharts entrega `stroke` e `fill` como ATRIBUTOS de apresentação do SVG, e
 * `var(--x)` não resolve em atributo — só em propriedade de estilo. Então este
 * é um dos poucos lugares que precisa conhecer o tema em JavaScript.
 *
 * As cores das SÉRIES (azul de concluídas, verde, âmbar, rosa) ficam fora
 * daqui de propósito: são identidade e significado, iguais nos dois temas.
 */
export interface ChartTheme {
  grid: string;
  tick: string;
  cursor: string;
  /** Série secundária ("Criadas"), que é deliberadamente apagada. */
  muted: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipLabel: string;
  /** Contorno do ponto ativo — a cor da superfície, para o ponto "recortar". */
  dotStroke: string;
}

const LIGHT: ChartTheme = {
  grid: '#EDF2F7',
  tick: '#94A3B8',
  cursor: '#E5EAF2',
  muted: '#CBD5E1',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E5EAF2',
  tooltipLabel: '#0F172A',
  dotStroke: '#FFFFFF',
};

const DARK: ChartTheme = {
  grid: '#27344C',
  tick: '#9AA8BE',
  cursor: '#33415C',
  muted: '#55647F',
  tooltipBg: '#162033',
  tooltipBorder: '#27344C',
  tooltipLabel: '#E8EEF9',
  dotStroke: '#162033',
};

export function useChartTheme(): ChartTheme {
  return useTheme().resolved === 'dark' ? DARK : LIGHT;
}
