# Phase 3 Testing Checklist

## ✅ Phase 3 Features to Test

### 1. **Real-Time Messaging**

#### 1.1 Message Sending
- [ ] Select a channel in workspace
- [ ] Type message in input field
- [ ] Press Enter or click Send button
- [ ] Verify: Message appears immediately in chat
- [ ] Verify: Message shows your username/avatar
- [ ] Verify: Message shows timestamp
- [ ] Verify: Message is saved and persists on page refresh

#### 1.2 Real-Time Updates (Test with 2 browsers/users)
- [ ] User A sends a message
- [ ] User B should see message appear instantly (no refresh)
- [ ] User B sends a message
- [ ] User A should see message appear instantly
- [ ] Verify: Both users see messages in correct order
- [ ] Verify: Messages scroll to bottom automatically

#### 1.3 Typing Indicators
- [ ] User A starts typing
- [ ] User B should see "User A is typing..." indicator
- [ ] User A stops typing for 3 seconds
- [ ] User B should see indicator disappear
- [ ] Test with multiple users typing simultaneously

#### 1.4 Message Reactions
- [ ] Click emoji icon on a message
- [ ] Verify: Reaction appears on message
- [ ] Click reaction again to toggle
- [ ] Verify: Multiple users can react to same message
- [ ] Verify: Reaction count updates correctly
- [ ] Verify: Reactions persist after page refresh

#### 1.5 Message Editing
- [ ] Click "..." menu on your own message
- [ ] Click "Edit"
- [ ] Modify message content
- [ ] Click Send/Update
- [ ] Verify: Message is updated for all users in real-time
- [ ] Verify: Updated message shows as edited

#### 1.6 Message Deletion
- [ ] Click "..." menu on your own message
- [ ] Click "Delete"
- [ ] Confirm deletion
- [ ] Verify: Message is removed for all users in real-time
- [ ] Verify: Non-owners see delete option only on their messages

#### 1.7 Message Permissions
- [ ] Verify: Only team members can send messages
- [ ] Verify: Only message sender can edit their message
- [ ] Verify: Message sender, admin, or owner can delete messages
- [ ] Verify: Private channel members can access private channel messages

---

### 2. **Tasks Management**

#### 2.1 Create Task (Backend API Test)
- [ ] `POST /api/tasks` with required fields
  - Test: Create task with title, teamId
  - Test: Create task with description, priority, dueDate
  - Test: Create task with assignedTo array
  - Test: Create task with channelId (optional)
  - Verify: Task is created and returned with populated fields
  - Verify: Only team members can create tasks

#### 2.2 Get Tasks (Backend API Test)
- [ ] `GET /api/tasks/team/:teamId`
  - Verify: Returns all tasks for team
  - Verify: Tasks are sorted by creation date (newest first)
  - Verify: Only team members can view tasks
  - Verify: Tasks include populated creator, assignees, team, channel

#### 2.3 Update Task (Backend API Test)
- [ ] `PUT /api/tasks/:id`
  - Test: Update task title
  - Test: Update task status (todo → in-progress → completed)
  - Test: Update task priority
  - Test: Update assignedTo array
  - Test: Update dueDate
  - Verify: When status = completed, completedAt is set
  - Verify: When status ≠ completed, completedAt is cleared
  - Verify: Only creator, assignee, or team admin can update

#### 2.4 Delete Task (Backend API Test)
- [ ] `DELETE /api/tasks/:id`
  - Verify: Only creator or team admin/owner can delete
  - Verify: Task is deleted from database

#### 2.5 Task Permissions
- [ ] Verify: Non-team members cannot create/view tasks
- [ ] Verify: Regular members cannot delete tasks they didn't create
- [ ] Verify: Team admins can delete any task
- [ ] Verify: Task creator can always update their task

---

### 3. **Meetings Management**

#### 3.1 Create Meeting (Backend API Test)
- [ ] `POST /api/meetings` with required fields
  - Test: Create meeting with title, teamId, startTime, endTime
  - Test: Create meeting with description, participants, meetingLink
  - Verify: Organizer is automatically added to participants
  - Verify: Only team members can create meetings
  - Verify: Meeting is created with status 'scheduled'

