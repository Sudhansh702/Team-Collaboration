import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import meetingService from '../services/meeting.service';
import { Meeting } from '../types';
import { useStreamVideoClient, StreamCall, StreamTheme } from '@stream-io/video-react-sdk';
import MeetingSetup from '../components/MeetingSetup';
import MeetingRoom from '../components/MeetingRoom';

const MeetingPage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const client = useStreamVideoClient();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [joining, setJoining] = useState(false);
  const [call, setCall] = useState<any>(null);

  useEffect(() => {
    if (!meetingId || !user) return;

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

  useEffect(() => {
    if (!client || !meetingId || !user) return;

    const initializeCall = async () => {
      try {
        // Create or get call using Stream.io
        const streamCall = client.call('default', meetingId);
        
        // Get or create the call
        await streamCall.getOrCreate({
          data: {
            custom: {
              meetingId: meetingId,
              title: meeting?.title || 'Team Meeting',
            },
          },
        });

        setCall(streamCall);
      } catch (err: any) {
        console.error('Error initializing call:', err);
        setError(err.message || 'Failed to initialize call');
      }
    };

    initializeCall();
  }, [client, meetingId, user, meeting]);

  const handleJoin = async () => {
    if (!call) return;

    try {
      setJoining(true);
      setError(null);

      // Join meeting via API
      await meetingService.joinMeeting(meetingId!);
      
      // Join the Stream call
      await call.join();

      setIsSetupComplete(true);
    } catch (err: any) {
      console.error('Error joining meeting:', err);
      setError(err.message || 'Failed to join meeting');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (call) {
      await call.leave();
    }
    if (meetingId && user) {
      meetingService.leaveMeeting(meetingId).catch(console.error);
    }
    navigate(-1);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading || !call) {
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

  return (
    <StreamCall call={call}>
      <StreamTheme>
        {!isSetupComplete ? (
          <MeetingSetup
            onJoin={handleJoin}
            onCancel={handleCancel}
            joining={joining}
          />
        ) : (
          <MeetingRoom
            meetingId={meetingId!}
            onLeave={handleLeave}
          />
        )}
      </StreamTheme>
    </StreamCall>
  );
};

export default MeetingPage;
