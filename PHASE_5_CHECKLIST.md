# Phase 5 Implementation Checklist

## ✅ Phase 5 Features to Implement

### 1. **Voice/Video Call System - Backend**

#### Socket.io Signaling:
- [ ] Add `call-initiate` event handler
- [ ] Add `call-answer` event handler
- [ ] Add `call-reject` event handler
- [ ] Add `call-end` event handler
- [ ] Add `ice-candidate` event handler
- [ ] Add `offer` event handler (WebRTC offer)
- [ ] Add `answer` event handler (WebRTC answer)
- [ ] Handle call room management
- [ ] Validate call permissions (team members only)

#### Optional - Call Management:
- [ ] Create Call model (if storing call history)
- [ ] Call service for call management
- [ ] Call controller endpoints
- [ ] Call routes

---

### 2. **Voice/Video Call System - Frontend**

#### Call Component:
- [ ] Create `CallWindow.tsx` component
- [ ] Implement WebRTC peer connection
- [ ] Handle local media stream (camera, microphone)
- [ ] Handle remote media stream
- [ ] Display local video preview
- [ ] Display remote video stream
- [ ] Implement call controls:
  - [ ] Mute/unmute audio button
  - [ ] Toggle video on/off button
  - [ ] Screen share button (optional)
  - [ ] Hang up button
  - [ ] Device selection (camera/microphone)
- [ ] Call status indicators (connecting, ringing, in-call)
- [ ] Error handling for call failures
- [ ] Loading states during connection

#### Incoming Call UI:
- [ ] Create `IncomingCallModal.tsx` component
- [ ] Display caller information
- [ ] Answer call button
- [ ] Reject call button
- [ ] Show call notification

#### Call Service:
- [ ] Create `call.service.ts`
- [ ] Implement WebRTC connection logic
- [ ] Handle signaling via Socket.io
- [ ] Manage media streams
- [ ] Handle call state management

---

### 3. **Call Integration**

#### Workspace Integration:
- [ ] Add call button to WorkspacePage AppBar
- [ ] Add call button to channel sidebar
- [ ] Add call button to user list (if available)
- [ ] Call button opens call modal/window

#### User Profile Integration:
- [ ] Add call button to user profile
- [ ] Start call from profile page

#### Notification Integration:
- [ ] Add call notifications to NotificationCenter
- [ ] Show incoming call notifications
- [ ] Handle call notification clicks

#### Call Status Indicators:
- [ ] Show user online status
- [ ] Show "in-call" status
- [ ] Update status in real-time

---

### 4. **UI/UX Enhancements**

#### Call Window:
- [ ] Responsive design (mobile/desktop)
- [ ] Clean, modern UI
- [ ] Video grid layout (for future multi-user support)
- [ ] Animated transitions
- [ ] Proper error messages
- [ ] Loading indicators

#### Permissions:
- [ ] Request camera/microphone permissions
- [ ] Handle permission denial gracefully
- [ ] Show permission status

#### Device Management:
- [ ] List available cameras
- [ ] List available microphones
- [ ] Allow device selection before/during call
- [ ] Store device preferences

---

### 5. **Testing**

#### Functionality Tests:
- [ ] Test call initiation
- [ ] Test call answering
- [ ] Test call rejection
- [ ] Test call ending
- [ ] Test mute/unmute
- [ ] Test video toggle
- [ ] Test with different browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (if applicable)
- [ ] Test error scenarios (no permissions, network issues)

#### Integration Tests:
- [ ] Test call from workspace
- [ ] Test call from profile
- [ ] Test call notifications
- [ ] Test with multiple users in same team
- [ ] Test call status updates

---

## Implementation Order

1. **Backend Signaling** (Socket.io events)
2. **Frontend Call Component** (CallWindow)
3. **Call Service** (WebRTC logic)
4. **Integration** (Buttons, notifications)
5. **UI Polish** (Styling, animations)
6. **Testing** (All scenarios)

---

## Dependencies to Install

### Frontend:
```bash
cd client
npm install simple-peer
npm install --save-dev @types/simple-peer
```

Or:
```bash
npm install peerjs
npm install --save-dev @types/peerjs
```

---

## File Structure

```
client/src/
  components/
    CallWindow.tsx
    CallControls.tsx
    VideoStream.tsx
    IncomingCallModal.tsx
  services/
    call.service.ts
  hooks/
    useWebRTC.ts (optional)

server/src/
  services/
    call.service.ts (optional)
  controllers/
    call.controller.ts (optional)
  models/
    Call.ts (optional)
```

---

## API Endpoints (Optional)

If storing call history:
- `POST /api/calls` - Create call record
- `GET /api/calls` - Get call history
- `GET /api/calls/:id` - Get call details

---

**Status:** Ready to start implementation

