/** @type {import('tailwindcss').Config} */
export default {
  // 'class' e não 'media': a preferência do sistema é só o PADRÃO — quem
  // escolhe explicitamente em Ajustes precisa vencer o sistema.
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      /*
       * Cada cor aponta para uma variável CSS com um trio "R G B"; os valores
       * dos dois temas ficam em index.css. A sintaxe com <alpha-value> é o que
       * mantém os modificadores de opacidade do Tailwind funcionando — sem
       * ela, `bg-primary-dark/75` sairia opaco.
       *
       * O nome do token diz o PAPEL, não o tom: no tema escuro
       * `text-text-primary` é claro e `bg-surface` é escuro. É por isso que os
       * 700+ usos espalhados pelos componentes não precisaram mudar.
       */
      colors: {
        primary: {
          dark: 'rgb(var(--c-primary-dark) / <alpha-value>)',
          vibrant: 'rgb(var(--c-primary-vibrant) / <alpha-value>)',
          hover: 'rgb(var(--c-primary-hover) / <alpha-value>)',
          light: 'rgb(var(--c-primary-light) / <alpha-value>)',
        },
        bg: {
          main: 'rgb(var(--c-bg-main) / <alpha-value>)',
          secondary: 'rgb(var(--c-bg-secondary) / <alpha-value>)',
        },
        // Superfície elevada (cards, modais, painéis). No tema claro é branco;
        // no escuro precisa ser mais CLARA que o fundo, não mais escura — daí
        // ser um token próprio em vez de `white`.
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        // Véu atrás dos modais. Token próprio porque `primary-dark` inverte
        // no tema escuro (lá ele é quase branco) — usá-lo como véu pintaria
        // um clarão por cima da tela em vez de escurecê-la.
        scrim: 'rgb(var(--c-scrim) / <alpha-value>)',
        // Azul-marinho profundo da marca, IGUAL nos dois temas. Existe porque
        // `primary-dark` tem dois papéis que se contradizem no escuro: como
        // TEXTO ele precisa inverter (vira quase branco), mas como FUNDO dos
        // degradês da marca ele precisa continuar escuro. Sem separar, o
        // painel do login virava um bloco claro ofuscante no tema escuro.
        'brand-deep': 'rgb(var(--c-brand-deep) / <alpha-value>)',
        'brand-hero': 'rgb(var(--c-brand-hero) / <alpha-value>)',
        text: {
          primary: 'rgb(var(--c-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--c-text-secondary) / <alpha-value>)',
          soft: 'rgb(var(--c-text-soft) / <alpha-value>)',
        },
        border: 'rgb(var(--c-border) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        coral: 'rgb(var(--c-coral) / <alpha-value>)',
        turquoise: 'rgb(var(--c-turquoise) / <alpha-value>)',
        priority: {
          high: 'rgb(var(--c-priority-high) / <alpha-value>)',
          medium: 'rgb(var(--c-priority-medium) / <alpha-value>)',
          low: 'rgb(var(--c-priority-low) / <alpha-value>)',
        },
      },
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      // A sombra também é tokenizada: no tema escuro, um véu azul-marinho a 6%
      // sobre fundo quase preto é invisível — lá a sombra precisa ser preta e
      // bem mais densa para separar a superfície do fundo.
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(var(--c-shadow) / var(--shadow-sm-alpha))',
        'md': '0 4px 12px -2px rgb(var(--c-shadow) / var(--shadow-md-alpha))',
        'lg': '0 12px 28px -6px rgb(var(--c-shadow) / var(--shadow-lg-alpha))',
        'xl': '0 20px 40px -12px rgb(var(--c-shadow) / var(--shadow-xl-alpha))',
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
