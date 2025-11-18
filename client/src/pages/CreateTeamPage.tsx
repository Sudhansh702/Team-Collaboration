import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import teamService from '../services/team.service';
import ThemeToggle from '../components/ThemeToggle';
import { ExitToApp } from '@mui/icons-material';
import { AppBar } from '@mui/material';
import { Toolbar } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const CreateTeamPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Team name is required');
      return;
    }

    setLoading(true);

    try {
      const team = await teamService.createTeam(
        formData.name.trim(),
        formData.description.trim()
      );
      navigate(`/workspace/${team._id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography
            variant="h6"
            color="text.primary"
            sx={{ flexGrow: 1, cursor: 'pointer' }}
            onClick={() => navigate('/')}
            tabIndex={0}
            role="button"
            aria-label="Go to Home"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigate('/');
              }
            }}
          >
            TeamConnect
          </Typography>
          <ThemeToggle />
          <Button variant="outlined" startIcon={<ExitToApp />} onClick={handleLogout} sx={{ ml: 2 }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm">
        <Box sx={{ py: 4 }}>
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Create New Team
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                label="Team Name"
                name="name"
                fullWidth
                required
                value={formData.name}
                onChange={handleChange}
                margin="normal"
                autoFocus
              />
              <TextField
                label="Description (Optional)"
                name="description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={handleChange}
                margin="normal"
              />
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Team'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/teams')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </Box>
            </form>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default CreateTeamPage;

