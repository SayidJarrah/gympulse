/**
 * GymFlow design tokens — TypeScript / JS mirror
 *
 * Import into your theme provider (styled-components, emotion,
 * vanilla-extract, MUI, CSS-in-JS, whatever). All values match
 * tokens.css and tailwind.config.cjs exactly.
 */

export const colors = {
  // Brand
  primary: {
    DEFAULT: '#22C55E',
    dark: '#16A34A',
    darker: '#15803D',
    light: '#4ADE80',
    lighter: '#86EFAC',
    tint: 'rgba(34, 197, 94, 0.10)',
    tintStrong: 'rgba(34, 197, 94, 0.20)',
    border: 'rgba(34, 197, 94, 0.30)',
    glow: 'rgba(34, 197, 94, 0.25)',
  },
  accent: {
    DEFAULT: '#F97316',
    text: '#FB923C',
    textLight: '#FDBA74',
    tint: 'rgba(249, 115, 22, 0.10)',
    border: 'rgba(249, 115, 22, 0.30)',
  },
  // Surfaces (dark-first, 4 depths)
  bg: {
    page: '#0F0F0F',
    surface1: '#111827',
    surface2: '#1F2937',
    surface3: '#374151',
    sidebar: '#0F0F0F',
  },
  // Text
  fg: {
    default: '#FFFFFF',
    label: '#D1D5DB',
    muted: '#9CA3AF',
    metadata: '#6B7280',
    subtle: '#4B5563',
    inverse: '#111827',
    link: '#4ADE80',
    linkHover: '#86EFAC',
  },
  // Borders
  border: {
    card: '#1F2937',
    input: '#374151',
    strong: '#4B5563',
    focus: '#22C55E',
  },
  // Status
  success: { bg: 'rgba(34, 197, 94, 0.10)',  fg: '#4ADE80', border: 'rgba(34, 197, 94, 0.30)' },
  warning: { bg: 'rgba(249, 115, 22, 0.10)', fg: '#FB923C', border: 'rgba(249, 115, 22, 0.30)' },
  error:   { bg: 'rgba(239, 68, 68, 0.10)',  fg: '#F87171', border: 'rgba(239, 68, 68, 0.30)', strong: '#DC2626' },
  info:    { bg: 'rgba(59, 130, 246, 0.10)', fg: '#60A5FA', border: 'rgba(59, 130, 246, 0.30)' },
} as const;

export const fonts = {
  sans:    "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: "'Barlow Condensed', 'Inter', ui-sans-serif, system-ui, sans-serif",
  mono:    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
} as const;

export const fontSize = {
  xs:    '12px',
  sm:    '14px',
  base:  '16px',
  lg:    '18px',
  xl:    '20px',
  '2xl': '24px',
  '3xl': '30px',
  '4xl': '36px',
  '5xl': '48px',
  '6xl': '60px',
} as const;

export const lineHeight = {
  tight:   1.25,
  normal:  1.5,
  relaxed: 1.75,
} as const;

export const letterSpacing = {
  eyebrowTight: '0.18em',
  eyebrow:      '0.22em',
  eyebrowWide:  '0.32em',
} as const;

export const space = {
  xs:    '4px',
  sm:    '8px',
  md:    '16px',
  lg:    '24px',
  xl:    '32px',
  '2xl': '48px',
  '3xl': '64px',
} as const;

export const radius = {
  none:  '0',
  sm:    '2px',
  md:    '6px',   // buttons, inputs
  lg:    '12px',  // cards
  xl:    '16px',  // modals
  '2xl': '28px',  // hero cards
  full:  '9999px',
} as const;

export const shadow = {
  sm:    '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
  md:    '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
  lg:    '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
  xl:    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
  glowPrimary: '0 10px 15px -3px rgba(34, 197, 94, 0.25)',
} as const;

export const motion = {
  duration: { fast: '100ms', normal: '200ms', slow: '300ms' },
  easing: {
    out:   'cubic-bezier(0, 0, 0.2, 1)',
    in:    'cubic-bezier(0.4, 0, 1, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export const tokens = {
  colors, fonts, fontSize, lineHeight, letterSpacing,
  space, radius, shadow, motion,
} as const;

export default tokens;
