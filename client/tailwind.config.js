/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        findex: {
          midnight: '#1B1F22',
          orange: '#D43D27',
          'orange-light': '#F4693A',
          'midnight-light': '#252C30',
          'midnight-lighter': '#2E363B',
          'midnight-border': '#3A444A',
        },
      },
      fontFamily: {
        sans: ['"Source Sans Pro"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
