import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './lib/**/*.{ts,tsx,js,jsx}',
  ],
  /*
   * Preflight is off, and re-applied by hand inside `.wari-scope`
   * (see app/globals.css).
   *
   * The merged app serves two stylesheets that both want to own bare element
   * selectors: Tailwind's reset, and the portal's own CSS. Left global,
   * preflight strips the portal's heading sizes and list markers, which the
   * hand-written portal CSS assumes are still there. Scoping it means the
   * Tailwind pages get the reset they need and the portal pages are left
   * exactly as they were authored.
   */
  corePlugins: { preflight: false },
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
