# Stream.io Video Integration Setup

## Environment Variables

### Client (.env)
Add the following to `client/.env`:
```env
VITE_STREAM_API_KEY=your_stream_api_key_here
```

### Server (.env)
Add the following to `server/.env`:
```env
STREAM_API_KEY=your_stream_api_key_here
STREAM_API_SECRET=your_stream_api_secret_here
```

## Getting Stream.io Credentials

1. Go to https://getstream.io/
2. Sign up for a free account
3. Create a new app
4. Copy your API Key and API Secret
5. Add them to your environment variables

## Features

- ✅ High-quality video calls
- ✅ Screen sharing (built-in)
- ✅ Call recording (available)
- ✅ Adaptive bitrate
- ✅ Connection quality indicators
- ✅ Multi-participant support (scales to 1000+)
- ✅ Mobile support

## Migration Notes

- Old `call.service.ts` has been archived as `call.service.ts.old`
- All video call functionality now uses Stream.io
- Meeting pages automatically use Stream.io
- No changes needed to other features (messaging, tasks, etc.)

## Testing

1. Make sure environment variables are set
2. Start the server: `cd server && npm run dev`
3. Start the client: `cd client && npm run dev`
4. Navigate to a meeting and join
5. Video calls should work smoothly!

