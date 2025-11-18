import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Alert as MuiAlert
} from '@mui/material';
import { VideocamOff } from '@mui/icons-material';
import {
  DeviceSettings,
  VideoPreview,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';

interface MeetingSetupProps {
  onJoin: () => void;
  onCancel?: () => void;
  joining?: boolean;
}

const MeetingSetup: React.FC<MeetingSetupProps> = ({ onJoin, onCancel, joining = false }) => {
  const [isMicCamToggled, setIsMicCamToggled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCall();
  const { useCallEndedAt, useCallStartsAt } = useCallStateHooks();
  const callStartsAt = useCallStartsAt();
  const callEndedAt = useCallEndedAt();

  if (!call) {
    throw new Error('useCall must be used within a StreamCall component.');
  }

  const callTimeNotArrived = callStartsAt && new Date(callStartsAt) > new Date();
  const callHasEnded = !!callEndedAt;

  useEffect(() => {
    if (isMicCamToggled) {
      call.camera.disable();
      call.microphone.disable();
    } else {
      call.camera.enable();
      call.microphone.enable();
    }
  }, [isMicCamToggled, call]);

  if (callTimeNotArrived) {
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
        <MuiAlert severity="info" sx={{ maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Meeting Not Started
          </Typography>
          <Typography>
            Your meeting has not started yet. It is scheduled for{' '}
            {callStartsAt.toLocaleString()}
          </Typography>
        </MuiAlert>
      </Box>
    );
  }

  if (callHasEnded) {
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
        <MuiAlert severity="warning" sx={{ maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Call Ended
          </Typography>
          <Typography>The call has been ended by the host.</Typography>
        </MuiAlert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        bgcolor: 'background.default',
        gap: 3
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            Setup Your Meeting
          </Typography>

          {error && (
            <MuiAlert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </MuiAlert>
          )}

          {/* Video Preview using Stream.io */}
          <Box
            sx={{
              width: '100%',
              maxWidth: 500,
              mx: 'auto',
              mb: 3,
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'black',
              position: 'relative',
              aspectRatio: '16/9'
            }}
          >
            <VideoPreview />
            {isMicCamToggled && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white'
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <VideocamOff sx={{ fontSize: 48, mb: 1 }} />
                  <Typography>Camera Off</Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Device Settings */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3, alignItems: 'center' }}>
            <DeviceSettings />
          </Box>

          {/* Join with mic/camera off */}
          <FormControlLabel
            control={
              <Checkbox
                checked={isMicCamToggled}
                onChange={(e) => setIsMicCamToggled(e.target.checked)}
              />
            }
            label="Join with microphone and camera off"
            sx={{ mb: 3, justifyContent: 'center' }}
          />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {onCancel && (
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={joining}
                sx={{ minWidth: 120 }}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={onJoin}
              disabled={joining}
              sx={{ minWidth: 120 }}
            >
              {joining ? 'Joining...' : 'Join Meeting'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MeetingSetup;
