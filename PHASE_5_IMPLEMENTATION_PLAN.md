# Phase 5 Implementation Plan

## Overview
Phase 5 focuses on implementing voice and video call functionality using WebRTC technology. This will enable real-time audio/video communication between team members directly within the platform.

---

## Features to Implement

### 1. **Voice/Video Call System** (Priority 1)

#### Backend:
- [ ] WebRTC signaling server setup
- [ ] Socket.io events for call signaling:
  - `call-initiate` - Start a call
  - `call-answer` - Answer a call
  - `call-reject` - Reject a call
  - `call-end` - End a call
  - `ice-candidate` - WebRTC ICE candidate exchange
  - `offer` - WebRTC offer
  - `answer` - WebRTC answer
- [ ] Call management service
- [ ] Call history tracking (optional)
- [ ] Call notifications

#### Frontend:
- [ ] Call UI component (call window)
- [ ] Call controls (mute, video toggle, screen share, hang up)
- [ ] Video display for local and remote streams
- [ ] Audio/video device selection
- [ ] Call status indicators
- [ ] Incoming call notifications
- [ ] Call button in workspace/messages
- [ ] Call history page (optional)

### 2. **Call Integration Points**

- [ ] Add call button to user profile
- [ ] Add call button to channel/workspace
- [ ] Add call button to direct messages (if implemented)
- [ ] Call notifications in NotificationCenter
- [ ] Call status indicators (online, in-call, etc.)

---

## Technical Requirements

### WebRTC Implementation Options:

1. **PeerJS** (Recommended for simplicity)
   - Simple WebRTC abstraction
   - Easy to implement
   - Good documentation

2. **Simple-Peer** (Lightweight)
   - Minimal dependencies
   - Good for custom implementation

3. **Native WebRTC API** (Advanced)
   - Full control
   - More complex but flexible

### Technology Stack:
- **WebRTC** for peer-to-peer communication
- **Socket.io** for signaling (already integrated)
- **MediaDevices API** for camera/microphone access
- **React** components for UI

### Dependencies to Add:

**Frontend:**
```json
{
  "simple-peer": "^9.11.1",
  "@types/simple-peer": "^9.11.1"
}
```

Or:

```json
{
  "peerjs": "^1.4.7",
  "@types/peerjs": "^1.0.0"
}
```

---

## Implementation Steps

### Step 1: Backend Signaling (Socket.io)
1. Create call signaling events in Socket.io
2. Handle call initiation, answering, rejection
3. Exchange WebRTC offers/answers via Socket.io
4. Handle ICE candidate exchange

### Step 2: Frontend Call Component
1. Create `CallWindow` component
2. Implement WebRTC peer connection
3. Add media stream handling (camera, microphone)
4. Implement call controls (mute, video toggle, hang up)

### Step 3: Call Integration
1. Add call button to WorkspacePage
2. Add call button to user profiles
3. Integrate with NotificationCenter for call notifications
4. Add call status indicators

### Step 4: UI/UX Enhancements
1. Call modal/window styling
2. Loading states during call connection
3. Error handling for call failures
4. Device selection UI

---

## API Endpoints (if needed)

### Call Management (Optional):
- `POST /api/calls` - Create call record
- `GET /api/calls` - Get call history
- `GET /api/calls/:id` - Get call details

---

## File Structure

```
client/src/
  components/
    CallWindow.tsx          # Main call component
    CallControls.tsx        # Call control buttons
    VideoStream.tsx         # Video display component
    IncomingCallModal.tsx   # Incoming call notification
  services/
    call.service.ts         # Call service for WebRTC
  hooks/
    useWebRTC.ts            # WebRTC hook (optional)

server/src/
  services/
    call.service.ts         # Call management service (optional)
  controllers/
    call.controller.ts      # Call controller (optional)
```

---

## Estimated Timeline

- **Backend Signaling**: 2-3 hours
- **Frontend Call Component**: 4-5 hours
- **Call Integration**: 2-3 hours
- **UI/UX Polish**: 2-3 hours
- **Testing**: 2-3 hours
- **Total**: ~12-17 hours

---

## Considerations

### Browser Compatibility:
- WebRTC requires HTTPS in production
- Browser support: Chrome, Firefox, Safari, Edge
- Mobile support may require additional testing

### Security:
- Use HTTPS for WebRTC
- Validate call permissions (team members only)
- Implement rate limiting for call initiation

### Scalability:
- For more than 2 participants, consider SFU (Selective Forwarding Unit)
- For production, consider using services like:
  - Twilio Video
  - Agora
  - Daily.co
  - Jitsi Meet (self-hosted)

### Fallback Options:
- If WebRTC is complex, consider integrating:
  - Jitsi Meet (can be embedded)
  - Zoom SDK
  - Google Meet API

---

## Testing Checklist

### Functionality:
- [ ] Initiate call between two users
- [ ] Answer incoming call
- [ ] Reject incoming call
- [ ] Mute/unmute audio
- [ ] Toggle video on/off
- [ ] End call
- [ ] Handle call failures gracefully
- [ ] Test with different browsers

### Integration:
- [ ] Call button works in workspace
- [ ] Call notifications appear
- [ ] Call status updates correctly
- [ ] Multiple simultaneous calls (if supported)

---

## Next Steps

1. ✅ Review this plan
2. Choose WebRTC library (PeerJS recommended)
3. Implement backend signaling
4. Create CallWindow component
5. Integrate call functionality
6. Test thoroughly
7. Deploy and verify

---

**Status:** Ready to start Phase 5 implementation

