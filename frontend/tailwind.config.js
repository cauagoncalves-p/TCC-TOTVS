/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
          primary: 'var(--accent-primary)',
          'primary-hover': 'var(--accent-primary-hover)',
          'primary-subtle': 'var(--accent-primary-subtle)',
          secondary: 'var(--accent-secondary)',
          'secondary-hover': 'var(--accent-secondary-hover)',
          'secondary-subtle': 'var(--accent-secondary-subtle)',
          cyan: 'var(--accent-cyan)',
          purple: 'var(--palette-purple)',
        },
        bg: {
          primary: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          'surface-elevated': 'var(--bg-elevated)',
          subtle: 'var(--bg-subtle)',
        },
        nav: {
          DEFAULT: 'var(--bg-nav)',
          surface: 'var(--bg-nav-surface)',
          hover: 'var(--bg-nav-hover)',
          active: 'var(--bg-nav-active)',
          border: 'var(--border-nav)',
        },
        app: {
          bg: 'var(--bg-app)',
          surface: 'var(--bg-surface)',
          border: 'var(--border)',
        },
        border: {
          DEFAULT: 'var(--border-subtle)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          'on-brand': 'var(--text-on-brand)',
          'on-accent': 'var(--text-on-accent)',
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
      },
      width: {
        sidebar: 'var(--sidebar-width)',
        'sidebar-rail': 'var(--sidebar-rail)',
      },
      minWidth: {
        sidebar: 'var(--sidebar-width)',
        'sidebar-rail': 'var(--sidebar-rail)',
      },
      height: {
        topbar: 'var(--topbar-height)',
      },
      maxWidth: {
        content: 'var(--content-max)',
      },
      zIndex: {
        sticky: 'var(--z-sticky)',
        topbar: 'var(--z-topbar)',
        sidebar: 'var(--z-sidebar)',
        vlibras: 'var(--z-vlibras)',
        dropdown: 'var(--z-dropdown)',
        drawer: 'var(--z-drawer)',
        modal: 'var(--z-modal)',
        dialog: 'var(--z-dialog)',
        toast: 'var(--z-toast)',
        tooltip: 'var(--z-tooltip)',
      },
    },
  },
  plugins: [],
}
