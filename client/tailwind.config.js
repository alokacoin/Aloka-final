/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: 'var(--color-navy)',
        primary: 'var(--color-primary)',
        'dark-blue': 'var(--color-dark-blue)',
        gold: '#D4A94F',
        'soft-blue': 'var(--color-soft-blue)',
        background: 'var(--color-background)',
        secondary: 'var(--color-secondary)',
        card: 'var(--color-card)',
        heading: 'var(--color-heading)',
        body: 'var(--color-body)',
        text: 'var(--color-body)',
        muted: 'var(--color-muted)',
        teal: '#167D75',
        border: 'var(--color-border)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)'
      },
      boxShadow: {
        soft: '0 12px 30px rgba(16, 36, 58, 0.08)'
      }
    }
  },
  plugins: []
};
