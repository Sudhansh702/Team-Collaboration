import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Typography,
  Paper,
  Avatar,
  Button,
  Chip
} from '@mui/material';
import {
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  VolumeUp,
  VolumeOff
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
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open || !user) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = callService.initializeSocket(socketUrl);
    
    // Join user room
    callService.joinUserRoom(user._id!);

    // Setup call event handlers
    callService.on('call-answered', handleCallAnswered);
    callService.on('call-rejected', handleCallRejected);
    callService.on('call-ended', handleCallEnded);

    // Setup remote stream handler
    callService.setRemoteStreamHandler((stream: MediaStream) => {
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    });

    // Start call
    if (isIncoming) {
      // Answer incoming call
      handleAnswerCall();
    } else {
      // Initiate call
      handleInitiateCall();
    }

    return () => {
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
    }

    // Update remote video stream
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleInitiateCall = async () => {
    try {
      setCallStatus('ringing');
      await callService.initiateCall(
        user!._id!,
        otherUserId,
        callType
      );
    } catch (error) {
      console.error('Error initiating call:', error);
      alert('Failed to initiate call. Please check your camera/microphone permissions.');
      onClose();
    }
  };

  const handleAnswerCall = async () => {
    try {
      setCallStatus('connecting');
      await callService.answerCall(
        user!._id!,
        otherUserId,
        callType
      );
      setCallStatus('in-call');
    } catch (error) {
      console.error('Error answering call:', error);
      alert('Failed to answer call. Please check your camera/microphone permissions.');
      onClose();
    }
  };

  const handleCallAnswered = () => {
    setCallStatus('in-call');
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
        <Box sx={{ position: 'relative', width: '100%', height: '500px', bgcolor: 'black' }}>
          {/* Remote Video */}
          {callType === 'video' && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
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

