import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Hearth Brand Core Palette
        ember: {
          300: '#FFB199',
          500: '#FF8A65',
          600: '#F26D32',
          700: '#E65100',
        },
        slate: {
          300: '#CFD8DC',
          500: '#78909C',
          700: '#4A6572',
          900: '#263238',
        },
        canvas: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#EEEEEE',
        },
        // Semantic UI Colors
        success: {
          DEFAULT: '#2E7D32',
        },
        warning: {
          DEFAULT: '#F9A825',
        },
        error: {
          DEFAULT: '#C62828',
        },
        info: {
          DEFAULT: '#1565C0',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
