# Multi-Person Video Meeting Implementation Plan

## Overview
Implement multi-person video meeting feature supporting up to 10 participants using WebRTC mesh architecture. This extends the existing 1-on-1 call system to support group meetings that can be started from scheduled meetings.

## Architecture Approach
- **Mesh Architecture**: Each peer maintains connections to all other participants (N-1 connections per peer)
- **Why Mesh**: Suitable for up to 10 participants, works with existing infrastructure, no additional server setup required
- **Signaling**: Use existing Socket.io infrastructure with new meeting room events

## Implementation Tasks

### 1. Backend: Socket.io Meeting Room Events
**Files**: `server/src/index.ts`

- Add meeting room join/leave events:
  - `join-meeting-room` - Join meeting room (meetingId)
  - `leave-meeting-room` - Leave meeting room
  - `meeting-participant-joined` - Broadcast when participant joins
  - `meeting-participant-left` - Broadcast when participant leaves
- Add WebRTC signaling for meetings:
  - `meeting-offer` - WebRTC offer for meeting (broadcast to all participants)
  - `meeting-answer` - WebRTC answer for meeting
  - `meeting-ice-candidate` - ICE candidate exchange for meetings
- Store meeting room participants in memory (Map<meetingId, Set<userId>>)

### 2. Backend: Meeting Service Updates
**Files**: `server/src/services/meeting.service.ts`

- Add method to update meeting status to 'in-progress' when started
- Add method to get active meeting participants
- Add validation for max 10 participants per meeting

### 3. Backend: Meeting Controller Updates
**Files**: `server/src/controllers/meeting.controller.ts`

- Add endpoint to start meeting: `POST /api/meetings/:id/start`
- Add endpoint to join meeting: `POST /api/meetings/:id/join`
- Add endpoint to leave meeting: `POST /api/meetings/:id/leave`
- Update meeting status to 'in-progress' when started
- Validate participant count (max 10)

### 4. Frontend: Multi-Peer Call Service
**Files**: `client/src/services/call.service.ts`

- Extend `CallService` class to support multiple peer connections
- Add `peerConnections: Map<string, RTCPeerConnection>` to manage multiple peers
- Add `remoteStreams: Map<string, MediaStream>` to store remote streams by userId
- Add methods:
  - `joinMeeting(meetingId: string, userId: string, participants: string[])` - Join meeting room
  - `leaveMeeting(meetingId: string)` - Leave meeting and cleanup all connections
  - `handleMeetingOffer(userId: string, offer: RTCSessionDescriptionInit)` - Handle offer from participant
  - `handleMeetingAnswer(userId: string, answer: RTCSessionDescriptionInit)` - Handle answer from participant
  - `setupMeetingPeerConnection(userId: string)` - Create peer connection for specific participant
  - `addMeetingParticipant(userId: string)` - Add new participant to existing meeting
  - `removeMeetingParticipant(userId: string)` - Remove participant and cleanup connection
- Modify existing methods to work with both 1-on-1 and multi-person scenarios
- Add event handlers for meeting room events

### 5. Frontend: Meeting Service Updates
**Files**: `client/src/services/meeting.service.ts`

- Add `startMeeting(meetingId: string)` - Start a scheduled meeting
- Add `joinMeeting(meetingId: string)` - Join an active meeting
- Add `leaveMeeting(meetingId: string)` - Leave an active meeting

### 6. Frontend: Meeting Room Component
**Files**: `client/src/components/MeetingRoom.tsx` (new)

- Create new component similar to zoom-clone's MeetingRoom
- Features:
  - Video grid layout (up to 10 participants)
  - Speaker view layout (largest video + grid of others)
  - Layout switching (grid/speaker)
  - Participant list sidebar
  - Meeting controls (mute, video toggle, leave meeting)
  - Participant count display
  - Local video preview (small overlay)
- Use Material-UI components (following project standards)
- Display remote streams from `callService.remoteStreams`
- Handle participant join/leave events
- Show participant names/avatars when video is off

### 7. Frontend: Meeting Setup Component
**Files**: `client/src/components/MeetingSetup.tsx` (new)

