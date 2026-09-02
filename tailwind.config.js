/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--theme-bg)',
          surface: 'var(--theme-surface)',
          card: 'var(--theme-card)',
          cardHover: 'var(--theme-card-hover)',
          border: 'var(--theme-border)',
          text: 'var(--theme-text)',
          muted: 'var(--theme-muted)',
          accent: 'var(--theme-accent)',
          accentEnd: 'var(--theme-accent-end)',
          accentPrimary: 'var(--theme-accent-primary)',
          accentSecondary: 'var(--theme-accent-secondary)',
          accentTertiary: 'var(--theme-accent-tertiary)',
          badgeExport: 'var(--theme-badge-export)',
          badgeImport: 'var(--theme-badge-import)',
          badgeBackup: 'var(--theme-badge-backup)',
          badgeRestore: 'var(--theme-badge-restore)',
        }
      },
      fontFamily: {
        aladin: ['Aladin', 'cursive', 'sans-serif'],
        annie: ['"Annie Use Your Telescope"', 'cursive', 'sans-serif'],
        ballet: ['"Annie Use Your Telescope"', 'cursive', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
