/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#030712',
          900: '#0a0f1e',
          850: '#0d1425',
          800: '#111827',
          700: '#1a2235',
          600: '#1e2a3a',
          500: '#243044',
          400: '#2d3a50',
          300: '#3d4f6a',
        },
        teal: {
          500: '#00c8c8',
          400: '#00e5e5',
          300: '#33ecec',
          200: '#66f0f0',
          100: '#99f5f5',
          50:  '#ccfafa',
          neon: '#00f5ff',
        },
        accent: {
          green:  '#10b981',
          red:    '#ef4444',
          yellow: '#f59e0b',
          blue:   '#3b82f6',
          purple: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-teal':   '0 0 20px rgba(0,200,200,0.3), 0 0 40px rgba(0,200,200,0.1)',
        'glow-sm':     '0 0 10px rgba(0,200,200,0.2)',
        'card':        '0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05)',
        'card-hover':  '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,200,200,0.2)',
      },
      animation: {
        'fade-in':       'fadeIn 0.3s ease-out',
        'slide-up':      'slideUp 0.4s ease-out',
        'glow-pulse':    'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,200,200,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0,200,200,0.6)' },
        },
      },
    },
  },
  plugins: [],
};


