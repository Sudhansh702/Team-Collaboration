import { useState, useEffect } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Alert, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import authService from '../services/auth.service';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
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

  const handleStatusChange = (e: SelectChangeEvent<'online' | 'offline' | 'away' | 'busy'>) => {
    const newStatus = e.target.value as 'online' | 'offline' | 'away' | 'busy';
    setFormData({
      ...formData,
      status: newStatus || 'offline'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updatedUser = await authService.updateProfile(formData);
      updateUser(updatedUser);
      setSuccess('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Paper elevation={2} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Profile Settings
          </Typography>

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={user.email}
              margin="normal"
              disabled
              helperText="Email cannot be changed"
            />
            <TextField
              label="Username"
              name="username"
              fullWidth
              required
              value={formData.username || ''}
              onChange={handleChange}
              margin="normal"
            />
            <TextField
              label="Avatar URL"
              name="avatar"
              fullWidth
              value={formData.avatar || ''}
              onChange={handleChange}
              margin="normal"
              helperText="Enter a URL to your avatar image"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status || 'offline'}
                label="Status"
                onChange={handleStatusChange}
              >
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="offline">Offline</MenuItem>
                <MenuItem value="away">Away</MenuItem>
                <MenuItem value="busy">Busy</MenuItem>
              </Select>
            </FormControl>
            <Button
              type="submit"
              variant="contained"
              sx={{ mt: 3 }}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default ProfilePage;

