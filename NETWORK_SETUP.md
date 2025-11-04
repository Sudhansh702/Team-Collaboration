# Network Setup for Testing Video Calls

## Quick Setup Guide

To test video calls from your phone to your laptop, you need to expose both the frontend and backend to your local network.

### Step 1: Find Your Local IP Address

Your local IP address is: **192.168.1.4**

### Step 2: Update Frontend Configuration

The frontend is already configured to accept network connections (`host: true` in vite.config.ts).

**Frontend will be accessible at:**
- `http://192.168.1.4:3000` (from your phone)
- `http://localhost:3000` (from your laptop)

### Step 3: Update Backend to Accept Network Connections

The backend needs to bind to `0.0.0.0` instead of just `localhost`. Update the server startup:

**Option A: Update server/src/index.ts** (already done - CORS allows local network)

**Option B: Start server with host binding:**
```bash
cd server
PORT=5555 HOST=0.0.0.0 npm run dev
```

Or update the server code to listen on all interfaces.

### Step 4: Update Environment Variables

**On your phone, you'll need to access:**
- Frontend: `http://192.168.1.4:3000`
- Backend API: `http://192.168.1.4:5555`
- Socket: `ws://192.168.1.4:5555`

### Step 5: Update Client Environment

Create or update `client/.env`:
```env
VITE_API_URL=http://192.168.1.4:5555/api
VITE_SOCKET_URL=http://192.168.1.4:5555
```

**Note:** For development, you might want to use a dynamic approach that detects the IP.

### Step 6: Start Services

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

The frontend will show:
```
➜  Local:   http://localhost:3000/
➜  Network: http://192.168.1.4:3000/
```

### Step 7: Connect from Phone

1. Make sure your phone is on the **same WiFi network** as your laptop
2. Open browser on phone and go to: `http://192.168.1.4:3000`
3. Login/Register
4. Test video calls!

## Troubleshooting

### Firewall Issues
If you can't connect from your phone:

**macOS:**
```bash
# Allow incoming connections on ports 3000 and 5555
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /Applications/Google\ Chrome.app
```

Or go to System Preferences > Security & Privacy > Firewall > Firewall Options and allow Node.js

**Check if ports are accessible:**
```bash
# From phone or another device, test if port is open:
curl http://192.168.1.4:5555/health
```

### CORS Issues
If you see CORS errors, the backend CORS configuration now allows local network IPs automatically.

### Socket Connection Issues
Make sure Socket.io is configured to accept connections from your network IP.

## Alternative: Use ngrok for External Testing

If you want to test from outside your local network:

```bash
# Install ngrok
brew install ngrok

# Expose frontend
ngrok http 3000

# Expose backend
ngrok http 5555
```

Then use the ngrok URLs in your client configuration.

## Security Note

⚠️ **Warning:** Exposing your development server to the network is only for testing. Don't use this in production without proper security measures.

