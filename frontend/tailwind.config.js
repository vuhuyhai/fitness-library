/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand ────────────────────────────────────────────────
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover:   'rgb(var(--color-primary-hover) / <alpha-value>)',
          light:   'rgb(var(--color-primary-light) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover:   'rgb(var(--color-primary-hover) / <alpha-value>)',
          light:   'rgb(var(--color-accent-light) / <alpha-value>)',
        },

        // ── Backward compat: brand = primary ─────────────────────
        brand: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover:   'rgb(var(--color-primary-hover) / <alpha-value>)',
          dim:     'rgb(var(--color-primary-light) / <alpha-value>)',
        },

        // ── Surfaces ─────────────────────────────────────────────
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          2:       'rgb(var(--color-surface-2) / <alpha-value>)',
          3:       'rgb(var(--color-surface-3) / <alpha-value>)',
        },

        // ── Sidebar ───────────────────────────────────────────────
        sidebar:          'rgb(var(--color-sidebar) / <alpha-value>)',
        'sidebar-border': 'rgb(var(--color-border) / <alpha-value>)',

        // ── Borders ───────────────────────────────────────────────
        // Use "border-border" or "border-frame" (aliases)
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          focus:   'rgb(var(--color-border-focus) / <alpha-value>)',
        },
        frame: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          focus:   'rgb(var(--color-border-focus) / <alpha-value>)',
        },

        // ── Text ──────────────────────────────────────────────────
        fg: {
          primary:   'rgb(var(--color-fg-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-fg-secondary) / <alpha-value>)',
          muted:     'rgb(var(--color-fg-muted) / <alpha-value>)',
        },

        // ── Status ────────────────────────────────────────────────
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger:  'rgb(var(--color-danger)  / <alpha-value>)',
        info:    'rgb(var(--color-info)    / <alpha-value>)',

        // ── Categories ────────────────────────────────────────────
        cat: {
          workout:   'rgb(var(--color-cat-workout)   / <alpha-value>)',
          nutrition: 'rgb(var(--color-cat-nutrition) / <alpha-value>)',
          recovery:  'rgb(var(--color-cat-recovery)  / <alpha-value>)',
          mindset:   'rgb(var(--color-cat-mindset)   / <alpha-value>)',
          science:   'rgb(var(--color-cat-science)   / <alpha-value>)',
        },

        // ── Content area ──────────────────────────────────────────
        content: 'rgb(var(--color-surface) / <alpha-value>)',
      },

      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },

      boxShadow: {
        'card-hover': '0 8px 24px rgba(199,57,55,0.12)',
        'card-lg':    '0 16px 40px rgba(199,57,55,0.16)',
      },

      transitionDuration: {
        '250': '250ms',
      },

      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
