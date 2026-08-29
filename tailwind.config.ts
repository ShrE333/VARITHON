import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#fff7ed',
          100: '#ffedd5',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
      },
      fontSize: {
        // legible one-handed, at a glance, in sun glare
        'hero': ['3rem', { lineHeight: '1.05', fontWeight: '700' }],
      },
      minHeight: {
        touch: '64px',
      },
      minWidth: {
        touch: '64px',
      },
    },
  },
  plugins: [],
};

export default config;