- Create pre-join setup screen
- Features:
  - Video preview before joining
  - Device selection (camera/microphone)
  - Toggle to join with mic/camera off
  - Join meeting button
- Similar to zoom-clone's MeetingSetup but using Material-UI

### 8. Frontend: Meeting List Integration
**Files**: `client/src/components/MeetingList.tsx`

- Update `handleStartMeeting` to:
  - Call `meetingService.startMeeting(meetingId)`
  - Navigate to meeting room or open meeting modal
  - Update meeting status to 'in-progress'
- Add "Join Meeting" button for active meetings
- Show participant count and active status
- Add meeting link sharing functionality

### 9. Frontend: Meeting Page/Route
**Files**: `client/src/pages/MeetingPage.tsx` (new)

- Create new route: `/meeting/:meetingId`
- Handle meeting setup and room components
- Check if user is participant
- Handle meeting not found/invalid states
- Initialize meeting room on mount

### 10. Frontend: Routing Updates
**Files**: `client/src/App.tsx`

- Add route for `/meeting/:meetingId`
- Protect route (require authentication)
- Ensure meeting access validation

### 11. Type Definitions
**Files**: `client/src/types/index.ts`

- Add `MeetingParticipant` interface:
  ```typescript
  interface MeetingParticipant {
    userId: string;
    userName: string;
    avatar?: string;
    isMuted: boolean;
    isVideoOff: boolean;
    stream?: MediaStream;
  }
  ```
- Update `Meeting` interface if needed (add activeParticipants field)

### 12. UI/UX Enhancements
**Files**: Multiple components

- Add meeting notification when participant joins/leaves
- Add meeting duration timer
- Add meeting end button (organizer only)
- Show connection status for each participant
- Handle network errors gracefully
- Add loading states during connection setup

### 13. Testing & Validation
- Test with 2-10 participants
- Test participant join/leave during active meeting
- Test network disconnection/reconnection
- Test meeting end/cleanup
- Validate max 10 participant limit
- Test audio/video toggle in multi-person context

## Key Implementation Details

### WebRTC Mesh Architecture
- Each participant creates a peer connection to every other participant
- On new participant join, existing participants create new peer connection
- New participant receives offers from all existing participants
- ICE candidates exchanged for each peer connection
- Streams added to each peer connection separately

### Socket.io Room Management
- Use meeting rooms: `meeting:${meetingId}`
- Track participants in server memory
- Broadcast participant events to room
- Handle participant disconnection cleanup

### Performance Considerations
- Limit to 10 participants (enforced in backend)
- Optimize video quality based on participant count
- Consider bandwidth limitations
- Implement connection quality indicators

## Files to Modify/Create

### Backend
- `server/src/index.ts` - Socket.io meeting room events
- `server/src/services/meeting.service.ts` - Meeting service updates
- `server/src/controllers/meeting.controller.ts` - Meeting controller updates
- `server/src/routes/meeting.routes.ts` - New meeting routes (if needed)

### Frontend
- `client/src/services/call.service.ts` - Multi-peer support
- `client/src/services/meeting.service.ts` - Meeting service updates
- `client/src/components/MeetingRoom.tsx` - New component
- `client/src/components/MeetingSetup.tsx` - New component
- `client/src/components/MeetingList.tsx` - Integration updates
- `client/src/pages/MeetingPage.tsx` - New page
- `client/src/App.tsx` - Routing updates
- `client/src/types/index.ts` - Type definitions

## Dependencies
- No new dependencies required (uses existing WebRTC, Socket.io, Material-UI)
- May need to add video grid layout library or implement custom grid

## Success Criteria
- ✅ Users can start meetings from scheduled meetings
- ✅ Up to 10 participants can join a meeting
- ✅ All participants can see and hear each other
- ✅ Participants can toggle audio/video
- ✅ Participants can leave meeting gracefully
- ✅ Meeting ends when organizer leaves or explicitly ends
- ✅ Meeting status updates correctly in database
- ✅ UI matches project design standards (Material-UI, Design.json)

---

**Plan Created**: Current Date
**Status**: Ready for Implementation

