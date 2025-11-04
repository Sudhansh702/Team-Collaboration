# Phase 5 Quick Testing Guide - Voice/Video Calls

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- ✅ Backend server running (`npm run dev` in `server/` folder)
- ✅ Frontend client running (`npm run dev` in `client/` folder)
- ✅ Two browser windows (or incognito mode)
- ✅ Two user accounts in the same team

---

## Step-by-Step Testing

### Step 1: Login as Two Users

1. **Window 1 (User A - Caller):**
   - Open `http://localhost:3000`
   - Login with User A credentials
   - Navigate to Teams → Select a team → Open Workspace

2. **Window 2 (User B - Receiver):**
   - Open `http://localhost:3000` in new window/incognito
   - Login with User B credentials
   - Navigate to Teams → Select same team → Open Workspace

---

### Step 2: Get User IDs

**In Window 1 (User A):**
1. Open Browser DevTools (F12)
2. Go to Console tab
3. Type:
   ```javascript
   // Get current user ID
   localStorage.getItem('user')
   // Or check the user object from AuthContext
   ```
4. Copy User A's ID

**In Window 2 (User B):**
1. Open Browser DevTools (F12)
2. Go to Console tab
3. Type:
   ```javascript
   // Get current user ID
   localStorage.getItem('user')
   ```
4. Copy User B's ID

---

### Step 3: Initialize Call Service (Both Windows)

**In both Window 1 and Window 2, open Console and run:**

```javascript
// Import call service (if not already available)
// The call service should auto-initialize when workspace loads
// Check console for "Socket connected" message
```

**Verify:**
- ✅ Console shows "Socket connected"
- ✅ Console shows "User [id] joined user room: [user_id]"

---

### Step 4: Initiate Call from User A

**In Window 1 (User A) Console:**

```javascript
// Get call service (you may need to expose it)
// For testing, you can manually trigger the call

// Option 1: Use the call service directly
// First, check if callService is available in window
// If not, we need to access it from the component

// Option 2: Use Socket.io directly
const socket = io('http://localhost:5000');
socket.emit('call-initiate', {
  from: 'USER_A_ID',  // Replace with User A's ID
  to: 'USER_B_ID',    // Replace with User B's ID
  callType: 'video',
  teamId: 'TEAM_ID'   // Replace with team ID
});
```

**Note:** Since the UI button is not yet implemented, you can also:

1. **Temporarily add a test button** in WorkspacePage:
   ```tsx
   <Button onClick={() => {
     // Initiate call to first team member
     const otherUserId = team.members[0].userId;
     callService.initiateCall(user._id, otherUserId, 'video', teamId);
   }}>
     Test Call
   </Button>
   ```

2. **Or use the browser console with the exposed service**

---

### Step 5: Receive Call in Window 2 (User B)

**Expected Behavior:**
1. ✅ IncomingCallModal appears in Window 2
2. ✅ Shows caller name (or "User" if name not available)
3. ✅ Shows "Video Call" label
4. ✅ Two buttons: Answer (green) and Reject (red)

---

### Step 6: Answer Call

**In Window 2 (User B):**
1. Click the green **Answer** button
2. ✅ IncomingCallModal closes
3. ✅ CallWindow opens showing:
   - Remote video (User A) in main area
   - Local video preview (User B) in top-right
   - Call status: "In Call"
   - Call controls at bottom

**In Window 1 (User A):**
1. ✅ CallWindow should also show:
   - Remote video (User B) in main area  
   - Local video preview (User A) in top-right
   - Call status: "In Call"

---

### Step 7: Test Call Controls

**Test Mute:**
1. Click microphone icon (bottom controls)
2. ✅ Icon changes to MicOff (red)
3. ✅ Other user cannot hear you
4. Click again to unmute
5. ✅ Icon changes back to Mic
6. ✅ Other user can hear again

**Test Video Toggle:**
1. Click video camera icon
2. ✅ Icon changes to VideocamOff (red)
3. ✅ Your video stream stops (black screen for other user)
4. Click again to enable
5. ✅ Video resumes

---

### Step 8: End Call

1. Click the red **CallEnd** button (hang up)
2. ✅ CallWindow closes in both windows
3. ✅ Both users return to workspace
4. ✅ No video streams running
5. ✅ Resources cleaned up

---

## Alternative: Test Audio Call

**For Audio Call:**
- Same steps as above, but use `callType: 'audio'` instead of `'video'`
- UI will show avatar instead of video
- No video preview windows

---

## Testing Reject Call

1. **User A initiates call**
2. **User B sees IncomingCallModal**
3. **User B clicks red Reject button**
4. ✅ Modal closes immediately
5. ✅ User A's CallWindow closes
6. ✅ Both return to workspace

---

## Troubleshooting

### ❌ "No incoming call notification"
- Check Socket.io connection in Console
- Verify both users are in same team
- Check user IDs are correct
- Verify `join-user-room` event was sent

### ❌ "Call window not opening"
- Check browser console for errors
- Verify camera/microphone permissions
- Check WebRTC errors in console

### ❌ "No video showing"
- Allow camera permissions when prompted
- Check if camera is being used by another app
- Try different browser

### ❌ "No audio"
- Allow microphone permissions
- Check system audio settings
- Verify microphone is not muted

---

## Quick Test Checklist

- [ ] Both users logged in
- [ ] Both in same team workspace
- [ ] Socket.io connected (check console)
- [ ] Call initiated (check console)
- [ ] IncomingCallModal appears
- [ ] Call answered
- [ ] Video streams visible
- [ ] Audio working
- [ ] Mute/unmute works
- [ ] Video toggle works
- [ ] Call ends properly

---

## Browser Console Commands

**Check Socket Connection:**
```javascript
// Should see socket object
console.log(window.socket);
```

**Check Call Service:**
```javascript
// If exposed
console.log(window.callService);
```

**Manually Trigger Call:**
```javascript
// If you have access to callService
callService.initiateCall('USER_A_ID', 'USER_B_ID', 'video', 'TEAM_ID');
```

---

**Note:** For easier testing, consider adding a temporary "Test Call" button in the WorkspacePage that calls the first available team member.

