import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import { ToastProvider } from '@/components/Toast';
import { AppProvider } from '@/context/AppContext';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/config';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  icons: {
    icon: [{ url: '/pict/xh_logo.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/pict/xh_logo.svg' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f1a' },
  ],
};

/**
 * Terapkan tema tersimpan sebelum paint pertama supaya tidak ada kedip
 * (flash of wrong theme) saat halaman dimuat.
 */
const NO_FLASH = `(function(){try{var t=localStorage.getItem('itis_theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var r=document.documentElement;r.classList.toggle('dark',t==='dark');r.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="antialiased font-sans">
        <AppProvider>
          <ToastProvider>
            <AppLayout>{children}</AppLayout>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}