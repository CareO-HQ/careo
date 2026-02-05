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

2. **Supabase Database Layer** (Application Data)
   - Stores user preferences (`active_team_id` in `users` table)
   - Tracks team memberships (`team_members` table)
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

### 2. Supabase Database Tables

#### `users` Table
- **Purpose**: Application-specific user data and preferences
- **Key Fields**:
  - `id` (UUID): PostgreSQL primary key (references `auth.users.id`)
  - `email` (string): User email (indexed)
  - `name` (string, optional): User name
  - `active_team_id` (UUID, optional): **Currently selected team ID** (indexed)
  - `active_organization_id` (UUID, optional): Currently active organization ID
  - `is_onboarding_complete` (boolean): Whether user completed onboarding
  - `image` (string, optional): Profile image URL
  - `phone` (string, optional): Phone number

**Critical Field**: `active_team_id` determines which team is currently selected/active for the user in the UI.

#### `team_members` Table
- **Purpose**: Tracks which users belong to which teams
- **Key Fields**:
  - `id` (UUID): PostgreSQL primary key
  - `user_id` (UUID): User ID (references `users.id`, indexed)
  - `team_id` (UUID): Team ID (references `teams.id`, indexed)
  - `organization_id` (UUID): Organization ID (indexed)
  - `role` (string, optional): User role in this team
  - `email` (string, optional): User email for fallback lookup
  - `created_at` (timestamp): When membership was created
  - `created_by` (UUID): User ID who created the membership

**Indexes**:
- `idx_team_members_user_id`: Find all teams for a user
- `idx_team_members_team_id`: Find all members of a team
- `idx_team_members_user_team`: Check if user is in specific team (composite index)
- `idx_team_members_organization`: Find all team memberships in an organization

#### `invitation_metadata` Table
- **Purpose**: Stores team assignment information from invitations
- **Key Fields**:
  - `id` (UUID): PostgreSQL primary key
  - `invitation_id` (UUID): Invitation ID (indexed)
  - `team_id` (UUID, optional): Team ID user was invited to
  - `organization_id` (UUID): Organization ID (indexed)

---

## Team Display Logic

### How Teams Are Shown to Care Assistants

#### 1. Getting Available Teams

**Query**: Server action or API route to get teams for current user

**Logic**:
```typescript
// Pseudo-code
1. Get current user from Supabase Auth session
2. Get active_organization_id from users table
3. Get current user's member record (to verify organization membership)
4. Query all teams in the active organization from Supabase
5. Filter out teams with same name as organization (default teams)
6. Return list of teams with: { id, name, organization_id, created_at }
```

**Important**: All roles (managers, owners, nurses, care assistants) can see **all teams** in their active organization. There's no filtering by team membership for display purposes.

#### 2. Getting Currently Active Team

**Query**: Server action or API route to get current user

**Logic**:
```typescript
// Pseudo-code
1. Get Supabase Auth user metadata
2. Get user record from Supabase users table
3. If user.active_team_id exists:
   - Query Supabase teams table for team details
   - Return: { id, name, organization_id }
4. Return active_team_id and activeTeam object
```

**Key Point**: The `active_team_id` from the `users` table determines which team is currently selected.

#### 3. Display in UI

**Component**: `TeamSwitcher`

**Display Logic**:
- **Organization Name**: Shown as primary text (e.g., "Sunset Care Home")
- **Active Team Name**: Shown as secondary text (e.g., "Unit A")
- **Fallback**: If no active team, shows user email

**Team List**:
- Shows all teams in the active organization
- Highlights the currently active team (where `active_team_id === team.id`)
- Shows "Active" label next to selected team

---

## Team Switching Logic

### Overview

When a care assistant switches teams, the system:
1. Validates the team exists and belongs to the active organization
2. Updates `active_team_id` in the `users` table via Supabase
3. Ensures the user is in the `team_members` table for that team
4. All subsequent queries filter by the new `active_team_id`

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

**Server Action**: `updateActiveTeam`

**Validation Steps**:
1. Get user identity from Supabase Auth session
2. Get current user record to find `active_organization_id`
3. Verify team exists in Supabase `teams` table
4. Verify team belongs to active organization
5. Find user record from Supabase users table

#### Step 3: Update Active Team ID

**Action**: Update `users.active_team_id`

```typescript
await supabase
  .from("users")
  .update({ active_team_id: teamId })
  .eq("id", userId);
```

**Result**: This is the **critical update** that changes which team is active.

#### Step 4: Ensure Team Membership

**Action**: Check/add entry to `team_members` table

