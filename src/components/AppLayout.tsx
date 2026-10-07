'use client';

import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const router = useRouter();

  if (!user && pathname !== '/login') {
    router.push('/login');
    return null;
  }

  if (user && pathname === '/login') {
    router.push('/dashboard');
    return null;
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutInner>{children}</LayoutInner>
    </AuthProvider>
  );
}