#### 3.2 Get Meetings (Backend API Test)
- [ ] `GET /api/meetings/team/:teamId`
  - Verify: Returns all meetings for team
  - Verify: Meetings are sorted by startTime (ascending)
  - Verify: Only team members can view meetings
  - Verify: Meetings include populated organizer, participants, team

#### 3.3 Update Meeting (Backend API Test)
- [ ] `PUT /api/meetings/:id`
  - Test: Update meeting title, description
  - Test: Update startTime and endTime
  - Test: Update participants array
  - Test: Update meetingLink
  - Test: Update status (scheduled → in-progress → completed/cancelled)
  - Verify: Only organizer or team admin can update

#### 3.4 Delete Meeting (Backend API Test)
- [ ] `DELETE /api/meetings/:id`
  - Verify: Only organizer or team admin/owner can delete
  - Verify: Meeting is deleted from database

#### 3.5 Meeting Permissions
- [ ] Verify: Non-team members cannot create/view meetings
- [ ] Verify: Regular members cannot delete meetings they didn't organize
- [ ] Verify: Team admins can delete any meeting

---

### 4. **Notifications System**

#### 4.1 Get Notifications (Backend API Test)
- [ ] `GET /api/notifications`
  - Verify: Returns user's notifications
  - Verify: Notifications are sorted by creation date (newest first)
  - Verify: Default limit is 50
  - Verify: Can specify custom limit via query param

#### 4.2 Get Unread Count (Backend API Test)
- [ ] `GET /api/notifications/unread-count`
  - Verify: Returns count of unread notifications
  - Verify: Count updates when notifications are marked as read

#### 4.3 Mark as Read (Backend API Test)
- [ ] `PUT /api/notifications/:id/read`
  - Verify: Notification is marked as read
  - Verify: Only notification owner can mark as read
  - Verify: Unread count decreases after marking

#### 4.4 Mark All as Read (Backend API Test)
- [ ] `PUT /api/notifications/read-all`
  - Verify: All user notifications are marked as read
  - Verify: Unread count becomes 0

#### 4.5 Delete Notification (Backend API Test)
- [ ] `DELETE /api/notifications/:id`
  - Verify: Only notification owner can delete
  - Verify: Notification is deleted from database

#### 4.6 Notification Types
- [ ] Test: Create notifications with different types:
  - `message` - New message in channel
  - `task` - Task assigned/updated
  - `meeting` - Meeting scheduled/updated
  - `team_invite` - Invited to team
  - `mention` - Mentioned in message
- [ ] Verify: Each notification type has appropriate title and message

---

### 5. **Socket.io Real-Time Features**

#### 5.1 Connection Management
- [ ] Verify: Socket connects when MessagesPanel mounts
- [ ] Verify: Socket joins channel room on connection
- [ ] Verify: Socket leaves channel room on unmount
- [ ] Verify: Socket disconnects when component unmounts

#### 5.2 Real-Time Message Events
- [ ] Test: `send-message` event sends message data
- [ ] Test: `new-message` event is received by all users in channel
- [ ] Test: `message-updated` event updates message in real-time
- [ ] Test: `message-deleted` event removes message in real-time
- [ ] Verify: Only users in channel receive events
- [ ] Verify: Events include full message data with populated sender

#### 5.3 Typing Indicators Events
- [ ] Test: `typing-start` event broadcasts to channel (except sender)
- [ ] Test: `user-typing` event displays typing indicator
- [ ] Test: `typing-stop` event removes indicator after timeout
- [ ] Verify: Multiple users can show typing simultaneously

#### 5.4 Reaction Events
- [ ] Test: `add-reaction` event updates message reactions in real-time
- [ ] Test: `remove-reaction` event updates message reactions in real-time
- [ ] Verify: All users see reaction updates instantly

#### 5.5 Error Handling
- [ ] Test: Invalid message data triggers `message-error` event
- [ ] Verify: Error message is displayed to user
- [ ] Verify: Connection errors are handled gracefully

---

### 6. **Frontend Integration**

#### 6.1 Messages Panel
- [ ] Verify: MessagesPanel component loads in WorkspacePage
- [ ] Verify: Messages load when channel is selected
- [ ] Verify: Messages display with correct formatting
- [ ] Verify: Send button is disabled when input is empty
- [ ] Verify: Message input allows multiline text
- [ ] Verify: Enter key sends message (Shift+Enter for new line)
- [ ] Verify: Scroll to bottom on new messages

