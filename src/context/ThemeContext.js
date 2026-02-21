import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'app-theme';

const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

const getSystemPreference = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      let saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
      saved = localStorage.getItem('crm-theme');
      if (saved === 'light' || saved === 'dark') {
        localStorage.setItem(STORAGE_KEY, saved);
        localStorage.removeItem('crm-theme');
        return saved;
      }
    } catch (_) {}
    return getSystemPreference();
  });

  useEffect(() => {
    try {
      let saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved);
        return;
      }
      saved = localStorage.getItem('crm-theme');
      if (saved === 'light' || saved === 'dark') {
        localStorage.setItem(STORAGE_KEY, saved);
        localStorage.removeItem('crm-theme');
        setThemeState(saved);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    root.classList.toggle('theme-dark', theme === 'dark');
    const t = setTimeout(() => root.classList.remove('theme-transition'), 1400);
    return () => clearTimeout(t);
  }, [theme]);

  const setTheme = (value) => {
    const next = value === 'dark' ? 'dark' : 'light';
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (_) {}
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
