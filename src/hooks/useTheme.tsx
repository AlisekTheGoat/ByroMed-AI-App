import * as React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  isDark: boolean;
  setTheme: (t: Theme) => void;
  fontSize: number; // px
  setFontSize: (px: number) => void;
  fontFamily: 'Montserrat' | 'Tinos' | 'Sensation' | 'Roboto' | 'Arial' | 'Inter' | 'Public Sans';
  setFontFamily: (f: 'Montserrat' | 'Tinos' | 'Sensation' | 'Roboto' | 'Arial' | 'Inter' | 'Public Sans') => void;
}

// Create context with a default value
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  resolvedTheme: 'light',
  isDark: false,
  setTheme: () => {},
  fontSize: 16,
  setFontSize: () => {},
  fontFamily: 'Inter',
  setFontFamily: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [fontSize, setFontSize] = useState<number>(16);
  const [fontFamily, setFontFamily] = useState<'Montserrat' | 'Tinos' | 'Sensation' | 'Roboto' | 'Arial' | 'Inter' | 'Public Sans'>('Inter');
  const [isMounted, setIsMounted] = useState(false);

  // Check for saved theme preference or use system preference
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as Theme | null) ?? 'system';
    const savedFontSize = Number(localStorage.getItem('fontSize') ?? '16');
    const savedFontFamily = (localStorage.getItem('fontFamily') as ('Montserrat' | 'Tinos' | 'Sensation' | 'Roboto' | 'Arial' | 'Inter' | 'Public Sans') | null) ?? 'Inter';
    setTheme(savedTheme);
    setFontSize(Number.isFinite(savedFontSize) && savedFontSize > 10 && savedFontSize < 24 ? savedFontSize : 16);
    setFontFamily(savedFontFamily);

    setIsMounted(true);
  }, []);

  // Resolve theme and apply to root
  useEffect(() => {
    if (!isMounted) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const compute = (): 'light' | 'dark' => {
      if (theme === 'system') return mq.matches ? 'dark' : 'light';
      return theme;
    };
    const rt = compute();
    setResolvedTheme(rt);

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(rt);
    localStorage.setItem('theme', theme);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', rt === 'dark' ? '#0f172a' : '#ffffff');
    }

    const onChange = () => {
      if (theme === 'system') {
        const newRt = mq.matches ? 'dark' : 'light';
        setResolvedTheme(newRt);
        root.classList.remove('light', 'dark');
        root.classList.add(newRt);
      }
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [theme, isMounted]);

  // Apply font settings globally
  useEffect(() => {
    if (!isMounted) return;
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('fontSize', String(fontSize));
  }, [fontSize, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    const stacks: Record<typeof fontFamily, string> = {
      'Inter': '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
      'Montserrat': '"Montserrat", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
      'Tinos': '"Tinos", Georgia, "Times New Roman", serif',
      'Roboto': 'Roboto, "Inter", Arial, Helvetica, sans-serif',
      'Arial': 'Arial, Helvetica, sans-serif',
      'Public Sans': '"Public Sans", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
      // Sensation is not loaded from Google; use fallback to Inter/system if missing
      'Sensation': '"Sensation", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    } as const;
    document.documentElement.style.setProperty('--app-font-family', stacks[fontFamily]);
    document.body.style.fontFamily = stacks[fontFamily];
    localStorage.setItem('fontFamily', fontFamily);
  }, [fontFamily, isMounted]);

  // Expose setters as-is

  const value = {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setTheme,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  return React.useContext(ThemeContext);
}
