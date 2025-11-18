import { ReactNode, useEffect, useState } from 'react';
import { StreamVideoClient, StreamVideo } from '@stream-io/video-react-sdk';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import apiService from '../services/api.service';

const API_KEY = import.meta.env.VITE_STREAM_API_KEY;

interface StreamClientProviderProps {
  children: ReactNode;
}

const StreamClientProvider = ({ children }: StreamClientProviderProps) => {
  const [videoClient, setVideoClient] = useState<StreamVideoClient>();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    if (!API_KEY) {
      console.error('Stream API key is missing. Please set VITE_STREAM_API_KEY in your .env file');
      return;
    }

    const initializeClient = async () => {
      try {
        // Token provider function for automatic token refresh
        const tokenProvider = async () => {
          const response = await apiService.get('/auth/stream-token');
          return response.data.token;
        };

        const client = new StreamVideoClient({
          apiKey: API_KEY,
          user: {
            id: user._id,
            name: user.username || user.email || user._id,
            image: user.avatar,
          },
          tokenProvider,
        });

        setVideoClient(client);
      } catch (error) {
        console.error('Error initializing Stream client:', error);
      }
    };

    initializeClient();
  }, [user, loading]);

  if (!videoClient) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return <StreamVideo client={videoClient}>{children}</StreamVideo>;
};

export default StreamClientProvider;

