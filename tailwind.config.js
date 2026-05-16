/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold:    'var(--gold)',
        surface: 'var(--bg-surface)',
        base:    'var(--bg-base)',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        sans:    ['DM Sans', 'sans-serif'],
      },
      height: {
        player: 'var(--player-height)',
      },
    },
  },
  plugins: [],
};