#### 6.2 Message Display
- [ ] Verify: Own messages appear on right with different styling
- [ ] Verify: Other users' messages appear on left
- [ ] Verify: Avatar displays user image or initial
- [ ] Verify: Timestamp format is readable (e.g., "5m ago", "2h ago")
- [ ] Verify: Reactions display below message
- [ ] Verify: Menu (three dots) only appears on own messages

#### 6.3 UI/UX
- [ ] Verify: Loading state shows "Loading messages..."
- [ ] Verify: Empty state shows "No messages yet. Start the conversation!"
- [ ] Verify: Error messages are displayed clearly
- [ ] Verify: Input field is focused on component mount
- [ ] Verify: Typing indicator shows username(s)
- [ ] Verify: Edit mode shows different input layout

---

### 7. **Error Handling & Edge Cases**

#### 7.1 Message Errors
- [ ] Try to send message without channel access → Should show error
- [ ] Try to edit message you didn't send → Should fail
- [ ] Try to delete message you can't delete → Should show error
- [ ] Try to send empty message → Should be prevented

#### 7.2 Task Errors
- [ ] Try to create task without team membership → Should fail
- [ ] Try to update task you don't have permission for → Should fail
- [ ] Try to delete task you don't have permission for → Should fail

#### 7.3 Meeting Errors
- [ ] Try to create meeting without team membership → Should fail
- [ ] Try to update meeting you didn't organize → Should fail
- [ ] Try to delete meeting you don't have permission for → Should fail

#### 7.4 Notification Errors
- [ ] Try to mark another user's notification as read → Should fail
- [ ] Try to delete another user's notification → Should fail

#### 7.5 Socket Errors
- [ ] Test: Disconnect socket while sending message → Should handle gracefully
- [ ] Test: Send invalid data → Should receive error event
- [ ] Test: Reconnect after disconnection → Should restore connection

---

### 8. **Browser Console Checks**

#### 8.1 No Errors
- [ ] Open browser console (F12)
- [ ] Verify: No JavaScript errors
- [ ] Verify: No network errors (404, 500, etc.)
- [ ] Verify: Socket connection logs appear correctly
- [ ] Verify: Socket events are logged (optional, can disable in production)

#### 8.2 Network Requests
- [ ] Verify: API requests include Authorization header
- [ ] Verify: Socket.io connection uses correct URL
- [ ] Verify: WebSocket upgrade successful
- [ ] Verify: No CORS errors

---

## 🎯 Quick Test Scenario (Recommended Flow)

### Messages Test:
1. **Open workspace** → Select a channel
2. **Send message** → Type and send "Hello!"
3. **Open second browser/user** → Navigate to same channel
4. **Verify real-time** → User 1 sends message, User 2 sees it instantly
5. **Test typing** → User 2 starts typing, User 1 sees indicator
6. **Test reactions** → User 1 adds 👍 reaction to User 2's message
7. **Test edit** → User 2 edits their message
8. **Test delete** → User 1 deletes their message

### Backend API Test (Use Postman/API Client):
1. **Test Messages API** → Create, read, update, delete messages
2. **Test Tasks API** → Create, read, update, delete tasks
3. **Test Meetings API** → Create, read, update, delete meetings
4. **Test Notifications API** → Get, mark as read, delete notifications

---

## ✅ Completion Criteria

Phase 3 is complete when:
- ✅ All checklist items above pass
- ✅ Real-time messaging works with Socket.io
- ✅ Messages persist and load correctly
- ✅ Tasks API endpoints work correctly
- ✅ Meetings API endpoints work correctly
- ✅ Notifications system works correctly
- ✅ No console errors in browser
- ✅ Socket.io connection is stable
- ✅ All API endpoints return correct responses
- ✅ Permissions are enforced correctly
- ✅ Edge cases are handled gracefully

---

## 📝 Notes

- Socket.io requires both client and server running
- Test real-time features with multiple browser windows/tabs
- All endpoints require authentication (JWT token)
- Messages are scoped to channels and teams
- Tasks and meetings are scoped to teams
- Notifications are user-specific

