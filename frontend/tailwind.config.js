/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dimed: {
          bg: '#020617',
          sidebar: '#0f172a',
          card: 'rgba(15,23,42,0.6)',
          'card-solid': '#0f172a',
          header: 'rgba(15,23,42,0.85)',
          accent: '#60a5fa',
          'accent-hover': '#3b82f6',
          'accent-active': '#2563eb',
          border: 'rgba(255,255,255,0.06)',
          'border-hover': 'rgba(255,255,255,0.1)',
          'text-primary': '#e2e8f0',
          'text-heading': '#f1f5f9',
          'text-secondary': '#94a3b8',
          'text-muted': '#64748b',
          success: '#10b981',
          'success-light': '#34d399',
          warning: '#f97316',
          'warning-light': '#fb923c',
          danger: '#ef4444',
          'danger-light': '#f87171',
          info: '#60a5fa',
          'info-light': '#93c5fd',
          purple: '#a855f7',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'dimed': '16px',
        'dimed-sm': '10px',
        'dimed-xs': '8px',
        'dimed-pill': '20px',
      },
      backdropBlur: {
        'dimed': '20px',
        'dimed-sm': '12px',
      },
      spacing: {
        'sidebar': '260px',
        'header': '56px',
      },
      zIndex: {
        'sidebar': '100',
        'header': '90',
        'modal': '200',
        'toast': '300',
      },
      animation: {
        'toast-in': 'toastIn 0.3s ease',
        'fade-in': 'fadeIn 0.3s ease',
      },
      keyframes: {
        toastIn: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
