# Phase 2 Testing Checklist

## ✅ Phase 2 Features to Test

### 1. **Authentication & User Profile** (From Phase 1)
- [ ] Register new user
- [ ] Login with credentials
- [ ] View profile page
- [ ] Update profile (username, avatar, status)
- [ ] Logout functionality

---

### 2. **Team Management**

#### 2.1 Create Team
- [ ] Navigate to Teams page → Click "Create Team" button
- [ ] Fill form: Team name (required), Description (optional)
- [ ] Submit form
- [ ] Verify: Team is created and you're automatically redirected to workspace
- [ ] Verify: You are set as the team owner
- [ ] Verify: You are added as a member with role "owner"

#### 2.2 View Teams
- [ ] Navigate to Dashboard → Click "Teams"
- [ ] Verify: See list of all teams you're a member of or own
- [ ] Verify: Each team card shows:
  - Team name
  - Team description (if available)
  - Your role (Owner/Admin/Member)
  - Settings icon (only for teams you own)

#### 2.3 Team Card Actions
- [ ] Click on team card → Should navigate to workspace (`/workspace/:teamId`)
- [ ] Click settings icon (for owned teams) → Should navigate to team settings (`/teams/:id/settings`)

#### 2.4 Team Settings Page (Owner Only)

**General Tab:**
- [ ] Verify: Only team owner can access this page
- [ ] View team name and description
- [ ] Edit team name
- [ ] Edit team description
- [ ] Click "Save Changes" → Verify update
- [ ] Click "Delete Team" → Confirm → Verify team is deleted and redirected to teams list

**Members Tab:**
- [ ] View team owner (separately displayed with "Owner" badge)
- [ ] View all team members with their:
  - Username/Email
  - Role (Owner/Admin/Member)
  - Join date
- [ ] Click "Add Member" button
- [ ] In dialog: Enter email of existing user, select role (Member/Admin)
- [ ] Click "Add" → Verify member is added
- [ ] For each member (except owner): See role dropdown and delete button
- [ ] Change member role (Admin/Member) using dropdown → Verify update
- [ ] Remove member using delete button → Confirm → Verify member is removed
- [ ] Verify: Cannot change owner role
- [ ] Verify: Cannot remove owner

---

### 3. **Workspace Page** (`/workspace/:teamId`)

#### 3.1 Left Sidebar
- [ ] Verify: Team name displayed in header
- [ ] Verify: "Channels" section with channel list
- [ ] Verify: Create channel button (+) next to "Channels" (visible to all team members)
- [ ] Verify: "Team Settings" button at bottom (visible to all, but only owner can access)

#### 3.2 Channel List
- [ ] View all channels in the team
- [ ] Verify: Public channels show message icon
- [ ] Verify: Private channels show lock icon
- [ ] Click on a channel → Select it (highlighted)
- [ ] Verify: If no channels exist, see "No channels yet" message

#### 3.3 Create Channel
- [ ] Click "+" button next to Channels
- [ ] In dialog:
  - Enter channel name (required)
  - Enter description (optional)
  - Select channel type (Public/Private)
- [ ] Click "Create" → Verify:
  - Channel appears in sidebar
  - Channel is automatically selected
  - Channel info displayed in main area
- [ ] Click "Cancel" → Dialog closes without creating

#### 3.4 Channel View (Main Area)
- [ ] Select a channel → Verify:
  - Channel name displayed
  - Channel description (or "No description")
  - Channel type (Public/Private)
  - Member count
  - Placeholder message: "Channel view coming soon. Messages will be displayed here."
- [ ] If no channel selected: See "Select a channel" message

---

### 4. **Channel Management** (Backend API Testing)

#### 4.1 Create Channel
- [ ] Test: Create public channel
- [ ] Test: Create private channel
- [ ] Test: Error handling for duplicate channel name in same team
- [ ] Test: Only team members can create channels

#### 4.2 View Channels
- [ ] Test: Get all channels for a team
- [ ] Test: Verify user can only see channels they have access to

#### 4.3 Channel Settings (Future)
- [ ] Note: Channel update/delete not yet implemented in UI

---

### 5. **Backend API Endpoints** (Test with Postman/API Client)

#### 5.1 Team Endpoints (`/api/teams`)
- [ ] `POST /api/teams` - Create team (requires auth)
  - Request: `{ name, description }`
  - Verify: Returns team with ownerId set to current user
- [ ] `GET /api/teams` - Get user's teams (requires auth)
  - Verify: Returns teams where user is owner or member
- [ ] `GET /api/teams/:id` - Get team by ID (requires auth)
  - Verify: Only team members can access
  - Verify: Returns populated ownerId and members
- [ ] `PUT /api/teams/:id` - Update team (requires auth)
  - Verify: Only owner/admin can update
- [ ] `DELETE /api/teams/:id` - Delete team (requires auth)
  - Verify: Only owner can delete
