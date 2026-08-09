/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vio: {
          royal: '#5B3DF5',
          electric: '#7C3AED',
          gold: '#F5A623',
          dark: '#0B1020',
          darker: '#070A18',
          light: '#F8FAFC',
          ink: '#0F1226',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
