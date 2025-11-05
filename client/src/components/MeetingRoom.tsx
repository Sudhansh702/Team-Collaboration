import { useState, useEffect, useRef } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Avatar,
  Chip,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  People,
  ViewModule,
  Person
} from '@mui/icons-material';
import callService from '../services/call.service';
import { useAuth } from '../context/AuthContext';

interface MeetingRoomProps {
  meetingId: string;
  participants: string[];
  onLeave: () => void;
}

type LayoutType = 'grid' | 'speaker';

const MeetingRoom: React.FC<MeetingRoomProps> = ({ meetingId, participants, onLeave }) => {
  const { user } = useAuth();
  const [layout, setLayout] = useState<LayoutType>('speaker');
  const [showParticipantsList, setShowParticipantsList] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [participantList, setParticipantList] = useState<string[]>([]);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'info' | 'warning' | 'error' } | null>(null);
  const [connectionErrors] = useState<Map<string, string>>(new Map());
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    if (!user) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    callService.initializeSocket(socketUrl);

    // Setup meeting remote stream handler
    callService.setMeetingRemoteStreamHandler((userId: string, stream: MediaStream) => {
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(userId, stream);
        return newMap;
      });
    });

    // Setup participant handler
    callService.setMeetingParticipantHandler((participants: string[]) => {
      const previousCount = participantList.length;
      const newCount = participants.length;
      
      setParticipantList(participants);
      
      // Show notification when participant count changes
      if (previousCount > 0 && newCount > previousCount) {
        setNotification({ message: 'A participant joined the meeting', severity: 'info' });
      } else if (previousCount > 0 && newCount < previousCount) {
        setNotification({ message: 'A participant left the meeting', severity: 'info' });
      }
    });

    // Update local video
    const updateLocalVideo = () => {
      const localStream = callService.getLocalStream();
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    };

    updateLocalVideo();
    const interval = setInterval(updateLocalVideo, 500);

    // Meeting duration timer
    const startTime = Date.now();
    const durationInterval = setInterval(() => {
      setMeetingDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(durationInterval);
    };
  }, [user]);

  useEffect(() => {
    // Update video elements when streams change
    remoteStreams.forEach((stream, userId) => {
      const videoRef = videoRefs.current.get(userId);
      if (videoRef) {
        videoRef.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const handleToggleMute = () => {
    const muted = callService.toggleMute();
    setIsMuted(!muted);
  };

  const handleToggleVideo = () => {
    const videoOff = callService.toggleVideo();
    setIsVideoOff(!videoOff);
  };

  const handleLeave = () => {
    if (user) {
      callService.leaveMeeting(meetingId, user._id);
    }
    onLeave();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoRef = (userId: string): HTMLVideoElement | null => {
    if (!videoRefs.current.has(userId)) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      videoRefs.current.set(userId, video);
    }
    return videoRefs.current.get(userId) || null;
  };

  const renderGridLayout = () => {
    const allParticipants = participantList.length > 0 ? participantList : participants;
    const participantCount = allParticipants.length + 1; // +1 for local video
    
    // Calculate grid dimensions
    const cols = participantCount <= 2 ? 2 : participantCount <= 4 ? 2 : participantCount <= 9 ? 3 : 4;
    const rows = Math.ceil(participantCount / cols);

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: 2,
          p: 2,
          height: '100%',
          width: '100%'
        }}
      >
        {/* Local video */}
        <Box
          sx={{
            position: 'relative',
            bgcolor: 'black',
            borderRadius: 2,
            overflow: 'hidden',
            aspectRatio: '16/9'
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
              transform: 'scaleX(-1)'
            }}
          />
          {isVideoOff && (
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
                bgcolor: 'rgba(0, 0, 0, 0.7)'
              }}
            >
              <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </Box>
          )}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              px: 1,
              py: 0.5,
              borderRadius: 1
            }}
          >
            <Typography variant="caption" sx={{ color: 'white' }}>
              {user?.username || 'You'} {isMuted && <MicOff sx={{ fontSize: 12 }} />}
            </Typography>
          </Box>
        </Box>

        {/* Remote videos */}
        {allParticipants.map((participantId) => {
          const stream = remoteStreams.get(participantId);
          const videoRef = getVideoRef(participantId);
          
          return (
            <Box
              key={participantId}
              sx={{
                position: 'relative',
                bgcolor: 'black',
                borderRadius: 2,
                overflow: 'hidden',
                aspectRatio: '16/9'
              }}
            >
              {stream && videoRef ? (
                <video
                  ref={(el) => {
                    if (el) {
                      videoRefs.current.set(participantId, el);
                      el.srcObject = stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0, 0, 0, 0.7)'
                  }}
                >
                  <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
                    {participantId.slice(0, 1).toUpperCase()}
                  </Avatar>
                </Box>
              )}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1
                }}
              >
                <Typography variant="caption" sx={{ color: 'white' }}>
                  Participant {participantId.slice(0, 8)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderSpeakerLayout = () => {
    const allParticipants = participantList.length > 0 ? participantList : participants;
    const speaker = allParticipants[0] || null;
    const speakerStream = speaker ? remoteStreams.get(speaker) : null;

    return (
      <Box sx={{ display: 'flex', height: '100%', width: '100%', gap: 2, p: 2 }}>
        {/* Main speaker video */}
        <Box
          sx={{
            flex: 1,
            position: 'relative',
            bgcolor: 'black',
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {speakerStream ? (
            <video
              ref={(el) => {
                if (el && speaker) {
                  videoRefs.current.set(speaker, el);
                  el.srcObject = speakerStream;
                }
              }}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : speaker ? (
            <Avatar sx={{ width: 200, height: 200, bgcolor: 'primary.main', fontSize: '4rem' }}>
              {speaker.slice(0, 1).toUpperCase()}
            </Avatar>
          ) : (
            <Typography variant="h6" sx={{ color: 'white' }}>
              Waiting for participants...
            </Typography>
          )}
        </Box>

        {/* Sidebar with local and other participants */}
        <Box sx={{ width: 300, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Local video */}
          <Box
            sx={{
              position: 'relative',
              bgcolor: 'black',
              borderRadius: 2,
              overflow: 'hidden',
              aspectRatio: '16/9'
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
                transform: 'scaleX(-1)'
              }}
            />
            {isVideoOff && (
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
                  bgcolor: 'rgba(0, 0, 0, 0.7)'
                }}
              >
                <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              </Box>
            )}
          </Box>

          {/* Other participants */}
          {allParticipants.slice(1).map((participantId) => {
            const stream = remoteStreams.get(participantId);
            return (
              <Box
                key={participantId}
                sx={{
                  position: 'relative',
                  bgcolor: 'black',
                  borderRadius: 2,
                  overflow: 'hidden',
                  aspectRatio: '16/9'
                }}
              >
                {stream ? (
                  <video
                    ref={(el) => {
                      if (el) {
                        videoRefs.current.set(participantId, el);
                        el.srcObject = stream;
                      }
                    }}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(0, 0, 0, 0.7)'
                    }}
                  >
                    <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}>
                      {participantId.slice(0, 1).toUpperCase()}
                    </Avatar>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

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
          Meeting: {meetingId.slice(0, 8)} | Duration: {formatDuration(meetingDuration)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            label={`${participantList.length + 1} participants`}
            size="small"
            sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
          />
        </Box>
      </Box>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setNotification(null)} severity={notification?.severity || 'info'} sx={{ width: '100%' }}>
          {notification?.message}
        </Alert>
      </Snackbar>

      {/* Video area */}
      <Box sx={{ flex: 1, pt: 5, overflow: 'auto' }}>
        {layout === 'grid' ? renderGridLayout() : renderSpeakerLayout()}
      </Box>

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
        {/* Mute */}
        <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
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
        </Tooltip>

        {/* Video toggle */}
        <Tooltip title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}>
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
        </Tooltip>

        {/* Layout toggle */}
        <Tooltip title="Switch layout">
          <IconButton
            onClick={() => setLayout(layout === 'grid' ? 'speaker' : 'grid')}
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

        {/* Participants list */}
        <Tooltip title="Participants">
          <IconButton
            onClick={() => setShowParticipantsList(true)}
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
          onClick={handleLeave}
          sx={{ ml: 2 }}
        >
          Leave
        </Button>
      </Box>

      {/* Participants drawer */}
      <Drawer
        anchor="right"
        open={showParticipantsList}
        onClose={() => setShowParticipantsList(false)}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Participants ({participantList.length + 1})
          </Typography>
          <List>
            <ListItem>
              <ListItemAvatar>
                <Avatar>{user?.username?.charAt(0).toUpperCase() || 'U'}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={user?.username || 'You'}
                secondary={isMuted ? 'Muted' : 'Speaking'}
              />
              {isMuted && <MicOff sx={{ ml: 1, color: 'error.main' }} />}
              {isVideoOff && <VideocamOff sx={{ ml: 1, color: 'error.main' }} />}
            </ListItem>
            {participantList.map((participantId) => (
              <ListItem key={participantId}>
                <ListItemAvatar>
                  <Avatar>{participantId.slice(0, 1).toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`Participant ${participantId.slice(0, 8)}`}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={remoteStreams.has(participantId) ? 'Connected' : 'Connecting...'}
                        size="small"
                        color={remoteStreams.has(participantId) ? 'success' : 'warning'}
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      {connectionErrors.has(participantId) && (
                        <Tooltip title={connectionErrors.get(participantId)}>
                          <Chip
                            label="Error"
                            size="small"
                            color="error"
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

export default MeetingRoom;

