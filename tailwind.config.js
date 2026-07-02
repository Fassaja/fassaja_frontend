/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          dark: '#061B49',
          vibrant: '#2477FF',
          hover: '#1D64D8',
          light: '#EAF2FF',
        },
        bg: {
          main: '#F7FAFF',
          secondary: '#F2F6FC',
        },
        text: {
          primary: '#0F172A',
          secondary: '#64748B',
          soft: '#5F6E85', // escurecido p/ contraste AA (~5.2:1 em fundo branco)
        },
        border: '#E3EAF3',
        success: '#22C55E',
        warning: '#FBBF24',
        danger: '#F43F5E',
        coral: '#FB7185',
        turquoise: '#2DD4BF',
        priority: {
          high: '#8B5CF6',
          medium: '#FBBF24',
          low: '#22C55E',
        },
      },
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(6, 27, 73, 0.06)',
        'md': '0 4px 12px -2px rgba(6, 27, 73, 0.10)',
        'lg': '0 12px 28px -6px rgba(6, 27, 73, 0.12)',
        'xl': '0 20px 40px -12px rgba(6, 27, 73, 0.18)',
      },
      // Curvas de desaceleração suaves: DEFAULT troca a curva padrão de todas
      // as classes transition-* do app (hover, active etc.) por uma mais fluida.
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'page-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        // Flutuação do mascote em CSS (compositor/GPU) em vez de JS por frame.
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-9px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'page-in': 'page-in 240ms cubic-bezier(0.25, 1, 0.5, 1) both',
        'fade-in': 'fade-in 200ms cubic-bezier(0.25, 1, 0.5, 1) both',
        bob: 'bob 3s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
