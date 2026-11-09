/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        totvs: {
          navy: '#0B192C',
          'navy-light': '#1E3E62',
          primary: '#0066FF',
          accent: '#00D2D3',
          dark: '#0f172a',
          surface: '#f8fafc',
          border: '#e2e8f0'
        },
        risk: {
          high: '#EF4444',
          'high-bg': '#FEE2E2',
          moderate: '#F59E0B',
          'moderate-bg': '#FEF3C7',
          low: '#10B981',
          'low-bg': '#D1FAE5'
        }
      }
    },
  },
  plugins: [],
}
