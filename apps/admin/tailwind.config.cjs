/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@sindbad/config/tailwind-preset.cjs')],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
};
