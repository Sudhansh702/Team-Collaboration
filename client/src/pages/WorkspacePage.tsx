import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  CircularProgress,
  Fade
} from '@mui/material';
import {
  Settings,
  Add,
  Message,
  Lock,
  PersonAdd,
  Videocam,
  Task as TaskIcon
} from '@mui/icons-material';
import channelService from '../services/channel.service';
import teamService from '../services/team.service';
import { Channel, Team } from '../types';
import { useAuth } from '../context/AuthContext';
import MessagesPanel from '../components/MessagesPanel';
import SearchBar from '../components/SearchBar';
import NotificationCenter from '../components/NotificationCenter';
import TaskList from '../components/TaskList';
import MeetingList from '../components/MeetingList';
import ThemeToggle from '../components/ThemeToggle';

const DRAWER_WIDTH = 240;

const WorkspacePage = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [createChannelDialogOpen, setCreateChannelDialogOpen] = useState(false);
  const [channelFormData, setChannelFormData] = useState({
    name: '',
    description: '',
    type: 'public' as 'public' | 'private'
  });
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  const [workspaceTab, setWorkspaceTab] = useState<'messages' | 'tasks' | 'meetings'>('messages');

  useEffect(() => {
    if (teamId) {
      loadData();
    }
  }, [teamId]);

  // Socket.io setup for real-time unread count updates
  useEffect(() => {
    if (!teamId || !user) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected in WorkspacePage');
      // Join team room for unread count updates
      newSocket.emit('join-team', teamId);
    });

    // Listen for new messages to update unread counts
    newSocket.on('new-message', async (message: any) => {
      // Only update if message is not from current user and not in currently selected channel
      if (message.senderId?._id !== user._id && message.channelId?._id !== selectedChannel?._id) {
        try {
          // Refresh unread counts
          const counts = await channelService.getUnreadCountsForTeam(teamId!);
          setUnreadCounts(counts);
        } catch (err) {
          console.error('Failed to update unread counts:', err);
        }
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [teamId, user, selectedChannel]);


  const loadData = async () => {
    try {
      setLoading(true);
      const [teamData, channelsData, unreadCountsData] = await Promise.all([
        teamService.getTeamById(teamId!),
        channelService.getTeamChannels(teamId!),
        channelService.getUnreadCountsForTeam(teamId!)
      ]);
      setTeam(teamData);
      setChannels(channelsData);
      setUnreadCounts(unreadCountsData);
      if (channelsData.length > 0 && !selectedChannel) {
        setSelectedChannel(channelsData[0]);
      }
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    try {
      setError('');
      const channel = await channelService.createChannel(
        channelFormData.name.trim(),
        teamId!,
        channelFormData.description.trim(),
        channelFormData.type
      );
      setChannels([...channels, channel]);
      setCreateChannelDialogOpen(false);
      setChannelFormData({ name: '', description: '', type: 'public' });
      setSelectedChannel(channel);
      alert('Channel created successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to create channel');
    }
  };

  const handleAddMember = async () => {
    if (!selectedChannel || !memberEmail.trim()) {
      return;
    }
    try {
      setError('');
      const updatedChannel = await channelService.addMember(
        selectedChannel._id,
        memberEmail.trim()
      );
      // Update the channel in the list
      setChannels(channels.map(ch => 
        ch._id === updatedChannel._id ? updatedChannel : ch
      ));
      // Update selected channel
      setSelectedChannel(updatedChannel);
      setAddMemberDialogOpen(false);
      setMemberEmail('');
      alert('Member added successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    }
  };

  const isOwner = () => {
    if (!team || !user || !user._id) {
      console.log('isOwner: missing data', { hasTeam: !!team, hasUser: !!user, hasUserId: !!(user && user._id) });
      return false;
    }
    
    try {
      // Handle ownerId - can be string or populated object
      let ownerIdStr: string;
      
      // Check if ownerId is an object with _id property (populated)
      if (team.ownerId && typeof team.ownerId === 'object' && '_id' in team.ownerId) {
        // Populated ownerId object
        ownerIdStr = String((team.ownerId as any)._id);
      } else if (typeof team.ownerId === 'string') {
        // String ownerId
        ownerIdStr = team.ownerId;
      } else if (team.ownerId) {
        // Try to convert to string
        ownerIdStr = String(team.ownerId);
      } else {
        console.log('isOwner: ownerId is null/undefined');
        return false;
      }
      
      // Handle user._id - ensure it's a string
      const userIdStr = String(user._id);
      
      // Debug logging
      console.log('isOwner check:', {
        ownerId: ownerIdStr,
        userId: userIdStr,
        match: ownerIdStr === userIdStr,
        teamOwnerIdType: typeof team.ownerId,
        userType: typeof user._id
      });
      
      // Compare both as strings
      return ownerIdStr === userIdStr;
    } catch (error) {
      console.error('Error checking owner:', error, { team, user });
      return false;
    }
  };

  const isAdmin = () => {
    if (isOwner()) return true;
    if (!team || !user || !user._id) return false;
    const userIdStr = user._id.toString();
    const member = team.members.find((m) => {
      const memberIdStr = typeof m.userId === 'object' && m.userId && '_id' in m.userId 
        ? (m.userId as any)._id.toString() 
        : m.userId.toString();
      return memberIdStr === userIdStr;
    });
    return member?.role === 'admin' || member?.role === 'owner';
  };


  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 3,
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress size={48} sx={{ color: 'primary.main' }} />
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
          Loading workspace...
        </Typography>
      </Box>
    );
  }

  if (!team) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="error">Team not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: 'none'
          }
        }}
      >
        <Toolbar 
          sx={{ 
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            minHeight: '64px !important'
          }}
        >
          <Typography 
            variant="h6" 
            noWrap 
            component="div"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              fontSize: '1.1rem',
              letterSpacing: '-0.01em'
            }}
          >
            {team.name}
          </Typography>
        </Toolbar>
        <Box sx={{ overflow: 'auto', p: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, px: 0.5 }}>
            <Typography 
              variant="subtitle2" 
              color="text.secondary"
              sx={{ 
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              Channels
            </Typography>
            {team && user && (
              <IconButton 
                size="small" 
                onClick={() => setCreateChannelDialogOpen(true)}
                title="Create Channel"
                sx={{
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'primary.dark',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <Add fontSize="small" />
              </IconButton>
            )}
          </Box>
          {channels.length === 0 ? (
            <Box 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Message sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                No channels yet
              </Typography>
              {(isOwner() || isAdmin()) && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Create a channel to get started
                </Typography>
              )}
            </Box>
          ) : (
            <List sx={{ px: 0.5 }}>
              {channels.map((channel) => {
                const unreadCount = unreadCounts[channel._id] || 0;
                const isSelected = selectedChannel?._id === channel._id;
                return (
                  <ListItem 
                    key={channel._id} 
                    disablePadding
                    sx={{ 
                      mb: 0.5,
                      '&:last-child': { mb: 0 }
                    }}
                  >
                    <ListItemButton
                      selected={isSelected}
                      onClick={async () => {
                        setSelectedChannel(channel);
                        // Mark channel as read when selecting
                        if (unreadCount > 0) {
                          try {
                            await channelService.markChannelAsRead(channel._id);
                            // Update local unread counts
                            setUnreadCounts(prev => ({ ...prev, [channel._id]: 0 }));
                          } catch (err) {
                            console.error('Failed to mark channel as read:', err);
                          }
                        }
                      }}
                      sx={{
                        borderRadius: 2,
                        py: 1,
                        px: 1.5,
                        transition: 'all 0.2s ease',
                        '&.Mui-selected': {
                          backgroundColor: 'primary.light',
                          color: 'primary.dark',
                          '&:hover': {
                            backgroundColor: 'primary.light',
                          },
                          '& .MuiListItemIcon-root': {
                            color: 'primary.dark',
                          },
                        },
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          transform: 'translateX(2px)',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: isSelected ? 'primary.dark' : 'text.secondary' }}>
                        {channel.type === 'private' ? (
                          <Lock fontSize="small" />
                        ) : (
                          <Message fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                            <Typography 
                              variant="body2" 
                              component="span"
                              sx={{
                                fontWeight: unreadCount > 0 ? 600 : 400,
                                color: isSelected ? 'primary.dark' : 'text.primary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                              }}
                            >
                              {channel.name}
                            </Typography>
                            {unreadCount > 0 && (
                              <Box
                                sx={{
                                  minWidth: unreadCount > 99 ? 36 : 24,
                                  height: 20,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: 'error.main',
                                  color: 'error.contrastText',
                                  borderRadius: '10px',
                                  px: unreadCount > 99 ? 1 : 0.75,
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  lineHeight: 1,
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                                  animation: unreadCount > 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                                  '@keyframes pulse': {
                                    '0%, 100%': {
                                      opacity: 1,
                                    },
                                    '50%': {
                                      opacity: 0.8,
                                    },
                                  },
                                }}
                              >
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </Box>
                            )}
                          </Box>
                        }
                        sx={{ 
                          m: 0,
                          '& .MuiListItemText-primary': {
                            overflow: 'visible',
                          }
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
        <Box 
          sx={{ 
            p: 1.5, 
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default'
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Settings />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (teamId && team && user) {
                navigate(`/teams/${teamId}/settings`);
              }
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              py: 1.25,
              borderRadius: 2,
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'primary.light',
                color: 'primary.dark'
              },
              transition: 'all 0.2s ease'
            }}
          >
            Team Settings
          </Button>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <AppBar 
          position="static" 
          elevation={0} 
          sx={{ 
            bgcolor: 'background.paper', 
            borderBottom: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}
        >
          <Toolbar sx={{ gap: 2, py: 1.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="h6" 
                color="text.primary" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: '1.25rem',
                  letterSpacing: '-0.01em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {selectedChannel ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedChannel.type === 'private' ? (
                      <Lock fontSize="small" sx={{ color: 'text.secondary' }} />
                    ) : (
                      <Message fontSize="small" sx={{ color: 'text.secondary' }} />
                    )}
                    {selectedChannel.name}
                  </Box>
                ) : (
                  'Select a channel'
                )}
              </Typography>
              {selectedChannel && selectedChannel.description && (
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    display: 'block',
                    mt: 0.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {selectedChannel.description}
                </Typography>
              )}
            </Box>
            <Box sx={{ flexGrow: 1, maxWidth: 400 }}>
              <SearchBar
                onSelectMessage={(_messageId, channelId) => {
                  const channel = channels.find(c => c._id === channelId);
                  if (channel) {
                    setSelectedChannel(channel);
                    setWorkspaceTab('messages');
                  }
                }}
                onSelectChannel={(channelId) => {
                  const channel = channels.find(c => c._id === channelId);
                  if (channel) {
                    setSelectedChannel(channel);
                    setWorkspaceTab('messages');
                  }
                }}
                onSelectTeam={(teamId) => {
                  navigate(`/workspace/${teamId}`);
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {selectedChannel && selectedChannel.type === 'private' && (isOwner() || isAdmin()) && (
                <Button
                  variant="outlined"
                  startIcon={<PersonAdd />}
                  onClick={() => setAddMemberDialogOpen(true)}
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: 500,
                    borderRadius: 2,
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'primary.light',
                      color: 'primary.dark'
                    }
                  }}
                >
                  Add Member
                </Button>
              )}
              <ThemeToggle />
              <NotificationCenter />
            </Box>
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto', bgcolor: 'background.default' }}>
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

          {!error && channels.length === 0 && !loading && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              No channels available. {(isOwner() || isAdmin()) && 'Create a channel to get started!'}
            </Alert>
          )}

          {selectedChannel ? (
            <Fade in={!!selectedChannel}>
              <Box>
                {/* Tabs for Messages, Tasks, and Meetings */}
                <Tabs
                  value={workspaceTab}
                  onChange={(_e, newValue) => setWorkspaceTab(newValue)}
                  sx={{ 
                    mb: 3,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      fontWeight: 500,
                      minHeight: 48,
                      fontSize: '0.95rem',
                      color: 'text.secondary',
                      '&.Mui-selected': {
                        color: 'primary.main',
                        fontWeight: 600
                      },
                      '&:hover': {
                        color: 'primary.main',
                        bgcolor: 'primary.light',
                        borderRadius: 1
                      },
                      transition: 'all 0.2s ease'
                    },
                    '& .MuiTabs-indicator': {
                      height: 3,
                      borderRadius: '3px 3px 0 0',
                      bgcolor: 'primary.main'
                    }
                  }}
                >
                  <Tab
                    icon={<Message fontSize="small" />}
                    iconPosition="start"
                    label="Messages"
                    value="messages"
                    sx={{ gap: 1 }}
                  />
                  <Tab
                    icon={<TaskIcon fontSize="small" />}
                    iconPosition="start"
                    label="Tasks"
                    value="tasks"
                    sx={{ gap: 1 }}
                  />
                  <Tab
                    icon={<Videocam fontSize="small" />}
                    iconPosition="start"
                    label="Meetings"
                    value="meetings"
                    sx={{ gap: 1 }}
                  />
                </Tabs>

              {/* Content based on selected tab */}
              {workspaceTab === 'messages' ? (
                <MessagesPanel
                  channelId={selectedChannel._id}
                  channelName={selectedChannel.name}
                  team={team}
                />
              ) : workspaceTab === 'tasks' ? (
                <TaskList
                  team={team}
                  channelId={selectedChannel._id}
                />
              ) : (
                <MeetingList team={team} />
              )}
              </Box>
            </Fade>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                textAlign: 'center',
                p: 4
              }}
            >
              <Message sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.3, mb: 2 }} />
              <Typography variant="h5" color="text.secondary" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                No channel selected
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
                Select a channel from the sidebar to start messaging, or create a new channel to get started
              </Typography>
              {(isOwner() || isAdmin()) && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateChannelDialogOpen(true)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 500,
                    borderRadius: 2,
                    px: 3,
                    py: 1.25
                  }}
                >
                  Create Channel
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Create Channel Dialog */}
      <Dialog 
        open={createChannelDialogOpen} 
        onClose={() => setCreateChannelDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            pb: 2,
            fontWeight: 600,
            fontSize: '1.5rem',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          Create Channel
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            label="Channel Name"
            fullWidth
            required
            value={channelFormData.name}
            onChange={(e) => setChannelFormData({ ...channelFormData, name: e.target.value })}
            margin="normal"
            autoFocus
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
          <TextField
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            value={channelFormData.description}
            onChange={(e) => setChannelFormData({ ...channelFormData, description: e.target.value })}
            margin="normal"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={channelFormData.type}
              label="Type"
              onChange={(e) =>
                setChannelFormData({ ...channelFormData, type: e.target.value as 'public' | 'private' })
              }
              sx={{
                borderRadius: 2
              }}
            >
              <MenuItem value="public">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Message fontSize="small" />
                  Public
                </Box>
              </MenuItem>
              <MenuItem value="private">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Lock fontSize="small" />
                  Private
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => setCreateChannelDialogOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 500, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateChannel} 
            variant="contained" 
            disabled={!channelFormData.name.trim()}
            sx={{ 
              textTransform: 'none', 
              fontWeight: 500, 
              borderRadius: 2,
              px: 3
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member to Private Channel Dialog */}
      <Dialog 
        open={addMemberDialogOpen} 
        onClose={() => setAddMemberDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            pb: 2,
            fontWeight: 600,
            fontSize: '1.5rem',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          Add Member to Channel
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            label="Member Email"
            type="email"
            fullWidth
            required
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            margin="normal"
            autoFocus
            helperText="Enter the email of a team member to add to this private channel"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={() => {
              setAddMemberDialogOpen(false);
              setMemberEmail('');
            }}
            sx={{ textTransform: 'none', fontWeight: 500, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddMember} 
            variant="contained" 
            disabled={!memberEmail.trim()}
            sx={{ 
              textTransform: 'none', 
              fontWeight: 500, 
              borderRadius: 2,
              px: 3
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default WorkspacePage;

