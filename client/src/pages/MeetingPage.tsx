import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import callService from '../services/call.service';
import meetingService from '../services/meeting.service';
import MeetingSetup from '../components/MeetingSetup';
import MeetingRoom from '../components/MeetingRoom';
import { Meeting } from '../types';

const MeetingPage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!meetingId || !user) return;

    // Initialize socket connection
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    callService.initializeSocket(socketUrl);

    const loadMeeting = async () => {
      try {
        setLoading(true);
        const meetingData = await meetingService.getMeeting(meetingId);
        setMeeting(meetingData);
        setError(null);
      } catch (err: any) {
        console.error('Error loading meeting:', err);
        setError(err.message || 'Failed to load meeting');
      } finally {
        setLoading(false);
      }
    };

    loadMeeting();
  }, [meetingId, user]);

  const handleJoin = async () => {
    if (!meetingId || !user || !meeting) return;

    try {
      setJoining(true);
      setError(null);

      // Join meeting via API
      await meetingService.joinMeeting(meetingId);

      // Get participants list
      const participants = meeting.participants || [];
      
      // Join meeting via call service
      await callService.joinMeeting(meetingId, user._id, participants, 'video');

      setIsSetupComplete(true);
    } catch (err: any) {
      console.error('Error joining meeting:', err);
      setError(err.message || 'Failed to join meeting');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => {
    if (meetingId && user) {
      callService.leaveMeeting(meetingId, user._id);
      meetingService.leaveMeeting(meetingId).catch(console.error);
    }
    navigate(-1); // Go back to previous page
  };

  const handleCancel = () => {
    navigate(-1); // Go back to previous page
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error && !meeting) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 3
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Meeting Not Found
          </Typography>
          <Typography>{error}</Typography>
        </Alert>
      </Box>
    );
  }

  if (!meeting) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 3
        }}
      >
        <Alert severity="warning" sx={{ maxWidth: 600 }}>
          Meeting not found or you don't have access to this meeting.
        </Alert>
      </Box>
    );
  }

  // Check if user is a participant
  const isParticipant = meeting.participants.includes(user?._id || '');
  const isOrganizer = meeting.organizerId === user?._id;
  const canJoin = isParticipant || isOrganizer;

  if (!canJoin) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 3
        }}
      >
        <Alert severity="warning" sx={{ maxWidth: 600 }}>
          You are not authorized to join this meeting.
        </Alert>
      </Box>
    );
  }

  if (error && !joining) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          p: 3
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Error
          </Typography>
          <Typography>{error}</Typography>
        </Alert>
      </Box>
    );
  }

  if (!isSetupComplete) {
    return (
      <MeetingSetup
        onJoin={handleJoin}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <MeetingRoom
      meetingId={meetingId!}
      participants={meeting.participants}
      onLeave={handleLeave}
    />
  );
};

export default MeetingPage;

