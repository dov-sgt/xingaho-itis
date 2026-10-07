import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import { ToastProvider } from '@/components/Toast';
import { AppProvider } from '@/context/AppContext';
import { IBM_Plex_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const ibmPlexSans = IBM_Plex_Sans({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="id" suppressHydrationWarning className={cn("font-sans", ibmPlexSans.variable)}>
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
