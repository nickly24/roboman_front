import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'crm-theme';

const CRMThemeContext = createContext({ theme: 'dark', setTheme: () => {} });

export const useCRMTheme = () => useContext(CRMThemeContext);

export const CRMThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') setThemeState(saved);
    } catch (_) {}
  }, []);

  const setTheme = (value) => {
    const next = value === 'light' ? 'light' : 'dark';
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (_) {}
  };

  return (
    <CRMThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </CRMThemeContext.Provider>
  );
};
