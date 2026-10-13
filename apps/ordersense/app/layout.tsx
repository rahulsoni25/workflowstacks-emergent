import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/lib/i18n/context';
import { getLocale } from '@/lib/i18n/server';
import { getStore } from '@/lib/supabase/server';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'OrderSense AI', template: '%s · OrderSense AI' },
  description: 'Upload your POS report. Know what to order today.',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f8a5f',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let storeLanguage: string | null = null;
  try {
    storeLanguage = (await getStore())?.language ?? null;
  } catch {
    // Supabase not configured yet: the login page explains what to do.
  }
  const locale = getLocale(storeLanguage);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- this is the app-router root layout, so the font applies to every page */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+Arabic:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <I18nProvider locale={locale}>
          {children}
          <Toaster richColors position="top-center" dir={dir} />
        </I18nProvider>
      </body>
    </html>
  );
}
