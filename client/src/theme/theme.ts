import { createTheme, ThemeOptions } from '@mui/material/styles';

// Color palette based on Deisgn.json
const lightColors = {
  // Base surface: very light warm white
  baseSurface: '#FEFCFB',
  
  // Primary: cool lavender / pastel purple
  primary: {
    main: '#B5A7E8', // Cool lavender
    light: '#D4CAF0',
    dark: '#8B7BC4',
    contrastText: '#FFFFFF',
  },
  
  // Secondary: pale blues + neutral grays
  secondary: {
    main: '#A8C5E0', // Pale blue
    light: '#C5D9ED',
    dark: '#7A9FC4',
    contrastText: '#FFFFFF',
  },
  
  // Accent: soft but saturated brand color (used sparingly)
  accent: {
    main: '#9B7EDE', // Soft but saturated purple
    light: '#B8A5E8',
    dark: '#7A5FB8',
    contrastText: '#FFFFFF',
  },
  
  // Semantic colors
  success: {
    main: '#A8D5BA', // Soft green
    light: '#C5E5D1',
    dark: '#7AB896',
    contrastText: '#1F4E2F',
  },
  warning: {
    main: '#F5C2A7', // Peach/orange
    light: '#F8D4C0',
    dark: '#E89A7A',
    contrastText: '#6B3E1F',
  },
  error: {
    main: '#F5A5A5', // Soft red
    light: '#F8C0C0',
    dark: '#E87A7A',
    contrastText: '#6B1F1F',
  },
  
  // Neutral grays
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  // Text colors
  text: {
    primary: '#1A1A1A', // Near-black
    secondary: '#4A4A4A', // Dark gray
    disabled: '#9E9E9E',
  },
  
  // Background colors
  background: {
    default: '#FEFCFB', // Very light warm white
    paper: '#FFFFFF',
  },
};

const darkColors = {
  // Base surface: dark warm gray
  baseSurface: '#1A1817',
  
  // Primary: slightly brighter lavender for dark mode
  primary: {
    main: '#C5B5F0', // Brighter lavender
    light: '#D4CAF8',
    dark: '#A895E0',
    contrastText: '#1A1A1A',
  },
  
  // Secondary: softer blues for dark mode
  secondary: {
    main: '#B8D5ED', // Softer blue
    light: '#C5D9F5',
    dark: '#9FC4E0',
    contrastText: '#1A1A1A',
  },
  
  // Accent: brighter for dark mode
  accent: {
    main: '#B8A5F0', // Brighter purple
    light: '#C5B8F8',
    dark: '#A895E8',
    contrastText: '#1A1A1A',
  },
  
  // Semantic colors (adjusted for dark mode)
  success: {
    main: '#B8D5C5', // Softer green
    light: '#C5E5D1',
    dark: '#9FC4B0',
    contrastText: '#0F2E1F',
  },
  warning: {
    main: '#F5D4B8', // Softer peach
    light: '#F8E0C5',
    dark: '#E8B89A',
    contrastText: '#4B2E0F',
  },
  error: {
    main: '#F5B8B8', // Softer red
    light: '#F8C5C5',
    dark: '#E89A9A',
    contrastText: '#4B0F0F',
  },
  
  // Neutral grays (inverted for dark mode)
  gray: {
    50: '#212121',
    100: '#2A2A2A',
    200: '#333333',
    300: '#424242',
    400: '#616161',
    500: '#757575',
    600: '#9E9E9E',
    700: '#BDBDBD',
    800: '#E0E0E0',
    900: '#F5F5F5',
  },
  
  // Text colors (lighter for dark mode)
  text: {
    primary: '#F5F5F5', // Near-white
    secondary: '#BDBDBD', // Light gray
    disabled: '#757575',
  },
  
  // Background colors
  background: {
    default: '#1A1817', // Dark warm gray
    paper: '#242220',
  },
};

// Typography based on Deisgn.json
const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontWeight: 600, // Semibold
    fontSize: '2.5rem',
    letterSpacing: '-0.02em', // Slightly tighter
    lineHeight: 1.2,
  },
  h2: {
    fontWeight: 600,
    fontSize: '2rem',
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
  },
  h3: {
    fontWeight: 600,
    fontSize: '1.75rem',
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
  },
  h4: {
    fontWeight: 600,
    fontSize: '1.5rem',
    letterSpacing: '-0.01em',
    lineHeight: 1.4,
  },
  h5: {
    fontWeight: 600,
    fontSize: '1.25rem',
    letterSpacing: '0em',
    lineHeight: 1.4,
  },
  h6: {
    fontWeight: 600,
    fontSize: '1rem',
    letterSpacing: '0.01em',
    lineHeight: 1.5,
  },
  body1: {
    fontWeight: 400, // Regular
    fontSize: '1rem', // Comfortable mid-range size
    lineHeight: 1.6,
    color: 'inherit',
  },
  body2: {
    fontWeight: 400,
    fontSize: '0.875rem',
    lineHeight: 1.6,
    color: 'inherit',
  },
  button: {
    fontWeight: 500, // Medium
    textTransform: 'none' as const, // Sentence-case
    letterSpacing: '0.02em',
  },
  caption: {
    fontWeight: 500,
    fontSize: '0.75rem',
    letterSpacing: '0.01em',
  },
  overline: {
    fontWeight: 600, // Semibold for labels
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
};

// Component overrides based on Deisgn.json
const getComponentOverrides = (mode: 'light' | 'dark') => ({
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '24px', // Rounded pill-ish
        padding: '10px 24px',
        textTransform: 'none' as const,
        fontWeight: 500,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '12px', // Rounded corners (not tiny, not full pill)
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)', // Very soft shadow
        padding: '24px', // Generous padding
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      elevation1: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      elevation2: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '16px', // Pill shape
        fontWeight: 500, // Semibold
        height: '32px',
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
        },
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        backgroundColor: mode === 'light' ? '#FFFFFF' : '#242220',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: '0 12px 12px 0',
      },
    },
  },
});

export const createAppTheme = (mode: 'light' | 'dark' = 'light') => {
  const colors = mode === 'light' ? lightColors : darkColors;
  
  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: colors.primary,
      secondary: colors.secondary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      text: colors.text,
      background: colors.background,
      grey: colors.gray,
      common: {
        white: '#FFFFFF',
        black: '#000000',
      },
    },
    typography,
    shape: {
      borderRadius: 12, // Default rounded corners
    },
    spacing: 8, // 8px base spacing unit
    components: getComponentOverrides(mode),
  };
  
  return createTheme(themeOptions);
};

export type AppTheme = ReturnType<typeof createAppTheme>;

