/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        background: 'var(--bg)',
        surface:    'var(--surface)',
        'surface-2':'var(--surface-2)',
        primary:    'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-light': 'var(--primary-light)',
        secondary:  'var(--text-2)',
        accent:     'var(--accent)',
        danger:     'var(--danger)',
        success:    'var(--success)',
        warning:    'var(--warning)',
        border:     'var(--border)',
        'text-muted':'var(--text-3)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm:  'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        lg:  'var(--shadow-lg)',
        xl:  'var(--shadow-xl)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn .3s ease',
        'slide-up': 'fadeInUp .35s ease',
      },
    },
  },
  plugins: [],
}
