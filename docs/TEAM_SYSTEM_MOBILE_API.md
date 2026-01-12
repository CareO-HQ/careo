# Team System Documentation for Mobile App Implementation

## Overview

This document provides a comprehensive guide to how teams (Units/Houses) are displayed to care assistants and nurses, which database tables are involved, and how the team switching logic works. This documentation is designed to help implement a mobile app that uses the same backend system.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Tables](#database-tables)
3. [Team Display Logic](#team-display-logic)
4. [Team Switching Logic](#team-switching-logic)
5. [API Endpoints](#api-endpoints)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Mobile App Implementation Guide](#mobile-app-implementation-guide)

---

## System Architecture

### Core Components

The team system consists of three main layers:

1. **Better Auth Layer** (Authentication & Organization Management)
   - Manages users, sessions, organizations, and teams
   - Stores core authentication and organization data
   - Provides session management with `activeOrganizationId`

2. **Convex Database Layer** (Application Data)
   - Stores user preferences (`activeTeamId`)
   - Tracks team memberships (`teamMembers` table)
   - Manages invitation metadata

3. **Frontend/Mobile Layer**
   - Displays teams based on user role
   - Handles team switching UI
   - Filters data based on active team/organization

---

## Database Tables

### 1. Better Auth Tables (Managed by Better Auth Component)

#### `user` Table
- **Purpose**: Core user authentication data
- **Key Fields**:
  - `id` (string): Unique user identifier (Better Auth user ID)
  - `email` (string): User email address
  - `name` (string): User's full name
  - `image` (string, optional): Profile image URL
  - `phoneNumber` (string, optional): Phone number

#### `organization` Table
- **Purpose**: Represents care homes/organizations
- **Key Fields**:
  - `id` (string): Unique organization identifier
  - `name` (string): Organization name (e.g., "Sunset Care Home")
  - `createdAt` (number): Creation timestamp

#### `team` Table
- **Purpose**: Represents units/houses within an organization
- **Key Fields**:
  - `id` (string): Unique team identifier
  - `name` (string): Team name (e.g., "Unit A", "House 1")
  - `organizationId` (string): Parent organization ID
  - `createdAt` (number): Creation timestamp

#### `member` Table
- **Purpose**: Links users to organizations with roles
- **Key Fields**:
  - `id` (string): Unique member identifier
  - `userId` (string): Reference to `user.id`
  - `organizationId` (string): Reference to `organization.id`
  - `role` (string): User role (`owner`, `manager`, `nurse`, `care_assistant`)
  - `createdAt` (number): Creation timestamp

#### `session` Table
- **Purpose**: Active user sessions
- **Key Fields**:
  - `token` (string): Session token
  - `userId` (string): Reference to `user.id`
  - `activeOrganizationId` (string): Currently active organization
  - `expiresAt` (number): Session expiration timestamp

### 2. Convex Database Tables

#### `users` Table
- **Purpose**: Application-specific user data and preferences
- **Key Fields**:
  - `_id` (Id<"users">): Convex document ID
  - `email` (string): User email (indexed: `byEmail`)
  - `name` (string, optional): User name
  - `activeTeamId` (string, optional): **Currently selected team ID** (indexed: `byActiveTeamId`)
  - `isOnboardingComplete` (boolean): Whether user completed onboarding
  - `image` (string, optional): Profile image URL
  - `phone` (string, optional): Phone number

**Critical Field**: `activeTeamId` determines which team is currently selected/active for the user in the UI.

#### `teamMembers` Table
- **Purpose**: Tracks which users belong to which teams
- **Key Fields**:
  - `_id` (Id<"teamMembers">): Convex document ID
  - `userId` (string): Better Auth user ID (indexed: `byUserId`)
  - `teamId` (string): Team ID (indexed: `byTeamId`)
  - `organizationId` (string): Organization ID (indexed: `byOrganization`)
  - `role` (string, optional): User role in this team
  - `email` (string, optional): User email for fallback lookup
  - `createdAt` (number): When membership was created
  - `createdBy` (string): User ID who created the membership

**Indexes**:
- `byUserId`: Find all teams for a user
- `byTeamId`: Find all members of a team
- `byUserAndTeam`: Check if user is in specific team (composite index)
- `byOrganization`: Find all team memberships in an organization

#### `invitationMetadata` Table
- **Purpose**: Stores team assignment information from invitations
- **Key Fields**:
  - `_id` (Id<"invitationMetadata">): Convex document ID
  - `invitationId` (string): Better Auth invitation ID (indexed: `byInvitationId`)
  - `teamId` (string, optional): Team ID user was invited to
  - `organizationId` (string): Organization ID (indexed: `byOrganization`)

---

## Team Display Logic

### How Teams Are Shown to Care Assistants

#### 1. Getting Available Teams

**Query**: `api.auth.getTeamsForCurrentUser`

**Logic**:
```typescript
// Pseudo-code
1. Get current session (Better Auth)
2. Get activeOrganizationId from session
3. Get current user's member record (to verify organization membership)
4. Query all teams in the active organization
5. Filter out teams with same name as organization (default teams)
6. Return list of teams with: { id, name, organizationId, createdAt }
```

**Important**: All roles (managers, owners, nurses, care assistants) can see **all teams** in their active organization. There's no filtering by team membership for display purposes.

#### 2. Getting Currently Active Team

**Query**: `api.auth.getCurrentUser`

**Logic**:
```typescript
// Pseudo-code
1. Get Better Auth user metadata
2. Get Convex user record by email
3. If user.activeTeamId exists:
   - Query Better Auth team table for team details
   - Return: { id, name, organizationId }
4. Return activeTeamId and activeTeam object
```

**Key Point**: The `activeTeamId` from the `users` table determines which team is currently selected.

#### 3. Display in UI

**Component**: `TeamSwitcher`

**Display Logic**:
- **Organization Name**: Shown as primary text (e.g., "Sunset Care Home")
- **Active Team Name**: Shown as secondary text (e.g., "Unit A")
- **Fallback**: If no active team, shows user email

**Team List**:
- Shows all teams in the active organization
- Highlights the currently active team (where `activeTeamId === team.id`)
- Shows "Active" label next to selected team

---

## Team Switching Logic

### Overview

When a care assistant switches teams, the system:
1. Validates the team exists and belongs to the active organization
2. Updates `activeTeamId` in the `users` table
3. Ensures the user is in the `teamMembers` table for that team
4. All subsequent queries filter by the new `activeTeamId`

### Detailed Flow

#### Step 1: User Initiates Team Switch

**Action**: User clicks on a team in the team switcher dropdown

**Frontend Code**:
```typescript
const handleTeamClick = async (teamId: string) => {
  await updateActiveTeam({ teamId });
};
```

#### Step 2: Validation (Backend)

**Mutation**: `api.auth.updateActiveTeam`

**Validation Steps**:
1. Get user identity from session
2. Get current session to find `activeOrganizationId`
3. Verify team exists in Better Auth `team` table
4. Verify team belongs to active organization
5. Find Convex user record by email

#### Step 3: Update Active Team ID

**Action**: Update `users.activeTeamId`

```typescript
await ctx.db.patch(convexUser._id, {
  activeTeamId: teamId
});
```

**Result**: This is the **critical update** that changes which team is active.

#### Step 4: Ensure Team Membership

**Action**: Check/add entry to `teamMembers` table

**Logic**:
```typescript
// Check if user is already in team
const existingTeamMember = await ctx.db
  .query("teamMembers")
  .withIndex("byUserAndTeam", (q) =>
    q.eq("userId", userId).eq("teamId", teamId)
  )
  .first();

if (!existingTeamMember) {
  // Add user to teamMembers table
  await ctx.db.insert("teamMembers", {
    userId: userId,
    teamId: teamId,
    organizationId: organizationId,
    role: member.role,
    email: userEmail,
    createdAt: Date.now(),
    createdBy: userId
  });
} else {
  // Update role/email if missing
  // (ensures data consistency)
}
```

**Why This Matters**: The `teamMembers` table is used by managers to see which staff members are in which teams.

#### Step 5: Return Success

**Response**:
```typescript
{
  success: true,
  activeTeamId: teamId
}
```

### Organization Switching

**Mutation**: `api.auth.setActiveOrganization`

**Logic**:
1. Clear `activeTeamId` (set to `undefined`)
2. Update session `activeOrganizationId`
3. User must then select a team within the new organization

**Important**: Switching organizations **always clears** the active team.

---

## API Endpoints

### Queries (Read Operations)

#### 1. Get Current User with Active Team

**Endpoint**: `api.auth.getCurrentUser`

**Args**: `{}`

**Returns**:
```typescript
{
  id: string,
  email: string,
  name: string,
  activeTeamId: string | null,
  activeTeam: {
    id: string,
    name: string,
    organizationId: string
  } | null,
  activeOrganizationId: string | null,
  activeOrganization: {
    id: string,
    name: string
  } | null,
  isOnboardingComplete: boolean,
  // ... other user fields
}
```

**Usage**: Get the currently active team and organization for the logged-in user.

#### 2. Get Teams for Current User

**Endpoint**: `api.auth.getTeamsForCurrentUser`

**Args**: `{}`

**Returns**:
```typescript
Array<{
  id: string,
  name: string,
  organizationId: string,
  createdAt: number
}>
```

**Usage**: Get all teams available in the active organization. Used to populate the team switcher dropdown.

**Note**: Returns all teams in the active organization, regardless of whether the user is a member.

#### 3. Get Teams with Member Counts

**Endpoint**: `api.auth.getTeamsWithMembers`

**Args**: `{}`

**Returns**:
```typescript
Array<{
  id: string,
  name: string,
  organizationId: string,
  memberCount: number
}>
```

**Usage**: Get teams with member counts (typically used by managers/owners).

### Mutations (Write Operations)

#### 1. Update Active Team

**Endpoint**: `api.auth.updateActiveTeam`

**Args**:
```typescript
{
  teamId: string
}
```

**Returns**:
```typescript
{
  success: true,
  activeTeamId: string
}
```

**Errors**:
- `"No active session found"`: User not authenticated
- `"No active organization found"`: No organization in session
- `"Team not found"`: Team doesn't exist
- `"Team does not belong to the active organization"`: Team is in different org
- `"User not found in Convex database"`: User record missing

**Side Effects**:
- Updates `users.activeTeamId`
- Creates/updates `teamMembers` entry
- All subsequent queries filter by new `activeTeamId`

#### 2. Set Active Organization

**Endpoint**: `api.auth.setActiveOrganization`

**Args**:
```typescript
{
  organizationId: string
}
```

**Returns**:
```typescript
{
  success: true,
  organizationId: string,
  teamCleared: true
}
```

**Side Effects**:
- Clears `users.activeTeamId` (sets to `undefined`)
- Updates session `activeOrganizationId`
- User must select a team after switching organizations

#### 3. Clear Active Team

**Endpoint**: `api.auth.clearActiveTeam`

**Args**: `{}`

**Returns**:
```typescript
{
  success: true
}
```

**Side Effects**:
- Sets `users.activeTeamId` to `undefined`

---

## Data Flow Diagrams

### Team Display Flow

```
┌─────────────────┐
│  Mobile App UI  │
└────────┬────────┘
         │
         │ 1. Query: getCurrentUser
         ▼
┌─────────────────────────┐
│  api.auth.getCurrentUser │
└────────┬─────────────────┘
         │
         ├─► Get Better Auth user
         ├─► Get Convex users table (byEmail)
         │   └─► Read activeTeamId
         │
         └─► If activeTeamId exists:
             └─► Query Better Auth team table
                 └─► Return team details
         
         │ 2. Query: getTeamsForCurrentUser
         ▼
┌──────────────────────────────┐
│ api.auth.getTeamsForCurrentUser│
└────────┬─────────────────────┘
         │
         ├─► Get session.activeOrganizationId
         └─► Query Better Auth team table
             └─► Filter by organizationId
                 └─► Return all teams
```

### Team Switching Flow

```
┌─────────────────┐
│  Mobile App UI  │
│  User clicks    │
│  team in list   │
└────────┬────────┘
         │
         │ updateActiveTeam({ teamId })
         ▼
┌─────────────────────────┐
│ api.auth.updateActiveTeam│
└────────┬────────────────┘
         │
         ├─► 1. Validate session
         ├─► 2. Verify team exists
         ├─► 3. Verify team in org
         │
         ├─► 4. Update users.activeTeamId
         │   └─► ctx.db.patch(users._id, { activeTeamId })
         │
         └─► 5. Ensure teamMembers entry
             ├─► Check if exists (byUserAndTeam index)
             └─► If not: insert teamMembers record
         
         │ Return success
         ▼
┌─────────────────┐
│  Mobile App UI  │
│  Refresh data   │
│  Show new team  │
└─────────────────┘
```

### Data Filtering Flow (After Team Switch)

```
┌─────────────────┐
│  Mobile App     │
│  Requests data  │
└────────┬────────┘
         │
         │ Query with teamId parameter
         ▼
┌─────────────────────────┐
│  Convex Query Function  │
└────────┬────────────────┘
         │
         ├─► Get currentUser.activeTeamId
         │   └─► From users table
         │
         └─► Filter data by activeTeamId
             ├─► Residents (by teamId)
             ├─► Notifications (by teamId)
             ├─► Appointments (by teamId)
             └─► Other team-specific data
```

---

## Mobile App Implementation Guide

### 1. Authentication Setup

**Required**: Better Auth session management

**Steps**:
1. Authenticate user (sign in/sign up)
2. Get session token
3. Store session token securely
4. Include session token in all API requests

### 2. Initial Load Sequence

**On App Launch**:

```typescript
// 1. Get current user with active team
const currentUser = await convex.query(api.auth.getCurrentUser, {});

// 2. Get available teams
const teams = await convex.query(api.auth.getTeamsForCurrentUser, {});

// 3. Display in UI
// - Show organization name
// - Show active team name (or email if no team)
// - Show list of available teams
```

### 3. Team Switcher UI

**Display**:
- Organization name (primary text)
- Active team name (secondary text, or email if no team)
- Dropdown/list of available teams
- Highlight currently active team

**Implementation**:
```typescript
// Get current state
const { activeTeamId, activeTeam } = useActiveTeam();
const teams = useQuery(api.auth.getTeamsForCurrentUser, {});

// Display
<TeamSwitcher>
  <OrganizationName>{orgName}</OrganizationName>
  <ActiveTeamName>
    {activeTeam?.name || userEmail}
  </ActiveTeamName>
  
  <TeamList>
    {teams.map(team => (
      <TeamItem
        key={team.id}
        selected={activeTeamId === team.id}
        onPress={() => switchTeam(team.id)}
      >
        {team.name}
        {activeTeamId === team.id && <ActiveBadge />}
      </TeamItem>
    ))}
  </TeamList>
</TeamSwitcher>
```

### 4. Team Switching Implementation

**Function**:
```typescript
const switchTeam = async (teamId: string) => {
  try {
    // Call mutation
    const result = await convex.mutation(api.auth.updateActiveTeam, {
      teamId: teamId
    });
    
    if (result.success) {
      // Refresh data
      // All queries will now filter by new activeTeamId
      refreshData();
      
      // Show success message
      showToast("Team switched successfully");
    }
  } catch (error) {
    // Handle errors
    showError(error.message);
  }
};
```

### 5. Data Filtering

**Important**: After switching teams, all data queries should filter by `activeTeamId`.

**Pattern**:
```typescript
// Get active team first
const currentUser = await convex.query(api.auth.getCurrentUser, {});
const activeTeamId = currentUser?.activeTeamId;

// Query data with team filter
if (activeTeamId) {
  const residents = await convex.query(api.residents.getByTeam, {
    teamId: activeTeamId
  });
  
  const notifications = await convex.query(api.notifications.getByTeam, {
    teamId: activeTeamId
  });
}
```

### 6. Handling Edge Cases

#### No Active Team

**Scenario**: User has no `activeTeamId` set

**Solution**:
- Show user email instead of team name
- Prompt user to select a team
- Filter data by organization (if manager) or show all teams

#### Team No Longer Exists

**Scenario**: User's `activeTeamId` points to deleted team

**Solution**:
- Check if team exists when loading
- If not found, clear `activeTeamId`
- Prompt user to select a new team

#### User Not in Team

**Scenario**: User switches to team they're not a member of

**Solution**:
- `updateActiveTeam` automatically adds user to `teamMembers`
- No additional action needed

### 7. State Management

**Recommended Pattern**:

```typescript
// Global state
const [activeTeam, setActiveTeam] = useState(null);
const [teams, setTeams] = useState([]);

// On mount
useEffect(() => {
  loadUserData();
}, []);

const loadUserData = async () => {
  const user = await convex.query(api.auth.getCurrentUser, {});
  const teamsList = await convex.query(api.auth.getTeamsForCurrentUser, {});
  
  setActiveTeam(user.activeTeam);
  setTeams(teamsList);
};

// On team switch
const handleTeamSwitch = async (teamId: string) => {
  await convex.mutation(api.auth.updateActiveTeam, { teamId });
  
  // Reload user data to get updated activeTeam
  await loadUserData();
  
  // Reload all team-specific data
  refreshTeamData(teamId);
};
```

### 8. Offline Support

**Considerations**:
- Cache `activeTeamId` locally
- Cache team list
- On reconnect, verify `activeTeamId` is still valid
- Sync team switch when back online

---

## Key Takeaways for Mobile Developers

1. **`activeTeamId` is the source of truth**: The `users.activeTeamId` field determines which team is currently selected.

2. **Team membership is separate**: The `teamMembers` table tracks which teams a user belongs to, but doesn't determine which team is active.

3. **All teams are visible**: Care assistants can see all teams in their organization, not just teams they're members of.

4. **Switching is immediate**: When `activeTeamId` is updated, all subsequent queries should filter by the new team.

5. **Organization switching clears team**: When switching organizations, `activeTeamId` is cleared and must be set again.

6. **Automatic membership**: Switching to a team automatically adds the user to `teamMembers` if not already present.

7. **Session-based organization**: The active organization comes from the Better Auth session, not from the Convex database.

---

## Testing Checklist

- [ ] User can see all teams in their organization
- [ ] Currently active team is highlighted
- [ ] Switching teams updates `activeTeamId`
- [ ] Data filters correctly after team switch
- [ ] Switching organizations clears `activeTeamId`
- [ ] User is added to `teamMembers` when switching
- [ ] Handles case where user has no active team
- [ ] Handles case where team no longer exists
- [ ] Handles offline/online transitions

---

## Additional Resources

- **Convex Queries**: All queries are reactive and update automatically when data changes
- **Better Auth**: Session management and organization/team CRUD operations
- **Error Handling**: All mutations return success/error objects
- **Logging**: Backend includes extensive logging for debugging

---

## Version History

- **v1.0** (2024): Initial documentation for mobile app implementation
- Includes team display, switching logic, and database schema details
