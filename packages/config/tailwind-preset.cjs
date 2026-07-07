// Sindbad brand tokens as a Tailwind preset.
// Source of truth: /sindbad-brand-identity-standalone.html and docs/04-design-system.md
module.exports = {
  darkMode: 'class',
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
        // Semantic pills — docs/04-design-system.md
        status: {
          negotiating: { bg: '#FAEEDA', fg: '#854F0B' },
          ongoing: { bg: '#E6F1FB', fg: '#185FA5' },
          completed: { bg: '#E1F5EE', fg: '#0F6E56' },
          cancelled: { bg: '#FCEBEB', fg: '#A32D2D' },
        },
        tier: {
          new: { bg: '#F1EFE8', fg: '#444441' },
          bronze: { bg: '#FAEEDA', fg: '#854F0B' },
          silver: { bg: '#E2E8F0', fg: '#334155' },
          gold: { bg: '#FAC775', fg: '#633806' },
          platinum: { bg: '#E6F1FB', fg: '#0C447C' },
        },
      },
      borderRadius: {
        pill: '999px',
        button: '14px',
        panel: '18px',
        card: '20px',
      },
      fontFamily: {
        display: ['Sora', 'IBM Plex Sans Arabic', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        campaign: ['Montserrat', 'Inter', 'sans-serif'],
      },
    },
  },
};
