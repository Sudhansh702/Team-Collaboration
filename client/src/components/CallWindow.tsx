import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Typography,
  Avatar,
  Chip,
  Alert
} from '@mui/material';
import {
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff
} from '@mui/icons-material';
import callService from '../services/call.service';
import { useAuth } from '../context/AuthContext';

interface CallWindowProps {
  open: boolean;
  onClose: () => void;
  otherUserId: string;
  otherUserName: string;
  callType: 'audio' | 'video';
  isIncoming: boolean;
}

const CallWindow: React.FC<CallWindowProps> = ({
  open,
  onClose,
  otherUserId,
  otherUserName,
  callType,
  isIncoming
}) => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'in-call' | 'ended'>('connecting');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open || !user) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5555';
    callService.initializeSocket(socketUrl);
    
    // Join user room
    callService.joinUserRoom(user._id!);

    // Setup call event handlers
    callService.on('call-answered', handleCallAnswered);
    callService.on('call-rejected', handleCallRejected);
    callService.on('call-ended', handleCallEnded);

    // Setup remote stream handler BEFORE starting call
    callService.setRemoteStreamHandler((stream: MediaStream) => {
      console.log('Remote stream received:', stream, 'Active tracks:', stream.getTracks().filter(t => t.readyState === 'live'));
      
      // Only update if stream has active tracks
      if (stream.getTracks().length > 0) {
        setRemoteStream(stream);
        setCallStatus('in-call');
        setError(null);
        
        // Force update video element
        setTimeout(() => {
          if (remoteVideoRef.current && stream) {
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current.play()
              .then(() => console.log('Remote video playing'))
              .catch(err => {
                console.error('Error playing remote video:', err);
                // Retry after delay
                setTimeout(() => {
                  if (remoteVideoRef.current && stream) {
                    remoteVideoRef.current.play().catch(console.error);
                  }
                }, 1000);
              });
          }
        }, 100);
      }
    });

    // Start call after a short delay to ensure socket is ready
    const startCallTimer = setTimeout(() => {
      if (isIncoming) {
        // Answer incoming call
        handleAnswerCall();
      } else {
        // Initiate call
        handleInitiateCall();
      }
    }, 100);

    return () => {
      clearTimeout(startCallTimer);
      callService.off('call-answered');
      callService.off('call-rejected');
      callService.off('call-ended');
      callService.leaveUserRoom(user._id!);
    };
  }, [open, user, otherUserId, isIncoming]);

  useEffect(() => {
    // Update local video stream
    const localStream = callService.getLocalStream();
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(err => {
        console.error('Error playing local video:', err);
      });
    }
  }, [open, callStatus]);

  useEffect(() => {
    // Update remote video stream when it changes
    if (remoteStream && remoteVideoRef.current) {
      console.log('Setting remote stream to video element:', remoteStream);
      remoteVideoRef.current.srcObject = remoteStream;
      // Ensure video plays
      const playPromise = remoteVideoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Remote video playing successfully');
          })
          .catch(err => {
            console.error('Error playing remote video:', err);
            // Try again after a short delay
            setTimeout(() => {
              if (remoteVideoRef.current && remoteStream) {
                remoteVideoRef.current.play().catch(console.error);
              }
            }, 500);
          });
      }
    } else if (remoteVideoRef.current && callType === 'video') {
      // Clear if no stream
      remoteVideoRef.current.srcObject = null;
    }
  }, [remoteStream, callType]);

  const handleInitiateCall = async () => {
    try {
      setError(null);
      setCallStatus('ringing');
      await callService.initiateCall(
        user!._id!,
        otherUserId,
        callType
      );
    } catch (error: any) {
      console.error('Error initiating call:', error);
      const errorMessage = error.message || 'Failed to initiate call. Please check your camera/microphone permissions.';
      setError(errorMessage);
      setCallStatus('ended');
    }
  };

  const handleAnswerCall = async () => {
    try {
      setError(null);
      setCallStatus('connecting');
      await callService.answerCall(
        otherUserId, // from (caller)
        user!._id!,  // to (us)
        callType
      );
      // Don't set status to 'in-call' here - wait for remote stream
    } catch (error: any) {
      console.error('Error answering call:', error);
      const errorMessage = error.message || 'Failed to answer call. Please check your camera/microphone permissions.';
      setError(errorMessage);
      setCallStatus('ended');
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const handleCallAnswered = () => {
    setCallStatus('in-call');
    setError(null);
  };

  const handleCallRejected = () => {
    setCallStatus('ended');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleCallEnded = () => {
    setCallStatus('ended');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleEndCall = () => {
    if (user) {
      callService.endCall(user._id!, otherUserId);
    }
    callService.cleanup();
    onClose();
  };

  const handleToggleMute = () => {
    const muted = callService.toggleMute();
    setIsMuted(!muted);
  };

  const handleToggleVideo = () => {
    if (callType === 'video') {
      const videoOff = callService.toggleVideo();
      setIsVideoOff(!videoOff);
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'in-call':
        return 'In Call';
      case 'ended':
        return 'Call Ended';
      default:
        return '';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleEndCall}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.default',
          minHeight: '500px'
        }
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {error && (
          <Box sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}
        <Box sx={{ position: 'relative', width: '100%', height: '500px', bgcolor: 'black' }}>
          {/* Remote Video */}
          {callType === 'video' && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                backgroundColor: 'black'
              }}
              onLoadedMetadata={() => {
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.play().catch(console.error);
                }
              }}
            />
          )}
          
          {/* Placeholder when no remote stream */}
          {callType === 'video' && !remoteStream && callStatus === 'in-call' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'white'
              }}
            >
              <Typography>Waiting for video...</Typography>
            </Box>
          )}

          {/* Local Video Preview (for video calls) */}
          {callType === 'video' && (
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: '200px',
                height: '150px',
                borderRadius: 2,
                overflow: 'hidden',
                border: '2px solid white'
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)' // Mirror effect
                }}
                onLoadedMetadata={() => {
                  if (localVideoRef.current) {
                    localVideoRef.current.play().catch(console.error);
                  }
                }}
              />
            </Box>
          )}

          {/* Audio Call UI */}
          {callType === 'audio' && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'white'
              }}
            >
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  bgcolor: 'primary.main',
                  fontSize: '3rem',
                  mb: 2
                }}
              >
                {otherUserName.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h5" sx={{ mb: 1 }}>
                {otherUserName}
              </Typography>
              <Chip
                label={getStatusText()}
                color={callStatus === 'in-call' ? 'success' : 'default'}
                sx={{ mb: 2 }}
              />
            </Box>
          )}

          {/* Call Controls */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              p: 2,
              display: 'flex',
              justifyContent: 'center',
              gap: 2
            }}
          >
            {/* Mute/Unmute */}
            <IconButton
              onClick={handleToggleMute}
              sx={{
                bgcolor: isMuted ? 'error.main' : 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                '&:hover': {
                  bgcolor: isMuted ? 'error.dark' : 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              {isMuted ? <MicOff /> : <Mic />}
            </IconButton>

            {/* Video Toggle (only for video calls) */}
            {callType === 'video' && (
              <IconButton
                onClick={handleToggleVideo}
                sx={{
                  bgcolor: isVideoOff ? 'error.main' : 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: isVideoOff ? 'error.dark' : 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                {isVideoOff ? <VideocamOff /> : <Videocam />}
              </IconButton>
            )}

            {/* End Call */}
            <IconButton
              onClick={handleEndCall}
              sx={{
                bgcolor: 'error.main',
                color: 'white',
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

export default CallWindow;

