# Phase 5 Manual Testing Guide - Voice/Video Calls

## Overview
This guide provides step-by-step instructions for manually testing the voice and video call functionality in Phase 5.

**Prerequisites:**
- Two user accounts (or two browser windows/tabs)
- Both users should be members of the same team
- Camera and microphone permissions enabled in browser
- Server running on `http://localhost:5000`
- Client running on `http://localhost:3000`

---

## Test Setup

### Step 1: Prepare Testing Environment

1. **Start the Backend Server:**
   ```bash
   cd server
   npm run dev
   ```
   - Server should start on port 5000
   - Verify: Check console for "Server is running on port 5000"

2. **Start the Frontend Client:**
   ```bash
   cd client
   npm run dev
   ```
   - Client should start on port 3000
   - Verify: Check console for localhost URL

3. **Open Two Browser Windows/Tabs:**
   - **Window 1**: User A (Caller)
   - **Window 2**: User B (Receiver)
   - Or use **Incognito/Private** mode for one window

4. **Login with Two Different Accounts:**
   - **User A**: Login in Window 1
   - **User B**: Login in Window 2
   - Both users should be members of the same team

---

## Test Scenario 1: Video Call - Initiate and Answer

### Step-by-Step Instructions:

#### **Part A: User A Initiates Call**

1. **Navigate to Workspace:**
   - In Window 1 (User A), click on "Teams" from dashboard
   - Select a team (both users should be members)
   - Click "Open Workspace"
   - Verify: Workspace page loads with channels sidebar

2. **Check Socket Connection:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Verify: See "Socket connected" message
   - Verify: See "User [socket_id] joined user room: [user_id]"

3. **Initiate Video Call:**
   - **Note**: Currently, call initiation requires manual code/API call
   - For testing, you can use browser console:
     ```javascript
     // In browser console (Window 1 - User A)
     // Get the other user's ID from your team members
     const otherUserId = "USER_B_ID_HERE"; // Replace with actual User B ID
     const callService = window.callService; // If exposed
     // Or use the call service directly
     ```
   - **Alternative**: If call button is added to UI, click it

4. **Verify Call Initiation:**
   - Check Console in Window 1
   - Should see: "Call initiated" or similar message
   - CallWindow should open showing:
     - Local video preview (small window, top-right)
     - "Connecting..." or "Ringing..." status
     - Call controls at bottom (mute, video, hang up)

#### **Part B: User B Receives Call**

