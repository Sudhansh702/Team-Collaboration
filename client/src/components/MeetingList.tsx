import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Event as EventIcon,
  Edit,
  Delete,
  MoreVert,
  Videocam,
  AccessTime,
  Person,
  PersonAdd
} from '@mui/icons-material';
import meetingService from '../services/meeting.service';
import MeetingModal from './MeetingModal';
import { Meeting, Team } from '../types';
import { useAuth } from '../context/AuthContext';

interface MeetingListProps {
  team: Team;
}

const MeetingList: React.FC<MeetingListProps> = ({ team }) => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected for meetings');
      // Join team room for meeting updates
      newSocket.emit('join-team-room', team._id);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Listen for real-time meeting updates
    newSocket.on('meeting-created', (meeting: Meeting) => {
      if (meeting.teamId === team._id) {
        setMeetings((prev) => [...prev, meeting].sort((a, b) => 
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ));
      }
    });

    newSocket.on('meeting-updated', (meeting: Meeting) => {
      if (meeting.teamId === team._id) {
        setMeetings((prev) =>
          prev.map((m) => (m._id === meeting._id ? meeting : m)).sort((a, b) => 
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          )
        );
      }
    });

    newSocket.on('meeting-deleted', (data: { meetingId: string }) => {
      setMeetings((prev) => prev.filter((m) => m._id !== data.meetingId));
    });

    return () => {
      newSocket.emit('leave-team-room', team._id);
      newSocket.disconnect();
    };
  }, [team._id]);

  useEffect(() => {
    loadMeetings();
  }, [team._id]);

  useEffect(() => {
    filterMeetings();
  }, [meetings, searchQuery, statusFilter]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      setError('');
      const teamMeetings = await meetingService.getTeamMeetings(team._id);
      setMeetings(teamMeetings);
    } catch (err: any) {
      setError(err.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const filterMeetings = () => {
    let filtered = [...meetings];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(meeting =>
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(meeting => meeting.status === statusFilter);
    }

    // Sort by start time
    filtered.sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    setFilteredMeetings(filtered);
  };

  const handleCreateMeeting = () => {
    setEditingMeeting(null);
    setMeetingModalOpen(true);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setMeetingModalOpen(true);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await meetingService.deleteMeeting(meetingId);
      await loadMeetings();
    } catch (err: any) {
      setError(err.message || 'Failed to delete meeting');
    }
  };

  const handleMeetingModalSuccess = () => {
    loadMeetings();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isPastMeeting = (meeting: Meeting) => {
    return new Date(meeting.endTime) < new Date();
  };

  const isOrganizer = (meeting: Meeting) => {
    const userId = user?._id?.toString() || user?._id;
    const organizerId = meeting.organizerId?.toString() || meeting.organizerId;
    return userId === organizerId;
  };

  const canEdit = (meeting: Meeting) => {
    return isOrganizer(meeting) && !isPastMeeting(meeting);
  };

  const canStartMeeting = (meeting: Meeting) => {
    if (meeting.status !== 'scheduled') return false;
    const now = new Date();
    const startTime = new Date(meeting.startTime);
    const endTime = new Date(meeting.endTime);
    // Can start 5 minutes before scheduled time
    const fiveMinutesBefore = new Date(startTime.getTime() - 5 * 60 * 1000);
    return now >= fiveMinutesBefore && now <= endTime;
  };

  const canCompleteMeeting = (meeting: Meeting) => {
    return meeting.status === 'in-progress' || meeting.status === 'scheduled';
  };

  const canCancelMeeting = (meeting: Meeting) => {
    return isOrganizer(meeting) && (meeting.status === 'scheduled' || meeting.status === 'in-progress');
  };

  const handleStatusChange = async (meetingId: string, newStatus: Meeting['status']) => {
    try {
      await meetingService.updateMeeting(meetingId, { status: newStatus });
      await loadMeetings();
    } catch (err: any) {
      setError(err.message || 'Failed to update meeting status');
    }
  };

  const handleStartMeeting = async (meeting: Meeting) => {
    try {
      setError('');
      await meetingService.startMeeting(meeting._id);
      await loadMeetings();
      // Navigate to meeting page
      window.location.href = `/meeting/${meeting._id}`;
    } catch (err: any) {
      setError(err.message || 'Failed to start meeting');
    }
  };

  const handleJoinMeeting = async (meeting: Meeting) => {
    try {
      setError('');
      // Navigate to meeting page (it will handle joining)
      window.location.href = `/meeting/${meeting._id}`;
    } catch (err: any) {
      setError(err.message || 'Failed to join meeting');
    }
  };

  const handleCompleteMeeting = async (meeting: Meeting) => {
    await handleStatusChange(meeting._id, 'completed');
  };

  const handleCancelMeeting = async (meeting: Meeting) => {
    if (window.confirm('Are you sure you want to cancel this meeting?')) {
      await handleStatusChange(meeting._id, 'cancelled');
    }
  };

  // Get participant info from team members
  const getParticipantInfo = (participantId: string) => {
    const participantIdStr = participantId?.toString() || participantId;
    const member = team.members?.find((m) => {
      const memberId = typeof m.userId === 'object' && m.userId && '_id' in m.userId
        ? (m.userId as any)._id.toString()
        : m.userId.toString();
      return memberId === participantIdStr;
    });

    if (member && typeof member.userId === 'object' && member.userId) {
      return {
        id: participantIdStr,
        username: (member.userId as any).username || 'User',
        avatar: (member.userId as any).avatar || '',
        email: (member.userId as any).email || ''
      };
    }

    return {
      id: participantIdStr,
      username: 'User',
      avatar: '',
      email: ''
    };
  };

  const getOrganizerInfo = (meeting: Meeting) => {
    return getParticipantInfo(meeting.organizerId);
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon />
            <Typography variant="h6">
              Meetings
              {meetings.length > 0 && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  ({meetings.length})
                </Typography>
              )}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateMeeting}
          >
            Create Meeting
          </Button>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search meetings..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="in-progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Meetings List */}
          {filteredMeetings.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {meetings.length === 0 ? 'No meetings yet' : 'No meetings match your filters'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {meetings.length === 0
                  ? 'Create your first meeting to get started'
                  : 'Try adjusting your search or filters'}
              </Typography>
              {meetings.length === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateMeeting}
                  sx={{ mt: 2 }}
                >
                  Create Meeting
                </Button>
              )}
            </Paper>
          ) : (
            <Box>
              {filteredMeetings.map((meeting) => (
                <Card key={meeting._id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h6">{meeting.title}</Typography>
                          <Chip
                            label={meeting.status}
                            size="small"
                            color={
                              meeting.status === 'scheduled' ? 'primary' :
                              meeting.status === 'in-progress' ? 'warning' :
                              meeting.status === 'completed' ? 'success' : 'default'
                            }
                          />
                        </Box>
                        {meeting.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {meeting.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTime fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(meeting.startTime)} - {formatDate(meeting.endTime)}
                            </Typography>
                          </Box>
                          {/* Meeting will use our platform's video calling */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Videocam fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              Video call available via platform
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Organizer and Participants */}
                        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              Organizer:
                            </Typography>
                            <Chip
                              label={getOrganizerInfo(meeting).username}
                              size="small"
                              avatar={
                                getOrganizerInfo(meeting).avatar ? (
                                  <Avatar src={getOrganizerInfo(meeting).avatar} sx={{ width: 24, height: 24 }} />
                                ) : (
                                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                                    {getOrganizerInfo(meeting).username.charAt(0).toUpperCase()}
                                  </Avatar>
                                )
                              }
                              color="primary"
                            />
                          </Box>
                          
                          {meeting.participants && meeting.participants.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <PersonAdd fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                Participants ({meeting.participants.length}):
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {meeting.participants.slice(0, 5).map((participantId) => {
                                  const participant = getParticipantInfo(participantId);
                                  const isOrg = participantId === meeting.organizerId;
                                  return (
                                    <Tooltip key={participantId} title={participant.username + (isOrg ? ' (Organizer)' : '')}>
                                      <Chip
                                        label={participant.username}
                                        size="small"
                                        avatar={
                                          participant.avatar ? (
                                            <Avatar src={participant.avatar} sx={{ width: 24, height: 24 }} />
                                          ) : (
                                            <Avatar sx={{ width: 24, height: 24, bgcolor: isOrg ? 'primary.main' : 'default' }}>
                                              {participant.username.charAt(0).toUpperCase()}
                                            </Avatar>
                                          )
                                        }
                                        color={isOrg ? 'primary' : 'default'}
                                      />
                                    </Tooltip>
                                  );
                                })}
                                {meeting.participants.length > 5 && (
                                  <Chip
                                    label={`+${meeting.participants.length - 5} more`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {/* Status Action Buttons */}
                        {meeting.status === 'in-progress' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => handleJoinMeeting(meeting)}
                          >
                            Join Meeting
                          </Button>
                        )}
                        {canStartMeeting(meeting) && meeting.status !== 'in-progress' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleStartMeeting(meeting)}
                          >
                            Start Meeting
                          </Button>
                        )}
                        {canCompleteMeeting(meeting) && meeting.status !== 'in-progress' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            onClick={() => handleCompleteMeeting(meeting)}
                          >
                            Complete
                          </Button>
                        )}
                        {canCancelMeeting(meeting) && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleCancelMeeting(meeting)}
                          >
                            Cancel
                          </Button>
                        )}
                        {canEdit(meeting) && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setSelectedMeeting(meeting);
                              setMenuAnchor(e.currentTarget);
                            }}
                          >
                            <MoreVert />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </>
      )}

      {/* Meeting Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => {
          setMenuAnchor(null);
          setSelectedMeeting(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (selectedMeeting) {
              handleEditMeeting(selectedMeeting);
            }
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedMeeting) {
              if (window.confirm('Are you sure you want to delete this meeting?')) {
                handleDeleteMeeting(selectedMeeting._id);
              }
            }
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Meeting Modal */}
      <MeetingModal
        open={meetingModalOpen}
        onClose={() => {
          setMeetingModalOpen(false);
          setEditingMeeting(null);
        }}
        team={team}
        meeting={editingMeeting}
        onSuccess={handleMeetingModalSuccess}
      />
    </Box>
  );
};

export default MeetingList;
