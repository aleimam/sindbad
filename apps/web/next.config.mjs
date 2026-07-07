import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sindbad/ui', '@sindbad/shared', '@sindbad/i18n'],
};

export default withNextIntl(nextConfig);
