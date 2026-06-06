/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warme, natuurlijke sfeer: zacht groen, aardetinten, crème.
        cream: {
          50: '#FBF8F1',
          100: '#F6F1E7',
          200: '#ECE3D2',
          300: '#DECfB3',
        },
        leaf: {
          50: '#F0F4EC',
          100: '#DCE6D3',
          200: '#BCD0AC',
          300: '#97B783',
          400: '#739C5E',
          500: '#5A8247',
          600: '#476838',
          700: '#39522E',
          800: '#2D4125',
          900: '#24331E',
        },
        bark: {
          50: '#F5EFE9',
          100: '#E7DACE',
          200: '#D2BBA6',
          300: '#B9977B',
          400: '#A37B5C',
          500: '#8A6446',
          600: '#6F4F38',
          700: '#573E2D',
          800: '#443023',
          900: '#36271D',
        },
        bloom: {
          50: '#FBEEE9',
          100: '#F6D8CC',
          200: '#ECB29C',
          300: '#E08C6C',
          400: '#D5704A',
          500: '#C25736',
          600: '#A4452A',
          700: '#823623',
          800: '#652C1E',
          900: '#52251B',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Nunito"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 8px 30px rgba(86, 62, 45, 0.10)',
      },
    },
  },
  plugins: [],
}