- [ ] `POST /api/teams/:id/members` - Add member (requires auth)
  - Request: `{ email, role }`
  - Verify: Only owner/admin can add members
- [ ] `DELETE /api/teams/:id/members/:userId` - Remove member (requires auth)
  - Verify: Only owner/admin can remove
  - Verify: Cannot remove owner
- [ ] `PUT /api/teams/:id/members/:userId/role` - Update member role (requires auth)
  - Request: `{ role }`
  - Verify: Only owner can update roles
  - Verify: Cannot change owner role

#### 5.2 Channel Endpoints (`/api/channels`)
- [ ] `POST /api/channels` - Create channel (requires auth)
  - Request: `{ name, description, teamId, type }`
  - Verify: Only team members can create channels
- [ ] `GET /api/channels/team/:teamId` - Get team channels (requires auth)
  - Verify: Only team members can view channels
- [ ] `GET /api/channels/:id` - Get channel by ID (requires auth)
  - Verify: Only team members can access public channels
  - Verify: Only channel members can access private channels
- [ ] `PUT /api/channels/:id` - Update channel (requires auth)
  - Verify: Only team admin/owner can update
- [ ] `DELETE /api/channels/:id` - Delete channel (requires auth)
  - Verify: Only team admin/owner can delete
- [ ] `POST /api/channels/:id/members` - Add member to channel (requires auth)
  - Request: `{ userId }`
  - Verify: Only team admin/owner can add members
- [ ] `DELETE /api/channels/:id/members/:userId` - Remove member from channel (requires auth)
  - Verify: Only team admin/owner can remove members

---

### 6. **Error Handling & Edge Cases**

#### 6.1 Team Errors
- [ ] Try to create team with duplicate name → Should show error
- [ ] Try to access team settings as non-owner → Should show error/redirect
- [ ] Try to delete team as non-owner → Should fail
- [ ] Try to add non-existent user to team → Should show "User not found" error
- [ ] Try to add already-existing member → Should show error
- [ ] Try to remove owner → Should show error

#### 6.2 Channel Errors
- [ ] Try to create channel with duplicate name in same team → Should show error
- [ ] Try to access private channel you're not a member of → Should show error
- [ ] Try to access team channel when not a team member → Should show error

#### 6.3 Navigation
- [ ] Navigate to non-existent team → Should show error
- [ ] Navigate to non-existent channel → Should show error
- [ ] Logout and try to access protected pages → Should redirect to login

---

### 7. **UI/UX Verification**

#### 7.1 Visual Elements
- [ ] Verify: All buttons are clickable and properly styled
- [ ] Verify: Forms show validation errors
- [ ] Verify: Loading states are displayed during API calls
- [ ] Verify: Success messages appear after actions (alerts/alerts)
- [ ] Verify: Error messages are clear and helpful

#### 7.2 Responsiveness
- [ ] Test on different screen sizes (mobile, tablet, desktop)
- [ ] Verify: Sidebar works on mobile (if applicable)

#### 7.3 User Experience
- [ ] Verify: Navigation is smooth and intuitive
- [ ] Verify: Forms prevent submission with invalid data
- [ ] Verify: Confirmation dialogs appear for destructive actions (delete)
- [ ] Verify: Data refreshes after creating/updating/deleting

---

### 8. **Browser Console Checks**

#### 8.1 No Errors
- [ ] Open browser console (F12)
- [ ] Verify: No JavaScript errors
- [ ] Verify: No network errors (404, 500, etc.)
- [ ] Verify: No warnings about controlled/uncontrolled inputs

#### 8.2 Debug Logs (Optional)
- [ ] Check console logs for `isOwner check:` (if you see these, owner detection is working)
- [ ] Verify: No "Error checking owner:" logs (unless testing error cases)

---

## 🎯 Quick Test Scenario (Recommended Flow)

1. **Register/Login** → Create account or login
2. **Create Team** → Navigate to Teams → Create new team → Verify redirected to workspace
3. **Create Channel** → In workspace, click "+" → Create public channel → Verify appears in list
4. **Team Settings** → Click "Team Settings" button → Verify can access (as owner)
5. **Add Member** → In Members tab → Add member by email → Verify member appears
6. **Update Role** → Change member role using dropdown → Verify update
7. **Remove Member** → Remove member → Verify removal
8. **Delete Team** → In General tab → Delete team → Verify deletion

---

## 📝 Notes

- All endpoints require authentication (JWT token in Authorization header)
- Team owner has full control over team and members
- Team admins can manage members but cannot delete team
- Regular members can only view and create channels
- Private channels require explicit membership

---

## ✅ Completion Criteria

Phase 2 is complete when:
- ✅ All checklist items above pass
- ✅ No console errors in browser
- ✅ All API endpoints return correct responses
- ✅ UI matches expected behavior
- ✅ Edge cases are handled gracefully
- ✅ User can successfully create teams, manage members, and create channels

