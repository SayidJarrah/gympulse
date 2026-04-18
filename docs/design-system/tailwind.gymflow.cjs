/**
 * GymFlow design tokens — Tailwind v3 config extension.
 *
 * Drop into frontend/tailwind.config.js:
 *
 *   const gymflow = require('./docs/design/tailwind.gymflow.cjs');
 *   module.exports = {
 *     content: ['./src/**\/*.{ts,tsx,html}'],
 *     theme: { extend: gymflow.extend },
 *     plugins: [],
 *   };
 */

module.exports = {
  extend: {
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      display: ['Barlow Condensed', 'Inter', 'ui-sans-serif', 'sans-serif'],
    },
    colors: {
      brand: {
        primary: '#22C55E',
        'primary-dark': '#16A34A',
        'primary-darker': '#15803D',
        'primary-light': '#4ADE80',
        'primary-lighter': '#86EFAC',
        accent: '#F97316',
        'accent-text': '#FB923C',
        'accent-text-light': '#FDBA74',
      },
      surface: {
        page: '#0F0F0F',
        1: '#111827',
        2: '#1F2937',
        3: '#374151',
        sidebar: '#0F0F0F',
      },
      ink: {
        DEFAULT: '#FFFFFF',
        muted: '#9CA3AF',
        subtle: '#4B5563',
        label: '#D1D5DB',
        metadata: '#6B7280',
        inverse: '#111827',
        link: '#4ADE80',
        'link-hover': '#86EFAC',
      },
      line: {
        card: '#1F2937',
        input: '#374151',
        strong: '#4B5563',
        focus: '#22C55E',
      },
    },
    borderRadius: {
      md: '6px',
      lg: '12px',
      xl: '16px',
      '2xl': '28px',
    },
    boxShadow: {
      sm: '0 1px 2px 0 rgba(0,0,0,0.5)',
      md: '0 4px 6px -1px rgba(0,0,0,0.5), 0 2px 4px -2px rgba(0,0,0,0.5)',
      lg: '0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.5)',
      xl: '0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)',
      '2xl': '0 25px 50px -12px rgba(0,0,0,0.3)',
      'glow-primary': '0 10px 15px -3px rgba(34,197,94,0.25)',
    },
    transitionDuration: {
      fast: '100ms',
      normal: '200ms',
      slow: '300ms',
    },
    letterSpacing: {
      eyebrow: '0.22em',
      'eyebrow-tight': '0.18em',
      'eyebrow-wide': '0.32em',
    },
  },
};
