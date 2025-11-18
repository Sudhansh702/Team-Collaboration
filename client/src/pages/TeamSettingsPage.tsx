import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress
} from '@mui/material';
import { Delete, PersonAdd } from '@mui/icons-material';
import teamService from '../services/team.service';
import { Team } from '../types';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { ExitToApp } from '@mui/icons-material';
import { AppBar } from '@mui/material';
import { Toolbar } from '@mui/material';

const TeamSettingsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'member' as 'admin' | 'member'
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    if (id) {
      loadTeam();
    }
  }, [id]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const data = await teamService.getTeamById(id!);
      setTeam(data);
      setFormData({
        name: data.name,
        description: data.description || ''
      });
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setError('');
      const updatedTeam = await teamService.updateTeam(id!, {
        name: formData.name.trim(),
        description: formData.description.trim()
      });
      setTeam(updatedTeam);
      alert('Team updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update team');
    }
  };

  const handleDelete = async () => {
    try {
      await teamService.deleteTeam(id!);
      navigate('/teams');
    } catch (err: any) {
      setError(err.message || 'Failed to delete team');
      setDeleteDialogOpen(false);
    }
  };

  const handleInvite = async () => {
    try {
      setError('');
      const updatedTeam = await teamService.addMember(
        id!,
        inviteData.email.trim(),
        inviteData.role
      );
      setTeam(updatedTeam);
      setInviteDialogOpen(false);
      setInviteData({ email: '', role: 'member' });
      alert('Member added successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      const updatedTeam = await teamService.removeMember(id!, memberId);
      setTeam(updatedTeam);
      alert('Member removed successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    }
  };

  const handleUpdateRole = async (memberId: string, role: 'admin' | 'member') => {
    try {
      const updatedTeam = await teamService.updateMemberRole(id!, memberId, role);
      setTeam(updatedTeam);
      alert('Member role updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update member role');
    }
  };

  const isOwner = () => {
    if (!team || !user || !user._id) return false;

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

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      </Container>
    );
  }

  if (!team) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Alert severity="error">Team not found</Alert>
        </Box>
      </Container>
    );
  }

  if (!isOwner()) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Alert severity="error">Only team owners can access settings</Alert>
        </Box>
      </Container>
    );
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
          <Button variant="outlined" startIcon={<ExitToApp />} onClick={handleLogout} sx={{ ml: 2 }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Paper elevation={2} sx={{ p: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Team Settings
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)} sx={{ mb: 3 }}>
              <Tab label="General" />
              <Tab label="Members" />
              <Tab label="Analytics" />
            </Tabs>

            {tabValue === 0 && (
              <Box>
                <TextField
                  label="Team Name"
                  name="name"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  margin="normal"
                />
                <TextField
                  label="Description"
                  name="description"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  margin="normal"
                />
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button variant="contained" onClick={handleUpdate}>
                    Save Changes
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Delete Team
                  </Button>
                </Box>
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Team Members</Typography>
                  {isOwner() && (
                    <Button
                      variant="contained"
                      startIcon={<PersonAdd />}
                      onClick={() => setInviteDialogOpen(true)}
                    >
                      Add Member
                    </Button>
                  )}
                </Box>
                <List>
                  {/* Display Owner separately */}
                  {(() => {
                    const ownerIdStr = typeof team.ownerId === 'object' && team.ownerId && '_id' in team.ownerId
                      ? (team.ownerId as any)._id.toString()
                      : team.ownerId.toString();
                    const ownerMember = team.members.find((m) => {
                      const memberIdStr = typeof m.userId === 'object' && m.userId && '_id' in m.userId
                        ? (m.userId as any)._id.toString()
                        : m.userId.toString();
                      return memberIdStr === ownerIdStr;
                    });
                    const ownerUser = typeof team.ownerId === 'object' && team.ownerId && 'username' in team.ownerId
                      ? (team.ownerId as any).username || (team.ownerId as any).email
                      : 'Owner';

                    return (
                      <ListItem>
                        <ListItemText
                          primary={ownerUser}
                          secondary={`Team Owner • Joined: ${ownerMember?.joinedAt ? new Date(ownerMember.joinedAt).toLocaleDateString() : 'N/A'}`}
                        />
                        <Chip label="Owner" color="primary" size="small" />
                      </ListItem>
                    );
                  })()}
                  {/* Display other members (excluding owner) */}
                  {team.members
                    .filter((m) => {
                      const ownerIdStr = typeof team.ownerId === 'object' && team.ownerId && '_id' in team.ownerId
                        ? (team.ownerId as any)._id.toString()
                        : team.ownerId.toString();
                      const memberIdStr = typeof m.userId === 'object' && m.userId && '_id' in m.userId
                        ? (m.userId as any)._id.toString()
                        : m.userId.toString();
                      return memberIdStr !== ownerIdStr;
                    })
                    .map((member) => {
                      const memberUserId = typeof member.userId === 'object' && member.userId && 'username' in member.userId
                        ? (member.userId as any).username || (member.userId as any).email
                        : `User ID: ${member.userId}`;
                      return (
                        <ListItem key={typeof member.userId === 'object' && member.userId && '_id' in member.userId
                          ? (member.userId as any)._id.toString()
                          : member.userId.toString()}>
                          <ListItemText
                            primary={memberUserId}
                            secondary={`Role: ${member.role} • Joined: ${new Date(member.joinedAt).toLocaleDateString()}`}
                          />
                          {isOwner() && (
                            <ListItemSecondaryAction>
                              <FormControl size="small" sx={{ minWidth: 100, mr: 1 }}>
                                <Select
                                  value={member.role === 'owner' ? 'admin' : member.role}
                                  onChange={(e) =>
                                    handleUpdateRole(
                                      typeof member.userId === 'object' && member.userId && '_id' in member.userId
                                        ? (member.userId as any)._id.toString()
                                        : member.userId.toString(),
                                      e.target.value as 'admin' | 'member'
                                    )
                                  }
                                  disabled={!isOwner()}
                                >
                                  <MenuItem value="admin">Admin</MenuItem>
                                  <MenuItem value="member">Member</MenuItem>
                                </Select>
                              </FormControl>
                              <IconButton
                                edge="end"
                                onClick={() => handleRemoveMember(
                                  typeof member.userId === 'object' && member.userId && '_id' in member.userId
                                    ? (member.userId as any)._id.toString()
                                    : member.userId.toString()
                                )}
                                color="error"
                                disabled={!isOwner()}
                              >
                                <Delete />
                              </IconButton>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                      );
                    })}
                </List>
              </Box>
            )}

            {tabValue === 2 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Team Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  View detailed analytics and insights for this team.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate(`/teams/${id}/analytics`)}
                >
                  View Full Analytics Dashboard
                </Button>
              </Box>
            )}
          </Paper>

          {/* Delete Dialog */}
          <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete this team? This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleDelete} color="error" variant="contained">
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          {/* Invite Dialog */}
          <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}>
            <DialogTitle>Add Member</DialogTitle>
            <DialogContent>
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                margin="normal"
                sx={{ mt: 2 }}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Role</InputLabel>
                <Select
                  value={inviteData.role}
                  label="Role"
                  onChange={(e) =>
                    setInviteData({ ...inviteData, role: e.target.value as 'admin' | 'member' })
                  }
                >
                  <MenuItem value="member">Member</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} variant="contained">
                Add
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Container>
    </>
  );
};

export default TeamSettingsPage;

