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

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    callService.initializeSocket(socketUrl);
    
    // Join user room
    callService.joinUserRoom(user._id!);

    // Setup remote stream handler BEFORE starting call
    callService.setRemoteStreamHandler((stream: MediaStream) => {
      console.log('Remote stream received in CallWindow:', stream);
      console.log('Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, id: t.id, readyState: t.readyState, enabled: t.enabled })));
      
      // Update remote stream state immediately
      if (stream && stream.getTracks().length > 0) {
        setRemoteStream(stream);
        setCallStatus('in-call');
        setError(null);
        console.log('Remote stream set in CallWindow state');
      }
    });

    // Setup call event handlers
    callService.on('call-answered', handleCallAnswered);
    callService.on('call-rejected', handleCallRejected);
    callService.on('call-ended', handleCallEnded);
    callService.on('connection-error', (data: { message: string }) => {
      setError(data.message);
      setCallStatus('ended');
    });

    // Start call after socket is ready
    // For incoming calls, wait a bit for offer to arrive
    const initTimer = setTimeout(() => {
      if (isIncoming) {
        // Answer incoming call - will wait for offer if not received yet
        handleAnswerCall();
      } else {
        // Initiate call
        handleInitiateCall();
      }
    }, 200); // Small delay to ensure socket events are set up

    return () => {
      clearTimeout(initTimer);
      callService.off('call-answered');
      callService.off('call-rejected');
      callService.off('call-ended');
      callService.off('connection-error');
      callService.leaveUserRoom(user._id!);
    };
  }, [open, user, otherUserId, isIncoming]);

  useEffect(() => {
    // Update local video stream when it changes
    const localStream = callService.getLocalStream();
    if (localStream && localVideoRef.current) {
      const videoElement = localVideoRef.current;
      videoElement.srcObject = localStream;
      
      // Use event-driven approach instead of setTimeout
      const handleCanPlay = () => {
        videoElement.play().catch(err => {
          console.error('Error playing local video:', err);
        });
      };
      
      videoElement.addEventListener('loadedmetadata', handleCanPlay);
      videoElement.addEventListener('canplay', handleCanPlay);
      
      // Try playing immediately if already ready
      if (videoElement.readyState >= 2) {
        videoElement.play().catch(console.error);
      }
      
      return () => {
        videoElement.removeEventListener('loadedmetadata', handleCanPlay);
        videoElement.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [open, callStatus]);

  useEffect(() => {
    // Update remote video stream when it changes - event-driven approach
    if (remoteStream && remoteVideoRef.current && callType === 'video') {
      const videoElement = remoteVideoRef.current;
      console.log('Setting remote stream to video element:', remoteStream);
      console.log('Remote stream tracks:', remoteStream.getTracks().map(t => ({ kind: t.kind, id: t.id, readyState: t.readyState, enabled: t.enabled })));
      
      // Set the stream
      videoElement.srcObject = remoteStream;
      
      // Force play immediately
      const playVideo = () => {
        videoElement.play().catch(err => {
          console.error('Error playing remote video:', err);
        });
      };
      
      // Use event-driven approach for playing video
      const handleLoadedMetadata = () => {
        console.log('Remote video metadata loaded');
        playVideo();
      };
      
      const handleCanPlay = () => {
        console.log('Remote video can play');
        playVideo();
      };
      
      const handlePlay = () => {
        console.log('Remote video playing successfully');
      };
      
      const handleError = (e: Event) => {
        console.error('Remote video error:', e);
      };
      
      // Add event listeners
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('canplay', handleCanPlay);
      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('error', handleError);
      
      // Try playing immediately
      playVideo();
      
      // Also try after a short delay
      setTimeout(playVideo, 100);
      setTimeout(playVideo, 500);
      
      // Monitor track state changes
      const trackStateCheckers: NodeJS.Timeout[] = [];
      remoteStream.getTracks().forEach(track => {
        const checkTrack = () => {
          console.log('Checking track state:', track.kind, track.readyState, track.enabled);
          if (track.readyState === 'live' && videoElement.paused) {
            console.log('Remote track is live, attempting to play video');
            playVideo();
          } else if (track.readyState !== 'ended' && track.readyState !== 'live') {
            // Check again if not ended and not live yet
            const timeoutId = setTimeout(checkTrack, 100);
            trackStateCheckers.push(timeoutId);
          }
        };
        checkTrack();
      });
      
      return () => {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('canplay', handleCanPlay);
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('error', handleError);
        // Clear all track state checkers
        trackStateCheckers.forEach(timeoutId => clearTimeout(timeoutId));
      };
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
      // Cleanup immediately on error
      callService.cleanup();
      setTimeout(() => {
        onClose();
      }, 3000);
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
    // Ensure cleanup happens
    callService.cleanup();
    onClose();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!open) {
        // Only cleanup if dialog is closed
        callService.cleanup();
      }
    };
  }, [open]);

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

