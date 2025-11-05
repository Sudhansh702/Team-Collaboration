import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Alert as MuiAlert
} from '@mui/material';
import { VideocamOff } from '@mui/icons-material';

interface MeetingSetupProps {
  onJoin: () => void;
  onCancel?: () => void;
}

const MeetingSetup: React.FC<MeetingSetupProps> = ({ onJoin, onCancel }) => {
  const [isMicCamToggled, setIsMicCamToggled] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Get available devices
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        const microphones = devices.filter(device => device.kind === 'audioinput');
        
        setAvailableCameras(cameras);
        setAvailableMicrophones(microphones);
        
        if (cameras.length > 0) {
          setSelectedCamera(cameras[0].deviceId);
        }
        if (microphones.length > 0) {
          setSelectedMicrophone(microphones[0].deviceId);
        }
      } catch (err) {
        console.error('Error getting devices:', err);
      }
    };

    // Get user media first to request permissions
    const requestMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
        
        setLocalStream(stream);
        
        // Get devices after permission is granted
        await getDevices();
        
        // Update video preview
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error('Error requesting media:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera/microphone permission denied. Please allow access in your browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera or microphone found. Please connect a camera/microphone.');
        } else {
          setError('Failed to access camera/microphone. Please check your browser permissions.');
        }
      }
    };

    requestMedia();

    return () => {
      // Cleanup stream on unmount
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    // Update video preview when stream changes
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    // Update stream when devices change
    const updateStream = async () => {
      if (!localStream) return;

      try {
        const constraints: MediaStreamConstraints = {
          audio: isMicCamToggled ? false : {
            deviceId: selectedMicrophone ? { exact: selectedMicrophone } : undefined
          },
          video: isMicCamToggled ? false : {
            deviceId: selectedCamera ? { exact: selectedCamera } : undefined
          }
        };

        // Get new stream with selected devices
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Stop old tracks
        localStream.getTracks().forEach(track => track.stop());
        
        setLocalStream(newStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (err) {
        console.error('Error updating stream:', err);
      }
    };

    updateStream();
  }, [selectedCamera, selectedMicrophone]);

  const handleMicCamToggle = async (checked: boolean) => {
    setIsMicCamToggled(checked);
    
    if (localStream) {
      if (checked) {
        // Disable mic and camera
        localStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
        localStream.getVideoTracks().forEach(track => {
          track.enabled = false;
        });
      } else {
        // Enable mic and camera
        localStream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
        localStream.getVideoTracks().forEach(track => {
          track.enabled = true;
        });
      }
    }
  };

  const handleJoin = () => {
    // Store the stream in callService for use in meeting
    if (localStream) {
      // The stream is already set, just proceed
      onJoin();
    } else {
      setError('Please allow camera/microphone access to join the meeting.');
    }
  };

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

          {/* Video Preview */}
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
            <video
              ref={videoRef}
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
            {(!localStream || isMicCamToggled) && (
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
                  {isMicCamToggled ? (
                    <>
                      <VideocamOff sx={{ fontSize: 48, mb: 1 }} />
                      <Typography>Camera Off</Typography>
                    </>
                  ) : (
                    <Typography>Loading camera...</Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>

          {/* Device Selection */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Camera</InputLabel>
              <Select
                value={selectedCamera}
                label="Camera"
                onChange={(e) => setSelectedCamera(e.target.value)}
                disabled={isMicCamToggled || availableCameras.length === 0}
              >
                {availableCameras.map((camera) => (
                  <MenuItem key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Microphone</InputLabel>
              <Select
                value={selectedMicrophone}
                label="Microphone"
                onChange={(e) => setSelectedMicrophone(e.target.value)}
                disabled={isMicCamToggled || availableMicrophones.length === 0}
              >
                {availableMicrophones.map((mic) => (
                  <MenuItem key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Join with mic/camera off */}
          <FormControlLabel
            control={
              <Checkbox
                checked={isMicCamToggled}
                onChange={(e) => handleMicCamToggle(e.target.checked)}
              />
            }
            label="Join with microphone and camera off"
            sx={{ mb: 3 }}
          />

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {onCancel && (
              <Button
                variant="outlined"
                onClick={onCancel}
                sx={{ minWidth: 120 }}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={handleJoin}
              disabled={!localStream && !isMicCamToggled}
              sx={{ minWidth: 120 }}
            >
              Join Meeting
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MeetingSetup;

