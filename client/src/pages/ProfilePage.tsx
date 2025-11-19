import { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Alert, 
  Toolbar, 
  AppBar,
  Avatar,
  Divider,
  CircularProgress,
  Fade,
  Grid,
  Tooltip
} from '@mui/material';
import { 
  ExitToApp, 
  Person,
  CheckCircle,
  Edit,
  Image as ImageIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import authService from '../services/auth.service';
import ThemeToggle from '../components/ThemeToggle';
import NotificationCenter from '../components/NotificationCenter';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const [formData, setFormData] = useState<{
    username: string;
    avatar: string;
    status: 'online' | 'offline' | 'away' | 'busy';
  }>({
    username: '',
    avatar: '',
    status: 'offline'
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        avatar: user.avatar || '',
        status: user.status || 'offline'
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.name;
    const value = e.target.value;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updateData = {
        username: formData.username || '',
        avatar: formData.avatar || '',
        status: formData.status || 'offline'
      };

      const updatedUser = await authService.updateProfile(updateData);
      updateUser(updatedUser);
      setSuccess('Profile updated successfully!');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = () => {
    return formData.avatar || user?.avatar || '';
  };

  if (!user) {
    return null;
  }

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
          <NotificationCenter />
          <Button variant="outlined" startIcon={<ExitToApp />} onClick={handleLogout} sx={{ ml: 2 }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          {/* Profile Header Section */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              mb: 3,
              borderRadius: 3,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.05) 0%, rgba(255, 255, 255, 0) 100%)'
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={getAvatarUrl()}
                  alt={formData.username || user?.username || 'User'}
                  sx={{
                    width: 120,
                    height: 120,
                    border: '4px solid',
                    borderColor: 'primary.light',
                    bgcolor: 'primary.main',
                    fontSize: '3rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {!getAvatarUrl() && (formData.username || user?.username || 'U').charAt(0).toUpperCase()}
                </Avatar>
                {getAvatarUrl() && (
                  <Tooltip title="Avatar Preview">
                    <CheckCircle 
                      sx={{ 
                        position: 'absolute', 
                        bottom: 0, 
                        right: 0,
                        color: 'success.main',
                        bgcolor: 'background.paper',
                        borderRadius: '50%',
                        fontSize: '1.5rem',
                        border: '2px solid',
                        borderColor: 'background.paper'
                      }} 
                    />
                  </Tooltip>
                )}
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  sx={{ 
                    fontWeight: 600,
                    mb: 1,
                    color: 'text.primary'
                  }}
                >
                  {formData.username || user?.username || 'User'}
                </Typography>

              </Box>
            </Box>
          </Paper>

          {/* Form Section */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4,
              borderRadius: 3,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Person sx={{ color: 'primary.main' }} />
              <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                Profile Information
              </Typography>
            </Box>

            {success && (
              <Fade in={!!success}>
                <Alert 
                  severity="success" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }} 
                  onClose={() => setSuccess('')}
                >
                  {success}
                </Alert>
              </Fade>
            )}

            {error && (
              <Fade in={!!error}>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }} 
                  onClose={() => setError('')}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    value={user.email}
                    disabled
                    helperText="Email cannot be changed"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: 'action.disabledBackground'
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Username"
                    name="username"
                    fullWidth
                    required
                    value={formData.username || ''}
                    onChange={handleChange}
                    helperText="Choose a unique username for your profile"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box>
                    <TextField
                      label="Avatar URL"
                      name="avatar"
                      fullWidth
                      value={formData.avatar || ''}
                      onChange={handleChange}
                      helperText="Enter a URL to your avatar image"
                      InputProps={{
                        startAdornment: (
                          <ImageIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        )
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2
                        }
                      }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setFormData({
                          username: user?.username || '',
                          avatar: user?.avatar || '',
                          status: user?.status || 'offline'
                        });
                        setError('');
                        setSuccess('');
                      }}
                      disabled={loading}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                        px: 3
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={16} sx={{ color: 'primary.contrastText' }} /> : <Edit />}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                        px: 3,
                        boxShadow: '0 2px 8px rgba(138, 43, 226, 0.2)'
                      }}
                    >
                      {loading ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default ProfilePage;

