/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
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
          soft: '#94A3B8',
        },
        border: '#D5DEEA',
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
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
