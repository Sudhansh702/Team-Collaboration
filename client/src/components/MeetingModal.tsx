import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Alert,
  FormHelperText
} from '@mui/material';
import {
  Event as EventIcon,
  AccessTime
} from '@mui/icons-material';
import meetingService from '../services/meeting.service';
import { Meeting, Team } from '../types';
import { useAuth } from '../context/AuthContext';

interface MeetingModalProps {
  open: boolean;
  onClose: () => void;
  team: Team;
  meeting?: Meeting | null; // If provided, edit mode; otherwise, create mode
  onSuccess?: () => void;
}

const MeetingModal: React.FC<MeetingModalProps> = ({
  open,
  onClose,
  team,
  meeting,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    participants: [] as string[],
    status: 'scheduled' as 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
  });

  useEffect(() => {
    if (meeting) {
      // Edit mode - populate form with meeting data
      const startDate = new Date(meeting.startTime);
      const endDate = new Date(meeting.endTime);
      
      setFormData({
        title: meeting.title,
        description: meeting.description || '',
        startTime: startDate.toISOString().slice(0, 16), // Format for datetime-local input
        endTime: endDate.toISOString().slice(0, 16),
        participants: Array.isArray(meeting.participants) ? meeting.participants : [],
        status: meeting.status
      });
    } else {
      // Create mode - reset form
      const now = new Date();
      const defaultStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000); // 1 hour duration
      
      setFormData({
        title: '',
        description: '',
        startTime: defaultStart.toISOString().slice(0, 16),
        endTime: defaultEnd.toISOString().slice(0, 16),
        participants: user?._id ? [user._id] : [],
        status: 'scheduled'
      });
    }
    setError('');
  }, [meeting, open, user?._id]);

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }

    if (!formData.startTime || !formData.endTime) {
      setError('Start time and end time are required');
      return false;
    }

    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    const now = new Date();

    if (start >= end) {
      setError('End time must be after start time');
      return false;
    }

    if (!meeting && start < now) {
      setError('Start time cannot be in the past');
      return false;
    }

    if (formData.participants.length === 0) {
      setError('At least one participant is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (meeting) {
        // Update existing meeting
        await meetingService.updateMeeting(meeting._id, {
          title: formData.title,
          description: formData.description,
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString(),
          participants: formData.participants,
          status: formData.status
        });
      } else {
        // Create new meeting
        await meetingService.createMeeting(
          formData.title,
          team._id,
          new Date(formData.startTime).toISOString(),
          new Date(formData.endTime).toISOString(),
          formData.description,
          formData.participants
        );
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!meeting) return;
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;

    try {
      setLoading(true);
      setError('');
      await meetingService.deleteMeeting(meeting._id);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete meeting');
    } finally {
      setLoading(false);
    }
  };

  // Get team members for participant selection
  const teamMembers = team.members || [];
  const memberOptions = teamMembers.map((member) => {
    const userId = typeof member.userId === 'object' && member.userId && '_id' in member.userId
      ? (member.userId as any)._id.toString()
      : member.userId.toString();
    const username = typeof member.userId === 'object' && member.userId && 'username' in member.userId
      ? (member.userId as any).username
      : 'User';
    const avatar = typeof member.userId === 'object' && member.userId && 'avatar' in member.userId
      ? (member.userId as any).avatar
      : '';
    return { id: userId, username, avatar };
  });

  // Ensure organizer is always in participants
  const organizerId = meeting?.organizerId || user?._id;
  const allParticipants = formData.participants.includes(organizerId || '')
    ? formData.participants
    : [...formData.participants, organizerId || ''].filter(Boolean);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventIcon />
          <Typography variant="h6">
            {meeting ? 'Edit Meeting' : 'Create Meeting'}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Title */}
          <TextField
            label="Title"
            required
            fullWidth
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter meeting title"
          />

          {/* Description */}
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter meeting description (optional)"
          />

          {/* Date and Time */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Start Time"
              type="datetime-local"
              required
              fullWidth
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
              InputProps={{
                startAdornment: <AccessTime sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
            <TextField
              label="End Time"
              type="datetime-local"
              required
              fullWidth
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
              InputProps={{
                startAdornment: <AccessTime sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Box>

          {/* Participants */}
          <FormControl fullWidth>
            <InputLabel>Participants</InputLabel>
            <Select
              multiple
              value={allParticipants}
              label="Participants"
              onChange={(e) => {
                const selected = e.target.value as string[];
                // Ensure organizer is always included
                const participants = selected.includes(organizerId || '')
                  ? selected
                  : [...selected, organizerId || ''].filter(Boolean);
                setFormData({ ...formData, participants });
              }}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((userId) => {
                    const member = memberOptions.find(m => m.id === userId);
                    const isOrganizer = userId === organizerId;
                    return (
                      <Chip
                        key={userId}
                        label={isOrganizer ? `${member?.username || 'User'} (Organizer)` : (member?.username || 'User')}
                        size="small"
                        color={isOrganizer ? 'primary' : 'default'}
                      />
                    );
                  })}
                </Box>
              )}
            >
              {memberOptions.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.username} {member.id === organizerId && '(Organizer)'}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              The organizer is automatically included and cannot be removed
            </FormHelperText>
          </FormControl>


          {/* Status (only for editing) */}
          {meeting && (
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Box>
            {meeting && (
              <Button
                color="error"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
          </Box>
          <Box>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !formData.title.trim()}
            >
              {loading ? 'Saving...' : meeting ? 'Update' : 'Create'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default MeetingModal;

