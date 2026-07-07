// Sindbad brand tokens as a Tailwind preset.
// Source of truth: /sindbad-brand-identity-standalone.html and docs/04-design-system.md
module.exports = {
  theme: {
    extend: {
      colors: {
        royal: '#2563EB',
        sky: '#38BDF8',
        navy: '#0F172A',
        teal: '#14B8A6',
        amber: '#F59E0B',
        slate: {
          DEFAULT: '#64748B',
          dark: '#334155',
          light: '#94A3B8',
          border: '#E2E8F0',
        },
        offwhite: '#F8FAFC',
        error: '#EF4444',
        tint: {
          blue: '#EAF3FF',
          soft: '#F7FAFF',
        },
      },
      borderRadius: {
        pill: '999px',
        button: '14px',
        panel: '18px',
        card: '20px',
      },
      fontFamily: {
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        campaign: ['Montserrat', 'Inter', 'sans-serif'],
      },
    },
  },
};
