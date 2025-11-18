import { createTheme, ThemeOptions } from '@mui/material/styles';

// Color palette based on GitLab design system
const lightColors = {
  // Base surface: GitLab light background
  baseSurface: '#FAFAFA',
  
  // Primary: GitLab orange/red (#FC6D26 / #E24329)
  primary: {
    main: '#FC6D26', // GitLab orange
    light: '#FF8A4C',
    dark: '#E24329', // GitLab red
    contrastText: '#FFFFFF',
  },
  
  // Secondary: GitLab blue
  secondary: {
    main: '#428BCA', // GitLab blue
    light: '#5BA3D8',
    dark: '#2E6DA4',
    contrastText: '#FFFFFF',
  },
  
  // Accent: GitLab purple (used sparingly)
  accent: {
    main: '#6B4C93', // GitLab purple
    light: '#8B6FAF',
    dark: '#4D3570',
    contrastText: '#FFFFFF',
  },
  
  // Semantic colors (GitLab style)
  success: {
    main: '#38A169', // GitLab green
    light: '#48BB78',
    dark: '#2F855A',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#ED8936', // GitLab orange/warning
    light: '#F6AD55',
    dark: '#DD6B20',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#E53E3E', // GitLab red/error
    light: '#FC8181',
    dark: '#C53030',
    contrastText: '#FFFFFF',
  },
  
  // Neutral grays (GitLab style)
  gray: {
    50: '#F7F8FA',
    100: '#EBECF0',
    200: '#DEE0E4',
    300: '#C7CBD1',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Text colors (GitLab style)
  text: {
    primary: '#1F2937', // Dark gray
    secondary: '#6B7280', // Medium gray
    disabled: '#9CA3AF',
  },
  
  // Background colors (GitLab style)
  background: {
    default: '#FAFAFA', // Light gray background
    paper: '#FFFFFF',
  },
};

const darkColors = {
  // Base surface: GitLab dark background
  baseSurface: '#1C1C1E',
  
  // Primary: GitLab orange (brighter for dark mode)
  primary: {
    main: '#FF8A4C', // Brighter GitLab orange
    light: '#FFA366',
    dark: '#FC6D26', // Standard GitLab orange
    contrastText: '#FFFFFF',
  },
  
  // Secondary: GitLab blue (brighter for dark mode)
  secondary: {
    main: '#5BA3D8', // Brighter GitLab blue
    light: '#7BB5E0',
    dark: '#428BCA', // Standard GitLab blue
    contrastText: '#FFFFFF',
  },
  
  // Accent: GitLab purple (brighter for dark mode)
  accent: {
    main: '#8B6FAF', // Brighter GitLab purple
    light: '#A589C4',
    dark: '#6B4C93', // Standard GitLab purple
    contrastText: '#FFFFFF',
  },
  
  // Semantic colors (GitLab style, adjusted for dark mode)
  success: {
    main: '#48BB78', // Brighter green
    light: '#68D391',
    dark: '#38A169', // Standard green
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#F6AD55', // Brighter orange
    light: '#FBD38D',
    dark: '#ED8936', // Standard orange
    contrastText: '#1A202C',
  },
  error: {
    main: '#FC8181', // Brighter red
    light: '#FEB2B2',
    dark: '#E53E3E', // Standard red
    contrastText: '#FFFFFF',
  },
  
  // Neutral grays (GitLab dark mode)
  gray: {
    50: '#1F2937',
    100: '#374151',
    200: '#4B5563',
    300: '#6B7280',
    400: '#9CA3AF',
    500: '#C7CBD1',
    600: '#DEE0E4',
    700: '#EBECF0',
    800: '#F7F8FA',
    900: '#FFFFFF',
  },
  
  // Text colors (GitLab dark mode)
  text: {
    primary: '#F7F8FA', // Near-white
    secondary: '#C7CBD1', // Light gray
    disabled: '#6B7280',
  },
  
  // Background colors (GitLab dark mode)
  background: {
    default: '#1C1C1E', // Dark gray background
    paper: '#2C2C2E',
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
        backgroundColor: mode === 'light' ? '#FFFFFF' : '#2C2C2E',
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

