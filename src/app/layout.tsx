import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'Xinghao IT Information System (ITIS)',
  description: 'Sistem Informasi Operasional IT Staff Xinghao',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased font-sans">
        <ToastProvider>
          <AppLayout>{children}</AppLayout>
        </ToastProvider>
      </body>
    </html>
  );
}
