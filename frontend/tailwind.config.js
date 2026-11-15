/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          950: 'var(--brand-950)',
          900: 'var(--brand-900)',
          700: 'var(--brand-700)',
          500: 'var(--brand-500)',
          300: 'var(--brand-300)',
          100: 'var(--brand-100)',
        },
        accent: {
          cyan: 'var(--accent-cyan)',
        },
        app: {
          bg: 'var(--bg-app)',
          surface: 'var(--bg-surface)',
          border: 'var(--border)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          'on-brand': 'var(--text-on-brand)',
        },
        risk: {
          high: 'var(--risk-high)',
          'high-bg': 'var(--risk-high-bg)',
          moderate: 'var(--risk-moderate)',
          'moderate-bg': 'var(--risk-moderate-bg)',
          low: 'var(--risk-low)',
          'low-bg': 'var(--risk-low-bg)',
        },
        info: {
          DEFAULT: 'var(--info)',
          bg: 'var(--info-bg)',
        },
        totvs: {
          navy: 'var(--brand-950)',
          'navy-light': 'var(--brand-700)',
          primary: 'var(--brand-500)',
          accent: 'var(--accent-cyan)',
          surface: 'var(--bg-app)',
          border: 'var(--border)'
        }
      }
    },
  },
  plugins: [],
}
