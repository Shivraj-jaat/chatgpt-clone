/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gpt: {
          main: '#212121',
          sidebar: '#171717',
          surface: '#2f2f2f',
          border: '#383838',
          subtext: '#b4b4b4',
          accent: '#10a37f', // OpenAI emerald green
        }
      },
      fontFamily: {
        sans: [
          'Söhne',
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          '"Fira Sans"',
          '"Droid Sans"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        mono: [
          'Consolas',
          'Monaco',
          '"Courier New"',
          'monospace'
        ]
      }
    },
  },
  plugins: [],
};
