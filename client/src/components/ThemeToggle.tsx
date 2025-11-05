import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { mode, toggleTheme } = useTheme();

  return (
    <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
      <IconButton
        onClick={toggleTheme}
        sx={{
          color: 'text.primary',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'action.hover',
            transform: 'scale(1.05)',
          },
        }}
      >
        {mode === 'light' ? (
          <Brightness4 sx={{ color: 'text.primary' }} />
        ) : (
          <Brightness7 sx={{ color: 'text.primary' }} />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;

