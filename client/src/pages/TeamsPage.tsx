import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Alert,
  Toolbar,
  CircularProgress
} from '@mui/material';
import { Add, Settings } from '@mui/icons-material';
import teamService from '../services/team.service';
import { Team } from '../types';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import NotificationCenter from '../components/NotificationCenter';
import { ExitToApp } from '@mui/icons-material';
import { AppBar } from '@mui/material';

const TeamsPage = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await teamService.getTeams();
      setTeams(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = () => {
    navigate('/teams/new');
  };

  const handleTeamClick = (teamId: string) => {
    navigate(`/workspace/${teamId}`);
  };

  const handleSettings = (e: React.MouseEvent, teamId: string) => {
    e.stopPropagation();
    navigate(`/teams/${teamId}/settings`);
  };

  const isOwner = (team: Team) => {
    if (!user || !user._id) return false;

    try {
      // Handle ownerId - can be string or populated object
      let ownerIdStr: string;
      if (typeof team.ownerId === 'object' && team.ownerId && '_id' in team.ownerId) {
        // Populated ownerId object
        ownerIdStr = (team.ownerId as any)._id.toString();
      } else if (typeof team.ownerId === 'string') {
        // String ownerId
        ownerIdStr = team.ownerId;
      } else {
        // Try to convert to string
        ownerIdStr = String(team.ownerId);
      }

      // Handle user._id - should be string but ensure it's converted
      const userIdStr = String(user._id);

      // Compare both as strings
      return ownerIdStr === userIdStr;
    } catch (error) {
      console.error('Error checking owner:', error);
      return false;
    }
  };

  const getUserRole = (team: Team) => {
    if (isOwner(team)) return 'Owner';
    if (!user || !user._id) return 'Member';
    const userIdStr = user._id.toString();
    const member = team.members.find((m) => {
      const memberIdStr = typeof m.userId === 'object' && m.userId && '_id' in m.userId
        ? (m.userId as any)._id.toString()
        : m.userId.toString();
      return memberIdStr === userIdStr;
    });
    return member?.role === 'admin' ? 'Admin' : 'Member';
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
          <NotificationCenter />
          <Button variant="outlined" startIcon={<ExitToApp />} onClick={handleLogout} sx={{ ml: 2 }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography 
              variant="h4" 
              component="h1" 
              color="text.primary" 
              sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}
            >
              Teams
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateTeam}
            >
              Create Team
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
          ) : teams.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No teams yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Create your first team to get started
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={handleCreateTeam}>
                Create Team
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {teams.map((team) => (
                <Grid item xs={12} sm={6} md={4} key={team._id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        boxShadow: 4
                      },
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onClick={() => handleTeamClick(team._id)}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Typography variant="h6" component="h2">
                          {team.name}
                        </Typography>
                        {isOwner(team) && (
                          <IconButton
                            size="small"
                            onClick={(e) => handleSettings(e, team._id)}
                            sx={{ ml: 1 }}
                          >
                            <Settings fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {team.description || 'No description'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Your role: {getUserRole(team)} • {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => handleTeamClick(team._id)}>
                        Open Workspace
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>
    </>
  );
};

export default TeamsPage;

