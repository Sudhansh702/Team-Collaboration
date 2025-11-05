import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { createAppTheme } from '../theme/theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Get initial mode from localStorage or system preference
  const getInitialMode = (): ThemeMode => {
    const savedMode = localStorage.getItem('themeMode') as ThemeMode | null;
    if (savedMode) {
      return savedMode;
    }
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [theme, setTheme] = useState(() => createAppTheme(mode));

  // Update theme when mode changes
  useEffect(() => {
    setTheme(createAppTheme(mode));
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem('themeMode')) {
        setModeState(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setModeState((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const value: ThemeContextType = {
    mode,
    toggleTheme,
    setMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};

