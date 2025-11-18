import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Message as MessageIcon,
  Task as TaskIcon,
  Event as EventIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import teamService from '../services/team.service';
import messageService from '../services/message.service';
import taskService from '../services/task.service';
import meetingService from '../services/meeting.service';
import { Team, Message, Task, Meeting } from '../types';

const AnalyticsPage = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalMeetings: 0,
    activeMembers: 0,
    messagesLast7Days: 0,
    tasksLast7Days: 0,
    meetingsLast7Days: 0
  });
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    if (teamId) {
      loadData();
    }
  }, [teamId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [teamData, channelsData] = await Promise.all([
        teamService.getTeamById(teamId!),
        teamId ? (await import('../services/channel.service')).default.getTeamChannels(teamId) : []
      ]);

      setTeam(teamData);

      // Load all messages from all channels
      const allMessages: Message[] = [];
      for (const channel of channelsData) {
        try {
          const messages = await messageService.getChannelMessages(channel._id);
          allMessages.push(...messages);
        } catch (err) {
          console.error(`Failed to load messages for channel ${channel._id}:`, err);
        }
      }

      // Load tasks
      const tasks = await taskService.getTeamTasks(teamId!);

      // Load meetings
      const meetings = await meetingService.getTeamMeetings(teamId!);

      // Calculate statistics
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const messagesLast7Days = allMessages.filter(
        (m) => new Date(m.createdAt) >= sevenDaysAgo
      ).length;

      const tasksLast7Days = tasks.filter(
        (t) => new Date(t.createdAt) >= sevenDaysAgo
      ).length;

      const completedTasks = tasks.filter((t) => t.status === 'completed').length;

      const meetingsLast7Days = meetings.filter(
        (m) => new Date(m.startTime) >= sevenDaysAgo
      ).length;

      // Get active members (users who have sent messages in last 7 days)
      const activeMemberIds = new Set(
        messagesLast7Days > 0
          ? allMessages
              .filter((m) => new Date(m.createdAt) >= sevenDaysAgo)
              .map((m) => (typeof m.senderId === 'string' ? m.senderId : m.senderId._id))
          : []
      );

      setStats({
        totalMessages: allMessages.length,
        totalTasks: tasks.length,
        completedTasks,
        totalMeetings: meetings.length,
        activeMembers: activeMemberIds.size || (teamData?.members?.length || 0),
        messagesLast7Days,
        tasksLast7Days,
        meetingsLast7Days
      });

      // Get recent items
      setRecentMessages(
        allMessages
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      );
      setRecentTasks(
        tasks
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      );
      setRecentMeetings(
        meetings
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
          .slice(0, 5)
      );
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !team) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error || 'Team not found'}
        </Alert>
      </Container>
    );
  }

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ color: (theme) => theme.palette.text.primary }}
        >
          Analytics - {team.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: (theme) => theme.palette.text.secondary }}
        >
          Team activity and performance metrics
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MessageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Messages</Typography>
              </Box>
              <Typography variant="h4">{stats.totalMessages}</Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.messagesLast7Days} in last 7 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TaskIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Tasks</Typography>
              </Box>
              <Typography variant="h4">{stats.totalTasks}</Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.completedTasks} completed ({completionRate}%)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EventIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Meetings</Typography>
              </Box>
              <Typography variant="h4">{stats.totalMeetings}</Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.meetingsLast7Days} in last 7 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Members</Typography>
              </Box>
              <Typography variant="h4">{stats.activeMembers}</Typography>
              <Typography variant="caption" color="text.secondary">
                Out of {team.members?.length || 0} total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Messages */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Messages
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Channel</TableCell>
                    <TableCell>Sender</TableCell>
                    <TableCell>Preview</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentMessages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No messages yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentMessages.map((message) => (
                      <TableRow key={message._id}>
                        <TableCell>
                          <Typography variant="body2">Channel</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {typeof message.senderId === 'string'
                              ? 'Unknown'
                              : message.senderId.username || message.senderId.email}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {message.content.substring(0, 50)}
                            {message.content.length > 50 ? '...' : ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Tasks */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Tasks
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No tasks yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentTasks.map((task) => (
                      <TableRow key={task._id}>
                        <TableCell>
                          <Typography variant="body2">{task.title}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor:
                                task.status === 'completed'
                                  ? 'success.light'
                                  : task.status === 'in-progress'
                                  ? 'warning.light'
                                  : 'grey.300',
                              color:
                                task.status === 'completed'
                                  ? 'success.dark'
                                  : task.status === 'in-progress'
                                  ? 'warning.dark'
                                  : 'text.secondary'
                            }}
                          >
                            {task.status}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {task.priority}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Meetings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Meetings
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Participants</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentMeetings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No meetings yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentMeetings.map((meeting) => (
                      <TableRow key={meeting._id}>
                        <TableCell>
                          <Typography variant="body2">{meeting.title}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(meeting.startTime).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(meeting.endTime).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {meeting.participants?.length || 0} participants
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            sx={{
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor:
                                meeting.status === 'scheduled'
                                  ? 'info.light'
                                  : meeting.status === 'completed'
                                  ? 'success.light'
                                  : 'grey.300',
                              color:
                                meeting.status === 'scheduled'
                                  ? 'info.dark'
                                  : meeting.status === 'completed'
                                  ? 'success.dark'
                                  : 'text.secondary'
                            }}
                          >
                            {meeting.status}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AnalyticsPage;