5. **Check Incoming Call Notification:**
   - In Window 2 (User B), verify IncomingCallModal appears
   - Modal should show:
     - Caller name (User A's name)
     - "Video Call" label
     - Video icon
     - Two buttons: Answer (green) and Reject (red)

6. **Answer the Call:**
   - Click the green "Answer" button (phone icon)
   - Verify: IncomingCallModal closes
   - Verify: CallWindow opens showing:
     - Remote video (User A's video) in main area
     - Local video preview (User B's video) in top-right corner
     - Call status: "In Call"
     - Call controls visible at bottom

#### **Part C: Verify Call Connection**

7. **Check Video Streams:**
   - **User A (Window 1)**:
     - Should see User B's video in main area
     - Should see own video in top-right preview
   - **User B (Window 2)**:
     - Should see User A's video in main area
     - Should see own video in top-right preview

8. **Test Audio:**
   - Speak into microphone
   - Verify: Other user can hear you
   - Check audio levels if available

9. **Verify Call Status:**
   - Both windows should show "In Call" status
   - Both should have active video streams

---

## Test Scenario 2: Call Controls - Mute/Unmute

### Step-by-Step Instructions:

1. **During Active Call:**
   - Both users should be in active video call (from previous test)

2. **Test Mute Function:**
   - **User A**: Click the microphone icon (mute button)
   - Verify: Icon changes to "MicOff" (red/disabled state)
   - Verify: Other user (User B) cannot hear User A
   - **User A**: Click microphone icon again (unmute)
   - Verify: Icon changes back to "Mic" (normal state)
   - Verify: Other user can hear again

3. **Test Video Toggle:**
   - **User A**: Click the video camera icon (video toggle)
   - Verify: Icon changes to "VideocamOff" (red/disabled state)
   - Verify: User A's video stream stops (black screen for User B)
   - **User A**: Click video icon again (enable video)
   - Verify: Icon changes back to "Videocam" (normal state)
   - Verify: User A's video stream resumes

4. **Test Both Users:**
   - Repeat steps 2-3 for User B
   - Verify: All controls work independently for both users

---

## Test Scenario 3: End Call

### Step-by-Step Instructions:

1. **During Active Call:**
   - Both users should be in active call

2. **End Call from User A:**
   - **User A**: Click the red "CallEnd" button (hang up)
   - Verify: CallWindow closes in Window 1 (User A)
   - Verify: CallWindow closes in Window 2 (User B)
   - Verify: Both users return to workspace view

3. **Verify Cleanup:**
   - Check Console in both windows
   - Should see: "Call ended" or similar messages
   - Verify: No video streams running
   - Verify: Camera/microphone permissions released

4. **Test End Call from User B:**
   - Initiate another call
   - **User B**: Click hang up button
   - Verify: Same behavior as above

---

## Test Scenario 4: Audio Call

### Step-by-Step Instructions:

1. **Initiate Audio Call:**
   - Follow same steps as Video Call (Scenario 1)
   - But select "audio" call type instead of "video"

2. **Verify Audio Call UI:**
   - **User A**: CallWindow should show:
     - Large avatar with user's initial
     - User B's name
     - Call status ("Connecting...", "Ringing...", "In Call")
     - Call controls (mute, hang up)
     - **NO** video preview windows

3. **Answer Audio Call:**
   - **User B**: Click Answer button
   - Verify: Same UI as above (avatar, name, status)

4. **Test Audio:**
   - Speak into microphone
   - Verify: Other user can hear clearly
   - Test mute/unmute (same as video call)

5. **End Audio Call:**
   - Click hang up button
   - Verify: Call ends properly

---

## Test Scenario 5: Reject Call

### Step-by-Step Instructions:

1. **Initiate Call:**
   - User A initiates call to User B

2. **Reject Call:**
   - **User B**: When IncomingCallModal appears, click red "Reject" button (CallEnd icon)
   - Verify: IncomingCallModal closes immediately
   - Verify: CallWindow in User A's window closes
   - Verify: User A sees "Call Ended" or similar message

3. **Verify Notifications:**
   - Check Console in both windows
   - Should see: "Call rejected" messages
   - Verify: No call window remains open

---

## Test Scenario 6: Call While Busy (Error Handling)

### Step-by-Step Instructions:

1. **Start First Call:**
   - User A calls User B
   - User B answers
   - Both in active call

2. **Attempt Second Call:**
   - User A tries to call User B again (while already in call)
   - **Expected**: Should handle gracefully
   - Either: Show error message, or ignore second call attempt

3. **Verify Behavior:**
   - Check Console for error messages
   - Verify: First call continues normally
   - Verify: Second call attempt doesn't disrupt first call

---

## Test Scenario 7: Browser Permissions

### Step-by-Step Instructions:

1. **Test Without Camera Permission:**
   - Block camera access in browser settings
   - Try to initiate video call
   - **Expected**: Should show error message about camera permissions
   - **Expected**: Should allow audio-only call if microphone is allowed

2. **Test Without Microphone Permission:**
   - Block microphone access in browser settings
   - Try to initiate call
   - **Expected**: Should show error message about microphone permissions

3. **Test Permission Grant:**
   - Initially block permissions
   - When prompted, grant permissions
   - Verify: Call continues normally

4. **Test Permission Denial:**
   - Deny permissions when prompted
   - Verify: Appropriate error message shown
   - Verify: Call doesn't proceed

---

## Test Scenario 8: Network Issues (ICE Candidate Handling)

### Step-by-Step Instructions:

1. **Monitor ICE Candidates:**
   - Open DevTools → Console
   - Initiate call
   - Watch for ICE candidate messages
   - Verify: Multiple ICE candidates are exchanged

2. **Test Connection Stability:**
   - During active call, verify:
     - Video streams remain stable
     - Audio remains clear
     - No frequent disconnections

3. **Test Reconnection (if implemented):**
   - Briefly disconnect network
   - Reconnect network
   - Verify: Call reconnects or shows appropriate error

---

## Test Scenario 9: Multiple Calls (Different Users)

### Step-by-Step Instructions:

1. **Setup:**
   - Need 3 users: User A, User B, User C
   - All in same team

2. **First Call:**
   - User A calls User B
   - User B answers
   - Both in call

3. **Second Call:**
   - User C calls User A (while A is in call with B)
   - **Expected**: Should handle gracefully
   - Either: Show incoming call notification, or show busy message

4. **Verify Behavior:**
   - Check how system handles multiple simultaneous calls
   - Verify: No conflicts or errors

---

## Common Issues & Troubleshooting

### Issue 1: "Call not initiating"
**Solutions:**
- Check browser console for errors
- Verify Socket.io connection is established
- Check that both users are in same team
- Verify user IDs are correct

### Issue 2: "No video showing"
**Solutions:**
- Check camera permissions in browser
- Verify camera is not being used by another application
- Check browser console for media stream errors
- Try refreshing the page

### Issue 3: "No audio"
**Solutions:**
- Check microphone permissions
- Verify microphone is not muted in system settings
- Check browser audio settings
- Verify audio device is selected correctly

### Issue 4: "Call not connecting"
**Solutions:**
- Check STUN server connectivity
- Verify firewall isn't blocking WebRTC
- Check browser console for ICE candidate errors
- Try different browser (Chrome, Firefox, Safari)

### Issue 5: "Call ends immediately"
**Solutions:**
- Check for errors in console
- Verify WebRTC offer/answer exchange is working
- Check Socket.io events are being received
- Verify user room joins are successful

---

## Browser Compatibility Testing

### Chrome:
1. Open Chrome
2. Follow all test scenarios
3. Verify: All features work correctly

### Firefox:
1. Open Firefox
2. Follow all test scenarios
3. Verify: All features work correctly

### Safari (if available):
1. Open Safari
2. Follow all test scenarios
3. Verify: All features work correctly
4. **Note**: Safari may have different WebRTC behavior

### Edge (if available):
1. Open Edge
2. Follow all test scenarios
3. Verify: All features work correctly

---

## Testing Checklist

Use this checklist to track your testing progress:

- [ ] **Setup**: Both servers running
- [ ] **Setup**: Two users logged in
- [ ] **Setup**: Both users in same team
- [ ] **Video Call**: Initiate call
- [ ] **Video Call**: Receive incoming call notification
- [ ] **Video Call**: Answer call
- [ ] **Video Call**: Verify video streams
- [ ] **Video Call**: Verify audio working
- [ ] **Controls**: Test mute/unmute
- [ ] **Controls**: Test video toggle
- [ ] **End Call**: Test hang up
- [ ] **Reject Call**: Test call rejection
- [ ] **Audio Call**: Test audio-only call
- [ ] **Permissions**: Test camera permission denial
- [ ] **Permissions**: Test microphone permission denial
- [ ] **Network**: Test ICE candidate exchange
- [ ] **Browser**: Test in Chrome
- [ ] **Browser**: Test in Firefox
- [ ] **Browser**: Test in Safari (if available)
- [ ] **Error Handling**: Test call while busy
- [ ] **Error Handling**: Test network issues

---

## Expected Results Summary

### ✅ Successful Call:
- IncomingCallModal appears for receiver
- CallWindow opens for both users
- Video streams display correctly
- Audio works in both directions
- Call controls function properly
- Call ends cleanly when hang up clicked

### ❌ Failed Call:
- Error message displayed
- No call windows remain open
- Resources cleaned up properly
- User can try again

---

## Notes for Testers

1. **User IDs**: You'll need to know the other user's ID to initiate calls
   - Check user profile or team members list
   - Or use browser console to get user IDs

2. **Call Button**: Currently, call initiation may require console/API
   - Future updates may add UI buttons for call initiation

3. **Network**: Ensure both users are on same network or have proper NAT traversal
   - STUN servers help with NAT traversal
   - TURN servers may be needed for some network configurations

4. **HTTPS**: For production, WebRTC requires HTTPS
   - Local development (localhost) works with HTTP
   - Production deployment needs HTTPS

---

## Reporting Issues

When reporting issues, include:
- Browser name and version
- Operating system
- Steps to reproduce
- Console error messages
- Network tab information (if relevant)
- Screenshots or video (if possible)

---

**Happy Testing!** 🎥📞

