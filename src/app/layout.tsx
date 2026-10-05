import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import { ToastProvider } from '@/components/Toast';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'Xinghao ITIS',
  description: 'IT Information System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
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
