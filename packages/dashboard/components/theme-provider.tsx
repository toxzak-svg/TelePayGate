'use client';

import * as React from 'react';
import { useThemeStore, getAppliedTheme } from '@/lib/store/themeStore';
import { useEffect } from 'react';

const ThemeContext = React.createContext<{
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
} | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  
  // Only access the store after mounting to avoid SSR issues
  const { theme, setTheme } = mounted ? useThemeStore() : { theme: 'system' as const, setTheme: () => {} };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      const appliedTheme = getAppliedTheme(theme);
      root.classList.remove('light', 'dark');
      root.classList.add(appliedTheme);
    }
  }, [theme]);

  // During SSR, just render children without context
  // This prevents useContext error during prerendering
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
