/** @type {import('tailwindcss').Config} */
export default {
  important: '#root',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    { pattern: /bg-(amber|blue|purple|green|cyan|orange|rose|teal|indigo|pink|gray|red|yellow)-(50|100|200|300|400|500|600|700)/ },
    { pattern: /text-(amber|blue|purple|green|cyan|orange|rose|teal|indigo|pink|gray|red|yellow)-(50|100|200|300|400|500|600|700)/ },
    { pattern: /border-(amber|blue|purple|green|cyan|orange|rose|teal|indigo|pink|gray|red|yellow)-(50|100|200|300|400|500|600|700)/ },
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B1849',
        forest: '#124D1C',
        gold: '#E4B028',
        cream: '#EBEDE3',
        primary: {
          50: '#FBF6E6',
          100: '#F6ECC4',
          200: '#F0DC8F',
          300: '#EACC5A',
          400: '#E7BE3A',
          500: '#E4B028',
          600: '#C99820',
          700: '#A67B18',
          800: '#7F5D14',
          900: '#5C4410',
        },
      },
    },
  },
  plugins: [],
};
