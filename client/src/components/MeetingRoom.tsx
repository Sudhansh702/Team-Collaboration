import { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Button,
  Drawer,
  Tooltip,
  Chip
} from '@mui/material';
import {
  CallEnd,
  People,
  ViewModule,
  Person
} from '@mui/icons-material';
import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
interface MeetingRoomProps {
  meetingId: string;
  onLeave: () => void;
}

type LayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const MeetingRoom: React.FC<MeetingRoomProps> = ({ meetingId, onLeave }) => {
  const [layout, setLayout] = useState<LayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const { useCallCallingState, useCallMembers } = useCallStateHooks();
  const callingState = useCallCallingState();
  const members = useCallMembers();

  if (callingState !== CallingState.JOINED) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh'
        }}
      >
        <Typography>Connecting...</Typography>
      </Box>
    );
  }

  const CallLayout = () => {
    switch (layout) {
      case 'grid':
        return <PaginatedGridLayout />;
      case 'speaker-right':
        return <SpeakerLayout participantsBarPosition="left" />;
      default:
        return <SpeakerLayout participantsBarPosition="right" />;
    }
  };

  const participantCount = members.length;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        bgcolor: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Top bar with meeting info */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bgcolor: 'rgba(0, 0, 0, 0.7)',
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10
        }}
      >
        <Typography variant="body2" sx={{ color: 'white', ml: 2 }}>
          Meeting: {meetingId.slice(0, 8)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={`${participantCount} participants`}
            size="small"
            sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
          />
        </Box>
      </Box>

      {/* Video area */}
      <Box sx={{ flex: 1, pt: 5, overflow: 'auto' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            maxWidth: '1400px',
            mx: 'auto'
          }}
        >
          <CallLayout />
        </Box>
      </Box>

      {/* Participants drawer */}
      <Drawer
        anchor="right"
        open={showParticipants}
        onClose={() => setShowParticipants(false)}
        PaperProps={{
          sx: {
            width: 300,
            bgcolor: 'background.paper'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Participants ({participantCount})
          </Typography>
          <CallParticipantsList onClose={() => setShowParticipants(false)} />
        </Box>
      </Drawer>

      {/* Controls */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          p: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          zIndex: 10
        }}
      >
        {/* Stream.io Call Controls */}
        <CallControls onLeave={onLeave} />

        {/* Layout toggle */}
        <Tooltip title="Switch layout">
          <IconButton
            onClick={() => {
              if (layout === 'grid') {
                setLayout('speaker-left');
              } else if (layout === 'speaker-left') {
                setLayout('speaker-right');
              } else {
                setLayout('grid');
              }
            }}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            {layout === 'grid' ? <Person /> : <ViewModule />}
          </IconButton>
        </Tooltip>

        {/* Call Stats */}
        <CallStatsButton />

        {/* Participants list */}
        <Tooltip title="Participants">
          <IconButton
            onClick={() => setShowParticipants(true)}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            <People />
          </IconButton>
        </Tooltip>

        {/* Leave meeting */}
        <Button
          variant="contained"
          color="error"
          startIcon={<CallEnd />}
          onClick={onLeave}
          sx={{ ml: 2 }}
        >
          Leave
        </Button>
      </Box>
    </Box>
  );
};

export default MeetingRoom;
