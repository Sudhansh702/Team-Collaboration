import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Settings,
  Add,
  Message,
  Lock,
  PersonAdd,
  Search as SearchIcon,
  Videocam,
  Phone
} from '@mui/icons-material';
import channelService from '../services/channel.service';
import teamService from '../services/team.service';
import { Channel, Team } from '../types';
import { useAuth } from '../context/AuthContext';
import MessagesPanel from '../components/MessagesPanel';
import SearchBar from '../components/SearchBar';
import NotificationCenter from '../components/NotificationCenter';
import CallWindow from '../components/CallWindow';
import IncomingCallModal from '../components/IncomingCallModal';
import callService from '../services/call.service';

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
  const [createChannelDialogOpen, setCreateChannelDialogOpen] = useState(false);
  const [channelFormData, setChannelFormData] = useState({
    name: '',
    description: '',
    type: 'public' as 'public' | 'private'
  });
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Call state
  const [incomingCall, setIncomingCall] = useState<{ from: string; callType: 'audio' | 'video'; callerName?: string } | null>(null);
  const [callWindow, setCallWindow] = useState<{ open: boolean; otherUserId: string; otherUserName: string; callType: 'audio' | 'video'; isIncoming: boolean } | null>(null);

  useEffect(() => {
    if (teamId) {
      loadData();
    }
  }, [teamId]);

  // Initialize call service and handle incoming calls
  useEffect(() => {
    if (!user || !user._id) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = callService.initializeSocket(socketUrl);
    
    // Join user room for call signaling
    callService.joinUserRoom(user._id);

    // Listen for incoming calls
    const incomingCallHandler = (data: { from: string; callType: 'audio' | 'video'; teamId?: string }) => {
      // TODO: Fetch caller name from API
      setIncomingCall({
        from: data.from,
        callType: data.callType,
        callerName: 'User' // Will be replaced with actual name
      });
    };

    // Listen for call answered
    const callAnsweredHandler = () => {
      setCallWindow((prev) => {
        if (prev) {
          return { ...prev, open: true };
        }
        return prev;
      });
    };

    // Listen for call rejected/ended
    const callRejectedHandler = () => {
      setIncomingCall(null);
      setCallWindow(null);
    };

    const callEndedHandler = () => {
      setIncomingCall(null);
      setCallWindow(null);
    };

    callService.on('incoming-call', incomingCallHandler);
    callService.on('call-answered', callAnsweredHandler);
    callService.on('call-rejected', callRejectedHandler);
    callService.on('call-ended', callEndedHandler);

    return () => {
      callService.leaveUserRoom(user._id!);
      callService.off('incoming-call');
      callService.off('call-answered');
      callService.off('call-rejected');
      callService.off('call-ended');
    };
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teamData, channelsData] = await Promise.all([
        teamService.getTeamById(teamId!),
        channelService.getTeamChannels(teamId!)
      ]);
      setTeam(teamData);
      setChannels(channelsData);
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

  // Call handlers
  const handleAnswerCall = () => {
    if (!incomingCall || !user) return;
    
    setCallWindow({
      open: true,
      otherUserId: incomingCall.from,
      otherUserName: incomingCall.callerName || 'User',
      callType: incomingCall.callType,
      isIncoming: true
    });
    
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    if (!incomingCall || !user) return;
    
    callService.rejectCall(incomingCall.from, user._id!);
    setIncomingCall(null);
  };

  const handleCloseCallWindow = () => {
    if (callWindow && user) {
      callService.endCall(user._id!, callWindow.otherUserId);
    }
    setCallWindow(null);
    callService.cleanup();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <Typography sx={{ p: 4 }}>Loading workspace...</Typography>
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
            boxSizing: 'border-box'
          }
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            {team.name}
          </Typography>
        </Toolbar>
        <Box sx={{ overflow: 'auto', p: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Channels
            </Typography>
            {team && user && (
              <IconButton 
                size="small" 
                onClick={() => setCreateChannelDialogOpen(true)}
                title="Create Channel"
                color="primary"
              >
                <Add />
              </IconButton>
            )}
          </Box>
          {channels.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No channels yet
              </Typography>
              {(isOwner() || isAdmin()) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Create a channel to get started
                </Typography>
              )}
            </Box>
          ) : (
            <List>
              {channels.map((channel) => (
                <ListItem key={channel._id} disablePadding>
                  <ListItemButton
                    selected={selectedChannel?._id === channel._id}
                    onClick={() => setSelectedChannel(channel)}
                  >
                    <ListItemIcon>
                      {channel.type === 'private' ? <Lock fontSize="small" /> : <Message fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText primary={channel.name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
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
          >
            Team Settings
          </Button>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <Typography variant="h6" color="text.primary" sx={{ flexGrow: 1 }}>
              {selectedChannel ? selectedChannel.name : 'Select a channel'}
            </Typography>
            <IconButton
              color="inherit"
              onClick={() => setSearchOpen(true)}
              sx={{ mr: 1 }}
            >
              <SearchIcon />
            </IconButton>
            <NotificationCenter />
            {/* Test Call Button - Shows first team member */}
            {team && team.members.length > 1 && (
              <IconButton
                color="primary"
                onClick={() => {
                  // Find first team member that's not the current user
                  const otherMember = team.members.find((m) => {
                    const memberId = typeof m.userId === 'object' && m.userId && '_id' in m.userId 
                      ? (m.userId as any)._id.toString() 
                      : m.userId.toString();
                    return memberId !== user?._id?.toString();
                  });
                  
                  if (otherMember && user) {
                    const otherUserId = typeof otherMember.userId === 'object' && otherMember.userId && '_id' in otherMember.userId 
                      ? (otherMember.userId as any)._id.toString() 
                      : otherMember.userId.toString();
                    
                    const otherUserName = typeof otherMember.userId === 'object' && otherMember.userId && 'username' in otherMember.userId
                      ? (otherMember.userId as any).username
                      : 'User';
                    
                    // Open call window
                    setCallWindow({
                      open: true,
                      otherUserId: otherUserId,
                      otherUserName: otherUserName,
                      callType: 'video',
                      isIncoming: false
                    });
                  }
                }}
                sx={{ mr: 1 }}
                title="Test Video Call"
              >
                <Videocam />
              </IconButton>
            )}
            {selectedChannel && selectedChannel.type === 'private' && (isOwner() || isAdmin()) && (
              <Button
                variant="outlined"
                startIcon={<PersonAdd />}
                onClick={() => setAddMemberDialogOpen(true)}
                sx={{ mr: 2, ml: 1 }}
              >
                Add Member
              </Button>
            )}
          </Toolbar>
        </AppBar>
        {searchOpen && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <SearchBar
              onSelectMessage={() => {
                // Navigate to message - you might need to implement this
                setSearchOpen(false);
              }}
              onSelectChannel={(channelId) => {
                const channel = channels.find(c => c._id === channelId);
                if (channel) {
                  setSelectedChannel(channel);
                  setSearchOpen(false);
                }
              }}
              onSelectTeam={(teamId) => {
                navigate(`/workspace/${teamId}`);
                setSearchOpen(false);
              }}
            />
          </Box>
        )}
        <Box sx={{ flexGrow: 1, p: 3, overflow: 'auto', display: searchOpen ? 'none' : 'block' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {!error && channels.length === 0 && !loading && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No channels available. {(isOwner() || isAdmin()) && 'Create a channel to get started!'}
            </Alert>
          )}

          {selectedChannel ? (
            <MessagesPanel
              channelId={selectedChannel._id}
              channelName={selectedChannel.name}
              team={team}
            />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No channel selected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select a channel from the sidebar or create a new one
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Create Channel Dialog */}
      <Dialog open={createChannelDialogOpen} onClose={() => setCreateChannelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Channel</DialogTitle>
        <DialogContent>
          <TextField
            label="Channel Name"
            fullWidth
            required
            value={channelFormData.name}
            onChange={(e) => setChannelFormData({ ...channelFormData, name: e.target.value })}
            margin="normal"
            autoFocus
          />
          <TextField
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            value={channelFormData.description}
            onChange={(e) => setChannelFormData({ ...channelFormData, description: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={channelFormData.type}
              label="Type"
              onChange={(e) =>
                setChannelFormData({ ...channelFormData, type: e.target.value as 'public' | 'private' })
              }
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="private">Private</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateChannelDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateChannel} variant="contained" disabled={!channelFormData.name.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member to Private Channel Dialog */}
      <Dialog open={addMemberDialogOpen} onClose={() => setAddMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Member to Channel</DialogTitle>
        <DialogContent>
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddMemberDialogOpen(false);
            setMemberEmail('');
          }}>Cancel</Button>
          <Button onClick={handleAddMember} variant="contained" disabled={!memberEmail.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          open={!!incomingCall}
          callerName={incomingCall.callerName || 'User'}
          callType={incomingCall.callType}
          onAnswer={handleAnswerCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Call Window */}
      {callWindow && (
        <CallWindow
          open={callWindow.open}
          onClose={handleCloseCallWindow}
          otherUserId={callWindow.otherUserId}
          otherUserName={callWindow.otherUserName}
          callType={callWindow.callType}
          isIncoming={callWindow.isIncoming}
        />
      )}
    </Box>
  );
};

export default WorkspacePage;

