/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface FemaleThemeContextType {
  isFemaleMode: boolean;
  setFemaleMode: (enabled: boolean) => void;
  toggleFemaleMode: () => void;
}

const FemaleThemeContext = createContext<FemaleThemeContextType>({
  isFemaleMode: false,
  setFemaleMode: () => {},
  toggleFemaleMode: () => {},
});

export const FemaleThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isFemaleMode, setIsFemaleMode] = useState(() => {
    try {
      return localStorage.getItem('voyex-female-mode') === 'true';
    } catch {
      // ignore errors (e.g., localStorage not available)
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isFemaleMode) {
      root.setAttribute('data-theme', 'female');
    } else {
      root.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem('voyex-female-mode', String(isFemaleMode));
    } catch {
      // ignore errors (e.g., localStorage not available)
    }
  }, [isFemaleMode]);

  const setFemaleMode = useCallback((enabled: boolean) => setIsFemaleMode(enabled), []);
  const toggleFemaleMode = useCallback(() => setIsFemaleMode(prev => !prev), []);

  return (
    <FemaleThemeContext.Provider value={{ isFemaleMode, setFemaleMode, toggleFemaleMode }}>
      {children}
    </FemaleThemeContext.Provider>
  );
};

export const useFemaleTheme = () => useContext(FemaleThemeContext);
