import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Header } from '@/components/header';
import { BottomTabs } from '@/components/bottom-tabs';
import { Pwa } from '@/components/pwa';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Sindbad — Powered by Travelers',
  description: 'Peer-to-peer cross-border shopping & delivery.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Sindbad' },
  // Full-bleed PNG — iOS ignores SVG touch icons and paints transparency black.
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563EB' },
    { media: '(prefers-color-scheme: dark)', color: '#0F172A' },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded-button focus:bg-royal focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
            >
              {t('nav.skipToContent')}
            </a>
            <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col border-slate-border bg-offwhite dark:bg-navy sm:border-x">
              <Header />
              <main id="main" className="flex-1 px-4 pb-24 pt-4">
                {children}
              </main>
              <BottomTabs />
              <Pwa />
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
