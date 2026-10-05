'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Lang = 'id' | 'en';
type Theme = 'light' | 'dark';

interface AppContextType {
  lang: Lang;
  theme: Theme;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleLang: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('id');
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const savedLang = localStorage.getItem('itis_lang') as Lang | null;
    const savedTheme = localStorage.getItem('itis_theme') as Theme | null;
    if (savedLang) setLang(savedLang);
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('itis_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('itis_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  const toggleLang = () => setLang((l) => (l === 'id' ? 'en' : 'id'));

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
