/**
 * GymFlow design tokens — Tailwind mirror
 *
 * Merge theme.extend into your existing tailwind.config.
 * Keep your own content globs and plugins.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: '#22C55E',
          dark: '#16A34A',
          darker: '#15803D',
          light: '#4ADE80',
          lighter: '#86EFAC',
        },
        accent: {
          DEFAULT: '#F97316',
          text: '#FB923C',
          'text-light': '#FDBA74',
        },
        // Surfaces (dark-first)
        page: '#0F0F0F',
        surface: {
          1: '#111827',
          2: '#1F2937',
          3: '#374151',
        },
        // Text
        fg: {
          DEFAULT: '#FFFFFF',
          label: '#D1D5DB',
          muted: '#9CA3AF',
          metadata: '#6B7280',
          subtle: '#4B5563',
          inverse: '#111827',
          link: '#4ADE80',
          'link-hover': '#86EFAC',
        },
        // Borders
        border: {
          card: '#1F2937',
          input: '#374151',
          strong: '#4B5563',
          focus: '#22C55E',
        },
        // Status
        success: { bg: 'rgba(34, 197, 94, 0.10)', fg: '#4ADE80', border: 'rgba(34, 197, 94, 0.30)' },
        warning: { bg: 'rgba(249, 115, 22, 0.10)', fg: '#FB923C', border: 'rgba(249, 115, 22, 0.30)' },
        error:   { bg: 'rgba(239, 68, 68, 0.10)', fg: '#F87171', border: 'rgba(239, 68, 68, 0.30)', strong: '#DC2626' },
        info:    { bg: 'rgba(59, 130, 246, 0.10)', fg: '#60A5FA', border: 'rgba(59, 130, 246, 0.30)' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        xs:   '12px',
        sm:   '14px',
        base: '16px',
        lg:   '18px',
        xl:   '20px',
        '2xl':'24px',
        '3xl':'30px',
        '4xl':'36px',
        '5xl':'48px',
        '6xl':'60px',
      },
      spacing: {
        xs:   '4px',
        sm:   '8px',
        md:   '16px',
        lg:   '24px',
        xl:   '32px',
        '2xl':'48px',
        '3xl':'64px',
      },
      borderRadius: {
        none: '0',
        sm:   '2px',
        md:   '6px',    // buttons, inputs
        lg:   '12px',   // cards
        xl:   '16px',   // modals
        '2xl':'28px',   // hero cards
        full: '9999px',
      },
      boxShadow: {
        sm:  '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
        md:  '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
        lg:  '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
        xl:  '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        '2xl':'0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        'glow-primary': '0 10px 15px -3px rgba(34, 197, 94, 0.25)',
      },
      letterSpacing: {
        'eyebrow-tight': '0.18em',
        eyebrow:         '0.22em',
        'eyebrow-wide':  '0.32em',
      },
      lineHeight: {
        tight:   '1.25',
        normal:  '1.5',
        relaxed: '1.75',
      },
      transitionDuration: {
        fast:   '100ms',
        normal: '200ms',
        slow:   '300ms',
      },
      transitionTimingFunction: {
        out:      'cubic-bezier(0, 0, 0.2, 1)',
        in:       'cubic-bezier(0.4, 0, 1, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
};
