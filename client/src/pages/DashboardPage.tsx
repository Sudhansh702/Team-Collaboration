import { Container, Typography, Box, Button, Paper, Grid, AppBar, Toolbar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Groups, Person, ExitToApp } from '@mui/icons-material';
import ThemeToggle from '../components/ThemeToggle';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" color="text.primary" sx={{ flexGrow: 1 }}>
            TeamConnect
          </Typography>
          <ThemeToggle />
          <Button variant="outlined" startIcon={<ExitToApp />} onClick={handleLogout} sx={{ ml: 2 }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Paper elevation={2} sx={{ p: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" component="h1">
                Welcome to TeamConnect
              </Typography>
            </Box>
          <Typography variant="body1" gutterBottom>
            Hello, {user?.username}!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 4 }}>
            Manage your teams, collaborate with your team members, and stay organized.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                sx={{ p: 3, cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
                onClick={() => navigate('/teams')}
              >
                <Groups sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Teams
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View and manage your teams
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper
                sx={{ p: 3, cursor: 'pointer', '&:hover': { boxShadow: 4 } }}
                onClick={() => navigate('/profile')}
              >
                <Person sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Profile
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your profile settings
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
    </>
  );
};

export default DashboardPage;

