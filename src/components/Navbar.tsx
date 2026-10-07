'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/Toast';
import { LogOut, ShieldCheck, Sun, Moon, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { t } from '@/lib/i18n';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme, lang, toggleLang } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = () => {
    if (!confirm('Apakah Anda yakin ingin keluar?')) return;
    logout();
    toast('success', 'Anda telah keluar dari sistem');
    router.push('/login');
  };

  return (
    <header className="h-14 bg-background border-b border-border px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-foreground">
          Xinghao ITIS
        </h1>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {role === 'SUPERADMIN' ? 'All Divisions' : `${user?.division || 'IT'} Division`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleLang} title={lang === 'id' ? 'Switch to English' : 'Ganti ke Indonesia'}>
          <Globe className="h-4 w-4" />
          <span className="ml-1 text-xs font-medium">{lang.toUpperCase()}</span>
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <div className="flex items-center bg-secondary rounded-lg px-2 py-1">
          <ShieldCheck className="h-3.5 w-3.5 text-primary mr-1.5" />
          <span className="text-xs font-medium text-secondary-foreground">{role}</span>
        </div>

        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground hidden sm:inline">{user?.name || 'User'}</span>
        </div>

        <Button variant="ghost" size="icon" onClick={handleLogout} title="Keluar">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
