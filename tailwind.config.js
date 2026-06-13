/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#061B49',
          vibrant: '#2477FF',
          light: '#EAF2FF',
        },
        bg: {
          main: '#F7FAFF',
        },
        text: {
          primary: '#172033',
          secondary: '#667085',
        },
        border: '#E5EAF2',
        success: '#22C55E',
        warning: '#FBBF24',
        danger: '#F43F5E',
        priority: {
          high: '#8B5CF6',
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
