import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Avatar,
  IconButton
} from '@mui/material';
import {
  Call,
  CallEnd,
  Videocam,
  Phone
} from '@mui/icons-material';

interface IncomingCallModalProps {
  open: boolean;
  callerName: string;
  callType: 'audio' | 'video';
  onAnswer: () => void;
  onReject: () => void;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  open,
  callerName,
  callType,
  onAnswer,
  onReject
}) => {
  useEffect(() => {
    // Play ringtone or notification sound
    // You can add audio notification here if needed
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onReject}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 3
        }
      }}
    >
      <DialogContent>
        <Box sx={{ textAlign: 'center' }}>
          {/* Caller Avatar */}
          <Avatar
            sx={{
              width: 120,
              height: 120,
              bgcolor: 'primary.main',
              fontSize: '3rem',
              mx: 'auto',
              mb: 2
            }}
          >
            {callerName.charAt(0).toUpperCase()}
          </Avatar>

          {/* Caller Name */}
          <Typography variant="h5" sx={{ mb: 1 }}>
            {callerName}
          </Typography>

          {/* Call Type */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {callType === 'video' ? 'Video Call' : 'Audio Call'}
          </Typography>

          {/* Call Icon */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            {callType === 'video' ? (
              <Videocam sx={{ fontSize: 60, color: 'primary.main' }} />
            ) : (
              <Phone sx={{ fontSize: 60, color: 'primary.main' }} />
            )}
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            {/* Answer Button */}
            <IconButton
              onClick={onAnswer}
              sx={{
                bgcolor: 'success.main',
                color: 'white',
                width: 64,
                height: 64,
                '&:hover': {
                  bgcolor: 'success.dark'
                }
              }}
            >
              <Call />
            </IconButton>

            {/* Reject Button */}
            <IconButton
              onClick={onReject}
              sx={{
                bgcolor: 'error.main',
                color: 'white',
                width: 64,
                height: 64,
                '&:hover': {
                  bgcolor: 'error.dark'
                }
              }}
            >
              <CallEnd />
            </IconButton>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;