**Logic**:
```typescript
// Check if user is already in team
const { data: existingTeamMember } = await supabase
  .from("team_members")
  .select("*")
  .eq("user_id", userId)
  .eq("team_id", teamId)
  .single();

if (!existingTeamMember) {
  // Add user to team_members table
  await supabase.from("team_members").insert({
    user_id: userId,
    team_id: teamId,
    organization_id: organizationId,
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
- `"User not found in database"`: User record missing

**Side Effects**:
- Updates `users.active_team_id`
- Creates/updates `team_members` entry
- All subsequent queries filter by new `active_team_id`

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
- Clears `users.active_team_id` (sets to `NULL`)
- Updates `users.active_organization_id`
- User must select a team after switching organizations

#### 3. Clear Active Team

**Endpoint**: Server action or API route to clear active team

**Args**: `{}`

**Returns**:
```typescript
{
  success: true
}
```

**Side Effects**:
- Sets `users.active_team_id` to `NULL`

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
│  Get Current User API   │
└────────┬─────────────────┘
         │
         ├─► Get Supabase Auth user
         ├─► Get Supabase users table
         │   └─► Read active_team_id
         │
         └─► If active_team_id exists:
             └─► Query Supabase teams table
                 └─► Return team details
         
         │ 2. Query: getTeamsForCurrentUser
         ▼
┌──────────────────────────────┐
│ Get Teams For Current User API│
└────────┬─────────────────────┘
         │
         ├─► Get users.active_organization_id
         └─► Query Supabase teams table
             └─► Filter by organization_id
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
         ├─► 4. Update users.active_team_id
         │   └─► UPDATE users SET active_team_id = teamId
         │
         └─► 5. Ensure team_members entry
             ├─► Check if exists (user_id + team_id)
             └─► If not: INSERT INTO team_members
         
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
│  Supabase Query/RLS     │
└────────┬────────────────┘
         │
         ├─► Get currentUser.active_team_id
         │   └─► From users table
         │
         └─► Filter data by active_team_id (via RLS or query)
             ├─► Residents (by team_id)
             ├─► Notifications (by team_id)
             ├─► Appointments (by team_id)
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
const supabase = createClient();
const { data: currentUser } = await supabase
  .from("users")
  .select("*, active_team:teams!active_team_id(*)")
  .single();

// 2. Get available teams
const { data: teams } = await supabase
  .from("teams")
  .select("*")
  .eq("organization_id", currentUser.active_organization_id);

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
const { data: teams } = useSupabaseQuery(
  supabase.from("teams").select("*")
);

// Display
<TeamSwitcher>
  <OrganizationName>{orgName}</OrganizationName>
  <ActiveTeamName>
    {activeTeam?.name || userEmail}
  </ActiveTeamName>
  
  <TeamList>
    {teams?.map(team => (
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
    // Call server action or API route
    const result = await updateActiveTeam({ teamId });
    
    if (result.success) {
      // Refresh data
      // All queries will now filter by new active_team_id
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
const supabase = createClient();
const { data: currentUser } = await supabase
  .from("users")
  .select("active_team_id")
  .single();
const activeTeamId = currentUser?.active_team_id;

// Query data with team filter
if (activeTeamId) {
  const { data: residents } = await supabase
    .from("residents")
    .select("*")
    .eq("team_id", activeTeamId);
  
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("team_id", activeTeamId);
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
  const supabase = createClient();
  const { data: user } = await supabase
    .from("users")
    .select("*, active_team:teams!active_team_id(*)")
    .single();
  const { data: teamsList } = await supabase
    .from("teams")
    .select("*")
    .eq("organization_id", user.active_organization_id);
  
  setActiveTeam(user.active_team);
  setTeams(teamsList);
};

// On team switch
const handleTeamSwitch = async (teamId: string) => {
  await updateActiveTeam({ teamId });
  
  // Reload user data to get updated activeTeam
  await loadUserData();
  
  // Reload all team-specific data
  refreshTeamData(teamId);
};
```

### 8. Offline Support

**Considerations**:
- Cache `active_team_id` locally
- Cache team list
- On reconnect, verify `active_team_id` is still valid
- Sync team switch when back online

---

## Key Takeaways for Mobile Developers

1. **`active_team_id` is the source of truth**: The `users.active_team_id` field determines which team is currently selected.

2. **Team membership is separate**: The `team_members` table tracks which teams a user belongs to, but doesn't determine which team is active.

3. **All teams are visible**: Care assistants can see all teams in their organization, not just teams they're members of.

4. **Switching is immediate**: When `active_team_id` is updated, all subsequent queries should filter by the new team.

5. **Organization switching clears team**: When switching organizations, `active_team_id` is cleared and must be set again.

6. **Automatic membership**: Switching to a team automatically adds the user to `team_members` if not already present.

7. **Session-based organization**: The active organization comes from the Supabase Auth session and `users.active_organization_id` field.

---

## Testing Checklist

- [ ] User can see all teams in their organization
- [ ] Currently active team is highlighted
- [ ] Switching teams updates `active_team_id`
- [ ] Data filters correctly after team switch
- [ ] Switching organizations clears `active_team_id`
- [ ] User is added to `team_members` when switching
- [ ] Handles case where user has no active team
- [ ] Handles case where team no longer exists
- [ ] Handles offline/online transitions

---

## Additional Resources

- **Supabase Realtime**: All queries can use real-time subscriptions to update automatically when data changes
- **Supabase Auth**: Session management and user authentication
- **RLS Policies**: Row Level Security enforces data access at the database level
- **Error Handling**: All server actions return success/error objects
- **Logging**: Backend includes extensive logging for debugging

---

## Version History

- **v1.0** (2024): Initial documentation for mobile app implementation
- Includes team display, switching logic, and database schema details
