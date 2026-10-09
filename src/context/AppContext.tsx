'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Lang = 'id' | 'en';
export type Theme = 'light' | 'dark';

interface AppContextType {
  lang: Lang;
  theme: Theme;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleLang: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LANG_KEY = 'itis_lang';
const THEME_KEY = 'itis_theme';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Lazy initial state supaya SSR dan render pertama client konsisten.
  const [lang, setLangState] = useState<Lang>('id');
  const [theme, setThemeState] = useState<Theme>('light');

  // Terapkan tema SEBELUM React melakukan paint → tidak ada kedip saat load.
  useEffect(() => {
    const t = readStoredTheme();
    const l = (localStorage.getItem(LANG_KEY) as Lang) || 'id';
    setThemeState(t);
    setLangState(l);
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.style.colorScheme = t;
  }, []);

  // Ikuti perubahan preferensi sistem selama tema belum pernah di-set manual.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(THEME_KEY)) return; // pilihan manual menang
      const t: Theme = e.matches ? 'dark' : 'light';
      setThemeState(t);
      document.documentElement.classList.toggle('dark', t === 'dark');
      document.documentElement.style.colorScheme = t;
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* ignore */
    }
    document.documentElement.classList.toggle('dark', t === 'dark');
    document.documentElement.style.colorScheme = t;
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);
  const toggleLang = useCallback(() => setLang(lang === 'id' ? 'en' : 'id'), [lang, setLang]);

  return (
    <AppContext.Provider value={{ lang, theme, setLang, setTheme, toggleTheme, toggleLang }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}