import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  AppBar,
  Toolbar,
  Card,
  CardContent,
  Chip,
  List,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  Divider,
  Avatar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Groups,
  Person,
  ExitToApp,
  Task as TaskIcon,
  Event as EventIcon,
  Add,
  ArrowForward,
  CheckCircle,
  Schedule,
  TrendingUp
} from '@mui/icons-material';
import ThemeToggle from '../components/ThemeToggle';
import NotificationCenter from '../components/NotificationCenter';
import teamService from '../services/team.service';
import taskService from '../services/task.service';
import meetingService from '../services/meeting.service';
import { Team, Task, Meeting } from '../types';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalTasks: 0,
    completedTasks: 0,
    upcomingMeetings: 0,
    myTasks: 0,
    myCompletedTasks: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load all teams
      const teamsData = await teamService.getTeams();
      setTeams(teamsData);

      // Load tasks and meetings from all teams
      const tasksPromises = teamsData.map(team => 
        taskService.getTeamTasks(team._id).catch(() => [])
      );
      const meetingsPromises = teamsData.map(team =>
        meetingService.getTeamMeetings(team._id).catch(() => [])
      );

      const [tasksResults, meetingsResults] = await Promise.all([
        Promise.all(tasksPromises),
        Promise.all(meetingsPromises)
      ]);

      const allTasksData = tasksResults.flat();
      const allMeetingsData = meetingsResults.flat();

      setAllTasks(allTasksData);
      setAllMeetings(allMeetingsData);

      // Calculate statistics
      const userId = user?._id?.toString() || user?._id;
      if (!userId) return;
      
      const myTasks = allTasksData.filter(task => {
        const assignedTo = Array.isArray(task.assignedTo)
          ? task.assignedTo.map(id => id?.toString() || id)
          : [];
        const createdBy = task.createdBy?.toString() || task.createdBy;
        return assignedTo.includes(userId) || createdBy === userId;
      });

      const now = new Date();
      const upcomingMeetings = allMeetingsData.filter(meeting => {
        const startTime = new Date(meeting.startTime);
        return startTime > now && meeting.status === 'scheduled';
      });

      setStats({
        totalTeams: teamsData.length,
        totalTasks: allTasksData.length,
        completedTasks: allTasksData.filter(t => t.status === 'completed').length,
        upcomingMeetings: upcomingMeetings.length,
        myTasks: myTasks.length,
        myCompletedTasks: myTasks.filter(t => t.status === 'completed').length
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getUpcomingMeetings = () => {
    const now = new Date();
    return allMeetings
      .filter(meeting => {
        const startTime = new Date(meeting.startTime);
        return startTime > now && meeting.status === 'scheduled';
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  };

  const getMyRecentTasks = () => {
    const userId = user?._id?.toString() || user?._id;
    if (!userId) return [];
    
    return allTasks
      .filter(task => {
        const assignedTo = Array.isArray(task.assignedTo)
          ? task.assignedTo.map(id => id?.toString() || id)
          : [];
        const createdBy = task.createdBy?.toString() || task.createdBy;
        return assignedTo.includes(userId) || createdBy === userId;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'info';
      case 'todo': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography
            variant="h6"
            color="text.primary"
            sx={{ flexGrow: 1, cursor: 'pointer', fontWeight: 600 }}
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        ) : (
          <>
            {/* Welcome Section */}
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  color: (theme) => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main
                }}
              >
                Welcome back, {user?.username}!
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: (theme) => theme.palette.text.secondary
                }}
              >
                Here's an overview of your teams and activities
              </Typography>
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {stats.totalTeams}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Teams
                        </Typography>
                      </Box>
                      <Groups sx={{ fontSize: 40, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%', bgcolor: 'info.main', color: 'info.contrastText' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {stats.totalTasks}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Total Tasks
                        </Typography>
                      </Box>
                      <TaskIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%', bgcolor: 'success.main', color: 'success.contrastText' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {stats.completedTasks}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Completed
                        </Typography>
                      </Box>
                      <CheckCircle sx={{ fontSize: 40, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ height: '100%', bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {stats.upcomingMeetings}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Upcoming
                        </Typography>
                      </Box>
                      <EventIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              {/* Quick Actions */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Quick Actions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<Groups />}
                      onClick={() => navigate('/teams')}
                      sx={{ py: 1.5, textTransform: 'none', fontWeight: 500 }}
                    >
                      View All Teams
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Add />}
                      onClick={() => navigate('/teams/new')}
                      sx={{ py: 1.5, textTransform: 'none', fontWeight: 500 }}
                    >
                      Create New Team
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Person />}
                      onClick={() => navigate('/profile')}
                      sx={{ py: 1.5, textTransform: 'none', fontWeight: 500 }}
                    >
                      Edit Profile
                    </Button>
                  </Box>
                </Paper>
              </Grid>

              {/* My Teams */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      My Teams
                    </Typography>
                    <Button
                      size="small"
                      endIcon={<ArrowForward />}
                      onClick={() => navigate('/teams')}
                      sx={{ textTransform: 'none' }}
                    >
                      View All
                    </Button>
                  </Box>
                  {teams.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Groups sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        No teams yet
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => navigate('/teams/new')}
                        sx={{ mt: 2, textTransform: 'none' }}
                      >
                        Create Team
                      </Button>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {teams.slice(0, 5).map((team, index) => (
                        <Box key={team._id}>
                          <ListItemButton
                            onClick={() => navigate(`/workspace/${team._id}`)}
                            sx={{ borderRadius: 1, mb: 0.5 }}
                          >
                            <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 40, height: 40 }}>
                              {team.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <ListItemText
                              primary={team.name}
                              secondary={team.description || 'No description'}
                              primaryTypographyProps={{ fontWeight: 500 }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItemButton>
                          {index < Math.min(teams.length, 5) - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  )}
                </Paper>
              </Grid>

              {/* Upcoming Meetings */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Upcoming Meetings
                    </Typography>
                    <Schedule sx={{ color: 'text.secondary' }} />
                  </Box>
                  {getUpcomingMeetings().length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <EventIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        No upcoming meetings
                      </Typography>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {getUpcomingMeetings().map((meeting, index) => (
                        <Box key={meeting._id}>
                          <ListItemButton
                            onClick={() => navigate(`/meeting/${meeting._id}`)}
                            sx={{ borderRadius: 1, mb: 0.5 }}
                          >
                            <ListItemText
                              primary={meeting.title}
                              secondary={formatDate(meeting.startTime)}
                              primaryTypographyProps={{ fontWeight: 500, fontSize: '0.9rem' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            <Chip
                              label={meeting.status}
                              size="small"
                              color="primary"
                              sx={{ ml: 1 }}
                            />
                          </ListItemButton>
                          {index < getUpcomingMeetings().length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  )}
                </Paper>
              </Grid>

              {/* My Tasks */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      My Recent Tasks
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        icon={<TrendingUp />}
                        label={`${stats.myCompletedTasks}/${stats.myTasks} completed`}
                        size="small"
                        color="success"
                      />
                    </Box>
                  </Box>
                  {getMyRecentTasks().length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <TaskIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        No tasks assigned to you
                      </Typography>
                    </Box>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {getMyRecentTasks().map((task, index) => (
                        <Box key={task._id}>
                          <ListItemButton
                            onClick={() => {
                              const team = teams.find(t => t._id === task.teamId);
                              if (team) {
                                navigate(`/workspace/${team._id}`);
                              }
                            }}
                            sx={{ borderRadius: 1, mb: 0.5 }}
                          >
                            <TaskIcon sx={{ mr: 2, color: 'text.secondary' }} />
                            <ListItemText
                              primary={task.title}
                              secondary={task.description || 'No description'}
                              primaryTypographyProps={{ fontWeight: 500 }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                              <Chip
                                label={task.priority}
                                size="small"
                                color={getTaskPriorityColor(task.priority)}
                              />
                              <Chip
                                label={task.status}
                                size="small"
                                color={getTaskStatusColor(task.status)}
                              />
                            </Box>
                          </ListItemButton>
                          {index < getMyRecentTasks().length - 1 && <Divider />}
                        </Box>
                      ))}
                    </List>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </>
  );
};

export default DashboardPage;

