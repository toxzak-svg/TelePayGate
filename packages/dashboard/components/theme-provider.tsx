'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useThemeStore, getAppliedTheme } from '@/lib/store/themeStore';

const ThemeContext = createContext<{
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const appliedTheme = getAppliedTheme(theme);
    root.classList.remove('light', 'dark');
    root.classList.add(appliedTheme);
  }, [theme]);

  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
