import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { components } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const getCurrentUserContext = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      return null;
    }

    // Get the active team if set
    let team: { id: string; name: string } | null = null;
    let organization: { id: string; name: string } | null = null;

    if (user.activeTeamId) {
      // Get team membership details
      const teamMember = await ctx.db
        .query("teamMembers")
        .withIndex("byUserAndTeam", (q) =>
          q.eq("userId", identity.subject).eq("teamId", user.activeTeamId!)
        )
        .first();

      if (teamMember) {
        team = {
          id: teamMember.teamId,
          name: teamMember.teamId // Use the team ID as name for now
        };

        organization = {
          id: teamMember.organizationId,
          name: teamMember.organizationId // Use organization ID as name for now
        };
      } else {
        // Fallback if no membership found
        team = {
          id: user.activeTeamId,
          name: user.activeTeamId
        };
      }
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        activeTeamId: user.activeTeamId
      },
      team,
      organization
    };
  },
});

// Get all users in an organization
export const getByOrganization = query({
  args: {
    organizationId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    console.log("getByOrganization called with:", args.organizationId);

    // Get all team members for this organization
    const teamMembers = await ctx.db
      .query("teamMembers")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    console.log("Found team members:", teamMembers.length);

    // Get unique user IDs (these are auth subject IDs)
    const userIds = [...new Set(teamMembers.map(tm => tm.userId))];
    console.log("Unique user IDs:", userIds);

    // Fetch all users using better-auth
    const results: Array<Record<string, unknown>> = [];
    for (const userId of userIds) {
      // Use better-auth to find user by ID
      const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "user",
        where: [{ field: "id", value: userId }]
      });

      if (authUser) {
        // Get our local user record
        const user = await ctx.db
          .query("users")
          .withIndex("byEmail", (q) => q.eq("email", authUser.email))
          .first();

        // Get user's image if available
        const userImage: { url: string | null; storageId: string } | null =
          await ctx.runQuery(api.files.image.getUserImageByUserId, {
            userId: userId
          });

        // Get user's team memberships in this organization
        const userTeamMemberships = teamMembers.filter(tm => tm.userId === userId);

        // Get role from first team membership
        const role = userTeamMemberships[0]?.role;

        results.push({
          _id: user?._id || authUser.id,
          _creationTime: user?._creationTime || Date.now(),
          email: authUser.email,
          name: user?.name || authUser.name,
          phone: user?.phone,
          imageUrl: userImage?.url || null,
          role: role,
          teamMemberships: userTeamMemberships
        });
      }
    }

    console.log("Returning results:", results.length);
    return results;
  },
});

// Get staff details by user ID (for local users table data)
export const getStaffDetailsByUserId = query({
  args: {
    userId: v.string() // Better-auth user ID
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    // Find user by better-auth user ID through email lookup
    const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "user",
      where: [{ field: "id", value: args.userId }]
    });

    if (!authUser) {
      return null;
    }

    // Get our local user record with staff details
    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", authUser.email))
      .first();

    return user || null;
  },
});

// Update staff details
export const updateStaffDetails = mutation({
  args: {
    userId: v.string(), // Better-auth user ID
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    dateOfJoin: v.optional(v.string()),
    rightToWorkStatus: v.optional(v.union(
      v.literal("verified"),
      v.literal("pending"),
      v.literal("expired"),
      v.literal("not_verified")
    )),
    nextOfKinName: v.optional(v.string()),
    nextOfKinRelationship: v.optional(v.string()),
    nextOfKinPhone: v.optional(v.string()),
    nextOfKinEmail: v.optional(v.string()),
    nextOfKinAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updateData } = args;

    // Find user by better-auth user ID
    const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
      model: "user",
      where: [{ field: "id", value: userId }]
    });

    if (!authUser) {
      throw new Error("User not found");
    }

    // Get our local user record
    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", authUser.email))
      .first();

    if (!user) {
      throw new Error("User record not found in local database");
    }

    // Update the user record with staff details
    await ctx.db.patch(user._id, updateData);

    // Also update phone in better-auth if provided
    if (updateData.phone) {
      await ctx.runMutation(components.betterAuth.lib.updateOne, {
        input: {
          model: "user",
          where: [{ field: "id", value: userId }],
          update: {
            phoneNumber: updateData.phone
          }
        }
      });
    }

    return { success: true, userId: user._id };
  },
});

// Get enriched organization members with extended fields (phone, etc.)
export const getEnrichedOrgMembers = query({
  args: {
    organizationId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    // Get current session to identify current user and exclude them from results
    const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
    const currentUserId = session?.userId || null;
    
    // Log session info for debugging
    console.log(`[getEnrichedOrgMembers] Session info:`, {
      hasSession: !!session,
      currentUserId: currentUserId,
      currentUserIdType: typeof currentUserId,
      sessionKeys: session ? Object.keys(session) : []
    });
    
    // Get organization members from better-auth
    const membersResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "member",
      where: [{ field: "organizationId", value: args.organizationId }],
      paginationOpts: {
        cursor: null,
        numItems: 100
      }
    });

    const members = membersResult?.page || [];
    const results: Array<Record<string, unknown>> = [];

    for (const member of members) {
      // Get user details from better-auth first to get email for comparison
      const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "user",
        where: [{ field: "id", value: member.userId }]
      });

      if (authUser) {
        // Skip current user - check by userId first, then by email as fallback
        const matchesByUserId = currentUserId && String(member.userId) === String(currentUserId);
        const matchesByEmail = session?.user && authUser.email === session.user.email;
        
        // Get current user's email from session if available
        let currentUserEmail: string | null = null;
        if (session?.user) {
          currentUserEmail = session.user.email;
        } else if (session?.userId) {
          // Try to get email from Better Auth user record
          try {
            const currentAuthUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
              model: "user",
              where: [{ field: "id", value: session.userId }]
            });
            currentUserEmail = currentAuthUser?.email || null;
          } catch (err) {
            // Ignore error
          }
        }
        const matchesByEmailFallback = currentUserEmail && authUser.email === currentUserEmail;
        
        if (matchesByUserId || matchesByEmail || matchesByEmailFallback) {
          console.log(`[getEnrichedOrgMembers] ⏭️ Skipping current user:`, {
            email: authUser.email,
            memberUserId: member.userId,
            currentUserId: currentUserId,
            matchesByUserId: matchesByUserId,
            matchesByEmail: matchesByEmail,
            matchesByEmailFallback: matchesByEmailFallback,
            currentUserEmail: currentUserEmail
          });
          continue;
        }
        
        // Get our local user record with extended fields
        const localUser = await ctx.db
          .query("users")
          .withIndex("byEmail", (q) => q.eq("email", authUser.email))
          .first();

        // Get user role from Better Auth member record - trust it as the source of truth
        // Only validate that it's a non-empty string, not that it's in a specific list
        let userRole: string | null | undefined = member.role;
        
        // Log initial role value for debugging
        console.log(`[getEnrichedOrgMembers] ========== ROLE RETRIEVAL START for ${authUser.email} ==========`);
        console.log(`[getEnrichedOrgMembers] Step 1: Initial member record check:`, {
          email: authUser.email,
          userId: member.userId,
          organizationId: args.organizationId,
          memberRole: member.role,
          memberRoleType: typeof member.role,
          memberRoleIsNull: member.role === null,
          memberRoleIsUndefined: member.role === undefined,
          memberRoleIsEmpty: member.role === '',
          memberRoleTrimmed: member.role?.trim(),
          memberRoleTrimmedLength: member.role?.trim()?.length,
          fullMember: member
        });
        
        // Check if member.role is a valid non-empty string
        // Trust Better Auth - don't validate against a specific list of roles
        const isMemberRoleValid = userRole && 
          typeof userRole === 'string' && 
          userRole.trim() !== '' && 
          userRole !== "unknown";
        
        console.log(`[getEnrichedOrgMembers] Step 1: Validation result:`, {
          isMemberRoleValid: isMemberRoleValid,
          checks: {
            exists: !!userRole,
            isString: typeof userRole === 'string',
            notEmpty: userRole?.trim() !== '',
            notUnknown: userRole !== "unknown"
          }
        });
        
        // If role is missing from member record, try to get it from teamMembers table
        if (!isMemberRoleValid) {
          console.log(`[getEnrichedOrgMembers] Step 2: Role missing/invalid in member record, trying teamMembers table...`);
          console.log(`[getEnrichedOrgMembers] Step 2: Query params:`, {
            userId: member.userId,
            organizationId: args.organizationId
          });
          
          try {
            // Query teamMembers table by userId and organizationId to find role
            const teamMembers = await ctx.db
              .query("teamMembers")
              .withIndex("byUserId", (q) => q.eq("userId", member.userId))
              .collect();
            
            console.log(`[getEnrichedOrgMembers] Step 2: Found ${teamMembers.length} teamMember records`);
            console.log(`[getEnrichedOrgMembers] Step 2: TeamMember records:`, teamMembers.map(tm => ({
              teamId: tm.teamId,
              organizationId: tm.organizationId,
              role: tm.role,
              roleType: typeof tm.role,
              matchesOrg: tm.organizationId === args.organizationId
            })));
            
            // Filter teamMembers by organizationId and get the first valid role (non-empty string)
            const orgTeamMember = teamMembers.find(tm => 
              tm.organizationId === args.organizationId && 
              tm.role && 
              typeof tm.role === 'string' && 
              tm.role.trim() !== ''
            );
            
            console.log(`[getEnrichedOrgMembers] Step 2: Organization match result:`, {
              orgTeamMemberFound: !!orgTeamMember,
              orgTeamMemberRole: orgTeamMember?.role,
              orgTeamMemberRoleType: typeof orgTeamMember?.role
            });
            
            if (orgTeamMember?.role) {
              userRole = orgTeamMember.role;
              console.log(`[getEnrichedOrgMembers] ✅ Step 2 SUCCESS: Found role from teamMembers table (org match): "${userRole}"`);
            } else {
              // Try to find any valid role from teamMembers
              console.log(`[getEnrichedOrgMembers] Step 2: No org match, trying any valid teamMember...`);
              const validTeamMember = teamMembers.find(tm => 
                tm.role && 
                typeof tm.role === 'string' && 
                tm.role.trim() !== ''
              );
              
              console.log(`[getEnrichedOrgMembers] Step 2: Any valid teamMember result:`, {
                validTeamMemberFound: !!validTeamMember,
                validTeamMemberRole: validTeamMember?.role,
                validTeamMemberRoleType: typeof validTeamMember?.role
              });
              
              if (validTeamMember?.role) {
                userRole = validTeamMember.role;
                console.log(`[getEnrichedOrgMembers] ✅ Step 2 SUCCESS: Found role from teamMembers table (fallback): "${userRole}"`);
              } else {
                console.log(`[getEnrichedOrgMembers] ⚠️ Step 2: No valid role found in teamMembers table`);
              }
            }
          } catch (error) {
            console.error(`[getEnrichedOrgMembers] ❌ Step 2 ERROR: Failed to get role from teamMembers table:`, {
              error: error,
              errorMessage: error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined
            });
          }
        } else {
          console.log(`[getEnrichedOrgMembers] ✅ Step 1 SUCCESS: Using role from Better Auth member record: "${userRole}"`);
          console.log(`[getEnrichedOrgMembers] Step 2: Skipped - role already valid from Step 1`);
        }
        
        // Only default to "care_assistant" if we've exhausted all options and confirmed no role exists
        console.log(`[getEnrichedOrgMembers] Step 3: Final validation and default check...`);
        console.log(`[getEnrichedOrgMembers] Step 3: Current state:`, {
          userRole: userRole,
          userRoleType: typeof userRole,
          userRoleIsNull: userRole === null,
          userRoleIsUndefined: userRole === undefined,
          userRoleIsEmpty: userRole === '',
          userRoleTrimmed: userRole?.trim(),
          needsDefault: !userRole || typeof userRole !== 'string' || userRole.trim() === ''
        });
        
        if (!userRole || typeof userRole !== 'string' || userRole.trim() === '') {
          console.warn(`[getEnrichedOrgMembers] ⚠️ Step 3: Role still missing after all attempts!`);
          console.warn(`[getEnrichedOrgMembers] Step 3: Attempt summary:`, {
            step1_memberRecord: member.role || 'no role in member',
            step2_teamMembers: 'checked but no valid role found',
            finalUserRole: userRole,
            defaultingTo: "care_assistant"
          });
          // Only use default if we truly have no role - log this as a data issue
          userRole = "care_assistant";
          console.warn(`[getEnrichedOrgMembers] ⚠️ Step 3: DEFAULTED to "care_assistant" as last resort`);
        } else {
          console.log(`[getEnrichedOrgMembers] ✅ Step 3: Role found, no default needed`);
        }
        
        // Final validation - ensure it's a string
        const finalRole = String(userRole).trim();
        console.log(`[getEnrichedOrgMembers] ========== ROLE RETRIEVAL END for ${authUser.email} ==========`);
        console.log(`[getEnrichedOrgMembers] FINAL RESULT:`, {
          email: authUser.email,
          userId: member.userId,
          originalUserRole: userRole,
          finalRole: finalRole,
          roleSource: member.role ? 'Better Auth member record' : 'teamMembers table or default'
        });
        
        userRole = finalRole;

        // Get user's image
        const userImage: { url: string | null; storageId: string } | null =
          await ctx.runQuery(api.files.image.getUserImageByUserId, {
            userId: member.userId
          });

        // Get team name from activeTeamId if available
        let teamName: string | undefined = undefined;
        if (localUser?.activeTeamId) {
          try {
            const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
              model: "team",
              where: [{ field: "id", value: localUser.activeTeamId }]
            });
            teamName = team?.name;
          } catch (error) {
            console.warn(`[getEnrichedOrgMembers] Failed to fetch team name for teamId ${localUser.activeTeamId}:`, error);
          }
        }

        // Final check - ensure role is a non-empty string before adding to results
        // At this point, userRole should already be validated and set (either from member.role, teamMember, or default)
        // userRole was already set to finalRole at line 429, so we can use it directly
        
        console.log(`[getEnrichedOrgMembers] Adding ${authUser.email} to results with role: "${userRole}"`);
        
        results.push({
          id: member.id,
          userId: member.userId,
          role: userRole, // Use validated role (already trimmed and set)
          organizationId: member.organizationId,
          createdAt: member.createdAt,
          user: {
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            image: userImage?.url || authUser.image,
          },
          // Extended fields from local database
          phone: localUser?.phone,
          address: localUser?.address,
          dateOfJoin: localUser?.dateOfJoin,
          rightToWorkStatus: localUser?.rightToWorkStatus,
          teamName: teamName, // Include team name so managers can see which unit/house each staff member belongs to
          activeTeamId: localUser?.activeTeamId, // Include activeTeamId for reference
        });
      }
    }

    // Log final results summary
    const roleSummary: Record<string, number> = {};
    results.forEach((result) => {
      const role = (result.role as string) || "unknown";
      roleSummary[role] = (roleSummary[role] || 0) + 1;
    });
    console.log(`[getEnrichedOrgMembers] Returning ${results.length} members with roles:`, roleSummary);
    
    // Log sample of results to verify role is present
    if (results.length > 0) {
      console.log(`[getEnrichedOrgMembers] Sample result (first member):`, {
        email: (results[0] as any).user?.email,
        role: (results[0] as any).role,
        roleType: typeof (results[0] as any).role,
        hasRole: !!(results[0] as any).role
      });
    }

    return results;
  },
});

// Get all users in a specific team
export const getByTeamId = query({
  args: {
    teamId: v.string()
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    console.log("getByTeamId called with teamId:", args.teamId);

    // Get current session to identify current user and exclude them from results
    const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
    const currentUserId = session?.userId || null;
    
    // Log session info for debugging
    console.log(`[getByTeamId] Session info:`, {
      hasSession: !!session,
      currentUserId: currentUserId,
      currentUserIdType: typeof currentUserId,
      sessionKeys: session ? Object.keys(session) : []
    });

    // Get all team members for this team from local table
    const teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("byTeamId", (q) => q.eq("teamId", args.teamId))
      .collect();

    console.log(`[getByTeamId] Found ${teamMembers.length} team members in local table for team ${args.teamId}`);
    if (teamMembers.length > 0) {
      console.log(`[getByTeamId] Team member userIds:`, teamMembers.map(tm => tm.userId));
      console.log(`[getByTeamId] Team member details:`, teamMembers.map(tm => ({ userId: tm.userId, role: tm.role, teamId: tm.teamId })));
    } else {
      console.log(`[getByTeamId] WARNING: No team members found in teamMembers table for team ${args.teamId}`);
    }

    // Fetch all users and filter by activeTeamId
    // Only show users whose activeTeamId matches the requested teamId
    // This ensures that when nurses/care assistants switch teams, they only appear in their current team
    const results: Array<Record<string, unknown>> = [];
    // Track which users have already been added to prevent duplicates
    // Use email as the unique identifier since userId might differ between teamMember entries
    const addedUserEmails = new Set<string>();
    for (const teamMember of teamMembers) {
      const userId = teamMember.userId;

      console.log(`Processing team member with userId: ${userId}`);

      // Try multiple methods to get user from Better Auth
      let authUser: any = null;
      
      // Method 1: Try findOne with id field
      try {
        authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "user",
          where: [{ field: "id", value: userId }]
        });
        if (authUser) {
          console.log(`[getByTeamId] ✓ Found user via findOne with id: ${authUser.email}`);
        }
      } catch (error) {
        console.warn(`[getByTeamId] findOne with id failed for userId ${userId}:`, error);
      }

      // Method 2: If that fails, try findMany and get first result
      if (!authUser) {
        try {
          const usersResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
            model: "user",
            where: [{ field: "id", value: userId }],
            paginationOpts: { cursor: null, numItems: 1 }
          });
          if (usersResult?.page && usersResult.page.length > 0) {
            authUser = usersResult.page[0];
            console.log(`[getByTeamId] ✓ Found user via findMany: ${authUser.email}`);
          }
        } catch (error) {
          console.warn(`[getByTeamId] findMany failed for userId ${userId}:`, error);
        }
      }

      // Method 3: If still no user, try to use email from teamMember or find user in local table by other means
      if (!authUser) {
        console.log(`[getByTeamId] User not found via Better Auth, trying fallback methods...`);
        let teamMemberEmail = teamMember.email;
        
        // If email not in teamMember, try to find user in local table by querying all users
        // and matching by checking if any user has this userId in their teamMembers
        if (!teamMemberEmail) {
          console.log(`[getByTeamId] Email not in teamMember, trying to find user in local table...`);
          
          // Try to find user by checking all teamMembers with this userId to get organization context
          // Then try to find the user by querying local users table
          // Actually, we can't easily match userId to email without Better Auth
          // So we'll need to skip this user until teamMembers is updated with email
          console.log(`[getByTeamId] ⚠️ Cannot find user without email - teamMember entry for userId ${userId} needs email update`);
          console.log(`[getByTeamId] Suggestion: User should switch teams again to trigger email update in teamMembers`);
          continue;
        }
        
        if (teamMemberEmail) {
          // Try to find user in local Convex table by email
          const localUser = await ctx.db
            .query("users")
            .withIndex("byEmail", (q) => q.eq("email", teamMemberEmail!))
            .first();
          
          if (localUser) {
            // Create a minimal authUser object from local user data
            authUser = {
              id: userId,
              email: localUser.email,
              name: localUser.name || undefined,
              image: localUser.image || undefined
            };
            console.log(`[getByTeamId] ✓ Found user via local table using email from teamMember: ${teamMemberEmail}`);
          } else {
            console.log(`[getByTeamId] ⚠️ User not found in local table either for email: ${teamMemberEmail}`);
            continue;
          }
        }
      }

      // Get our local user record to check activeTeamId
      const user = await ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", authUser.email))
        .first();

      console.log(`[getByTeamId] User record for ${authUser.email}:`, {
        found: !!user,
        activeTeamId: user?.activeTeamId,
        isOnboardingComplete: user?.isOnboardingComplete,
        requestedTeamId: args.teamId
      });

      // Filter logic: 
      // Show users if they're in teamMembers for this team AND:
      // 1. Their activeTeamId matches the requested teamId (they're currently active in this team), OR
      // 2. Their activeTeamId is null/undefined (they haven't switched teams yet - show in original team), OR
      // 3. User record not found (fallback - show them)
      // 
      // Exclude users ONLY if activeTeamId is explicitly set to a DIFFERENT team (they switched away)
      const userActiveTeamId = user?.activeTeamId;
      const shouldExclude = userActiveTeamId !== null && userActiveTeamId !== undefined && userActiveTeamId !== args.teamId;
      
      console.log(`[getByTeamId] Filter check for ${authUser.email}:`, {
        userActiveTeamId,
        requestedTeamId: args.teamId,
        shouldExclude,
        reason: shouldExclude ? `activeTeamId (${userActiveTeamId}) != requested teamId (${args.teamId})` : 'passing activeTeamId filter'
      });

      if (shouldExclude) {
        console.log(`[FILTER] Excluding user ${userId} (${authUser.email}) - activeTeamId (${userActiveTeamId}) != requested teamId (${args.teamId})`);
        continue;
      }

      // Skip current user - check by userId first, then by email as fallback
      // This handles cases where teamMember.userId might not match session.userId
      // We need authUser to be available for email comparison, so check after authUser is fetched
      if (!authUser) {
        // If we don't have authUser, we can't properly filter, so skip this iteration
        continue;
      }
      
      const matchesByUserId = currentUserId && String(userId) === String(currentUserId);
      
      // Get current user's email from session for email-based comparison
      let currentUserEmail: string | null = null;
      if (session?.user) {
        currentUserEmail = session.user.email;
      } else if (session?.userId) {
        // Try to get email from Better Auth user record
        try {
          const currentAuthUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
            model: "user",
            where: [{ field: "id", value: session.userId }]
          });
          currentUserEmail = currentAuthUser?.email || null;
        } catch (err) {
          // Ignore error, will use userId comparison only
        }
      }
      
      // Check if this user matches current user by email (fallback for when userId doesn't match)
      const matchesByEmail = currentUserEmail && authUser.email === currentUserEmail;
      
      if (matchesByUserId || matchesByEmail) {
        console.log(`[getByTeamId] ⏭️ Skipping current user:`, {
          email: authUser.email,
          userId: userId,
          currentUserId: currentUserId,
          matchesByUserId: matchesByUserId,
          matchesByEmail: matchesByEmail,
          currentUserEmail: currentUserEmail,
          note: matchesByEmail ? 'Matched by email (userId mismatch)' : 'Matched by userId'
        });
        continue;
      }
      
      // Include this user (passed activeTeamId filter)
      const inclusionReason = !user
        ? "user record not found (fallback)"
        : !userActiveTeamId
          ? "no activeTeamId set (original team)"
          : userActiveTeamId === args.teamId
            ? "activeTeamId matches"
            : "unknown";
      console.log(`[INCLUDE] User ${userId} (${authUser.email}) - Reason: ${inclusionReason}, activeTeamId: ${userActiveTeamId || 'null'}, teamId: ${args.teamId}`);

      // Get user role - prioritize Better Auth member record since roles are organization-level, not team-level
      // teamMember.role might be missing when users switch teams, so always check member record first
      let userRole: string | null | undefined = null;
      
      // Log initial values for debugging
      console.log(`[getByTeamId] ========== ROLE RETRIEVAL START for ${authUser.email} ==========`);
      console.log(`[getByTeamId] Initial state:`, {
        email: authUser.email,
        userId: userId,
        teamId: args.teamId,
        organizationId: teamMember.organizationId,
        teamMemberRole: teamMember.role,
        teamMemberRoleType: typeof teamMember.role,
        teamMemberRoleIsNull: teamMember.role === null,
        teamMemberRoleIsUndefined: teamMember.role === undefined,
        teamMemberRoleIsEmpty: teamMember.role === '',
        teamMemberFull: teamMember
      });
      
      // First, try to get role from Better Auth member record (organization-level, always accurate)
      // Try by userId first, then fallback to finding by email if userId doesn't match
      console.log(`[getByTeamId] Step 1: Attempting to fetch Better Auth member record...`);
      console.log(`[getByTeamId] Step 1a: Trying by userId...`);
      console.log(`[getByTeamId] Query params:`, {
        userId: userId,
        organizationId: teamMember.organizationId,
        userIdType: typeof userId,
        organizationIdType: typeof teamMember.organizationId
      });
      
      let member: any = null;
      try {
        member = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "member",
          where: [
            { field: "userId", value: userId },
            { field: "organizationId", value: teamMember.organizationId }
          ]
        });
        
        console.log(`[getByTeamId] Step 1a Result (by userId):`, {
          memberFound: !!member,
          memberId: member?.id,
          memberUserId: member?.userId,
          memberOrganizationId: member?.organizationId,
          memberRole: member?.role,
          memberRoleType: typeof member?.role
        });
      } catch (error) {
        console.error(`[getByTeamId] ❌ Step 1a ERROR: Failed to get member by userId:`, {
          error: error,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
      
      // If member not found by userId, try to find by email (fallback for when userId doesn't match)
      // This happens when users switch teams and teamMember.userId might be outdated
      if (!member) {
        console.log(`[getByTeamId] Step 1b: Member not found by userId, trying to find by email...`);
        console.log(`[getByTeamId] Step 1b: Looking for member with email: ${authUser.email}`);
        try {
          // Get all members in the organization and find the one matching the email
          const allMembers = await ctx.runQuery(components.betterAuth.lib.findMany, {
            model: "member",
            where: [{ field: "organizationId", value: teamMember.organizationId }],
            paginationOpts: { cursor: null, numItems: 100 }
          });
          
          console.log(`[getByTeamId] Step 1b: Found ${allMembers?.page?.length || 0} members in organization`);
          
          // Find member by matching user email
          if (allMembers?.page && allMembers.page.length > 0) {
            for (const orgMember of allMembers.page) {
              try {
                const orgUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
                  model: "user",
                  where: [{ field: "id", value: orgMember.userId }]
                });
                
                if (orgUser?.email === authUser.email) {
                  member = orgMember;
                  console.log(`[getByTeamId] ✅ Step 1b SUCCESS: Found member by email match:`, {
                    memberId: member.id,
                    memberUserId: member.userId,
                    memberRole: member.role,
                    matchedEmail: authUser.email,
                    note: `teamMember.userId (${userId}) != member.userId (${member.userId}) - using email match`
                  });
                  break;
                }
              } catch (err) {
                // Continue to next member if user lookup fails
                continue;
              }
            }
          }
          
          if (!member) {
            console.log(`[getByTeamId] ⚠️ Step 1b: No member found by email either`);
          }
        } catch (error) {
          console.error(`[getByTeamId] ❌ Step 1b ERROR: Failed to find member by email:`, {
            error: error,
            errorMessage: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Check if we found a member and extract role
      if (member?.role && 
          typeof member.role === 'string' && 
          member.role.trim() !== '') {
        userRole = member.role;
        console.log(`[getByTeamId] ✅ Step 1 SUCCESS: Found role from Better Auth member record: "${userRole}"`);
      } else {
        console.log(`[getByTeamId] ⚠️ Step 1: Member record found but role is invalid:`, {
          hasMember: !!member,
          memberRole: member?.role,
          memberRoleType: typeof member?.role,
          memberRoleLength: member?.role?.length,
          memberRoleTrimmed: member?.role?.trim(),
          memberRoleTrimmedLength: member?.role?.trim()?.length
        });
      }
      
      // Fallback to teamMember.role only if member record lookup failed or returned no role
      console.log(`[getByTeamId] Step 2: Checking if fallback to teamMember.role is needed...`);
      console.log(`[getByTeamId] Current userRole value:`, {
        userRole: userRole,
        userRoleType: typeof userRole,
        userRoleIsNull: userRole === null,
        userRoleIsUndefined: userRole === undefined,
        userRoleIsEmpty: userRole === '',
        needsFallback: !userRole || typeof userRole !== 'string' || userRole.trim() === ''
      });
      
      if (!userRole || typeof userRole !== 'string' || userRole.trim() === '') {
        const teamMemberRole = teamMember.role;
        console.log(`[getByTeamId] Step 2: Evaluating teamMember.role as fallback:`, {
          teamMemberRole: teamMemberRole,
          teamMemberRoleType: typeof teamMemberRole,
          teamMemberRoleIsNull: teamMemberRole === null,
          teamMemberRoleIsUndefined: teamMemberRole === undefined,
          teamMemberRoleIsEmpty: teamMemberRole === '',
          teamMemberRoleTrimmed: teamMemberRole?.trim(),
          teamMemberRoleIsUnknown: teamMemberRole === "unknown"
        });
        
        const isTeamMemberRoleValid = teamMemberRole && 
          typeof teamMemberRole === 'string' && 
          teamMemberRole.trim() !== '' && 
          teamMemberRole !== "unknown";
        
        console.log(`[getByTeamId] Step 2: teamMember.role validation result:`, {
          isTeamMemberRoleValid: isTeamMemberRoleValid,
          checks: {
            exists: !!teamMemberRole,
            isString: typeof teamMemberRole === 'string',
            notEmpty: teamMemberRole?.trim() !== '',
            notUnknown: teamMemberRole !== "unknown"
          }
        });
        
        if (isTeamMemberRoleValid) {
          userRole = teamMemberRole;
          console.log(`[getByTeamId] ✅ Step 2 SUCCESS: Using role from teamMember (fallback): "${userRole}"`);
        } else {
          console.log(`[getByTeamId] ⚠️ Step 2: teamMember.role is also invalid, cannot use as fallback`);
        }
      } else {
        console.log(`[getByTeamId] Step 2: Skipped - userRole already set from Step 1: "${userRole}"`);
      }
      
      // Only default to "care_assistant" if we've exhausted all options and confirmed no role exists
      console.log(`[getByTeamId] Step 3: Final validation and default check...`);
      console.log(`[getByTeamId] Step 3: Current state:`, {
        userRole: userRole,
        userRoleType: typeof userRole,
        userRoleIsNull: userRole === null,
        userRoleIsUndefined: userRole === undefined,
        userRoleIsEmpty: userRole === '',
        userRoleTrimmed: userRole?.trim(),
        needsDefault: !userRole || typeof userRole !== 'string' || userRole.trim() === ''
      });
      
      if (!userRole || typeof userRole !== 'string' || userRole.trim() === '') {
        console.warn(`[getByTeamId] ⚠️ Step 3: Role still missing after all attempts!`);
        console.warn(`[getByTeamId] Step 3: Attempt summary:`, {
          step1_memberRecord: member ? (member.role || 'no role in member') : 'member not found',
          step2_teamMemberRole: teamMember.role || 'no role in teamMember',
          finalUserRole: userRole,
          defaultingTo: "care_assistant"
        });
        // Only use default if we truly have no role - log this as a data issue
        userRole = "care_assistant";
        console.warn(`[getByTeamId] ⚠️ Step 3: DEFAULTED to "care_assistant" as last resort`);
      } else {
        console.log(`[getByTeamId] ✅ Step 3: Role found, no default needed`);
      }
      
      // Final validation - ensure it's a string
      const finalRole = String(userRole).trim();
      console.log(`[getByTeamId] ========== ROLE RETRIEVAL END for ${authUser.email} ==========`);
      console.log(`[getByTeamId] FINAL RESULT:`, {
        email: authUser.email,
        userId: userId,
        originalUserRole: userRole,
        finalRole: finalRole,
        roleSource: member?.role ? 'Better Auth member record' : (teamMember.role ? 'teamMember record' : 'default (care_assistant)')
      });
      
      userRole = finalRole;
      
      const isOnboardingComplete = user?.isOnboardingComplete;

      console.log(`[getByTeamId] Onboarding check for ${authUser.email}:`, {
        role: userRole,
        roleSource: teamMember.role ? 'teamMember' : 'member record',
        isOnboardingComplete,
        userRecordExists: !!user
      });

      // Filter by onboarding status:
      // - Nurses and care assistants: only include if isOnboardingComplete === true
      // - Managers and owners: always include (regardless of onboarding status)
      const isNurseOrCareAssistant = userRole === "nurse" || userRole === "care_assistant";
      const isManagerOrOwner = userRole === "manager" || userRole === "owner";

      if (isNurseOrCareAssistant) {
        if (isOnboardingComplete !== true) {
          console.log(`[FILTER-ONBOARDING] ❌ EXCLUDING ${userRole} ${userId} (${authUser.email}) - isOnboardingComplete: ${isOnboardingComplete || 'false/undefined'}`);
          continue;
        }
        console.log(`[FILTER-ONBOARDING] ✅ INCLUDING ${userRole} ${userId} (${authUser.email}) - isOnboardingComplete: true`);
      } else if (isManagerOrOwner) {
        console.log(`[FILTER-ONBOARDING] ✅ INCLUDING ${userRole} ${userId} (${authUser.email}) - managers/owners always visible (isOnboardingComplete: ${isOnboardingComplete || 'undefined'})`);
      } else {
        // Unknown role - log for debugging but include by default
        console.log(`[FILTER-ONBOARDING] ⚠️ INCLUDING user ${userId} (${authUser.email}) with unknown role: ${userRole || 'undefined'} (isOnboardingComplete: ${isOnboardingComplete || 'undefined'})`);
      }

      // Get user's image if available
      const userImage: { url: string | null; storageId: string } | null =
        await ctx.runQuery(api.files.image.getUserImageByUserId, {
          userId: userId
        });

      // Get team name for this team member
      let teamName: string | undefined = undefined;
      try {
        const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "team",
          where: [{ field: "id", value: teamMember.teamId }]
        });
        teamName = team?.name;
      } catch (error) {
        console.warn(`[getByTeamId] Failed to fetch team name for teamId ${teamMember.teamId}:`, error);
      }

      // Final check - ensure role is a non-empty string before adding to results
      // At this point, userRole should already be validated and set (either from teamMember.role, member.role, or default)
      // userRole was already set to finalRole at line 833, so we can use it directly
      
      // Check for duplicates by email - skip if this user has already been added
      if (addedUserEmails.has(authUser.email)) {
        console.log(`[getByTeamId] ⚠️ DUPLICATE DETECTED: Skipping ${authUser.email} - already added to results`);
        console.log(`[getByTeamId] Duplicate details:`, {
          email: authUser.email,
          userId: userId,
          teamMemberId: teamMember._id,
          note: 'User has multiple entries in teamMembers table - likely from switching teams'
        });
        continue;
      }
      
      // Mark this email as added
      addedUserEmails.add(authUser.email);
      
      console.log(`[getByTeamId] Adding ${authUser.email} to results with role: "${userRole}"`);
      
      results.push({
        _id: user?._id || authUser.id,
        userId: userId,
        _creationTime: user?._creationTime || Date.now(),
        email: authUser.email,
        name: user?.name || authUser.name,
        phone: user?.phone,
        imageUrl: userImage?.url || null,
        role: userRole, // Use validated role (already trimmed and set)
        teamId: teamMember.teamId,
        teamName: teamName, // Include team name so managers can see which unit/house each staff member belongs to
        organizationId: teamMember.organizationId
      });
    }

    // Log final results breakdown by role
    const roleBreakdown: Record<string, number> = {};
    results.forEach((result) => {
      const role = (result.role as string) || "unknown";
      roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
    });
    const duplicatesFiltered = teamMembers.length - results.length;
    console.log(`[getByTeamId] Returning ${results.length} results (filtered by activeTeamId, onboarding status, and deduplication)`);
    if (duplicatesFiltered > 0) {
      console.log(`[getByTeamId] ⚠️ Filtered out ${duplicatesFiltered} duplicate entries (users with multiple teamMembers records)`);
    }
    console.log(`[getByTeamId] Role breakdown:`, roleBreakdown);
    
    // Log sample of results to verify role is present
    if (results.length > 0) {
      console.log(`[getByTeamId] Sample result (first member):`, {
        email: (results[0] as any).email,
        role: (results[0] as any).role,
        roleType: typeof (results[0] as any).role,
        hasRole: !!(results[0] as any).role
      });
    }
    
    return results;
  },
});

export const inspectData = query({
  args: {},
  handler: async (ctx) => {
    const teamMembers = await ctx.db.query("teamMembers").collect();

    // Check users with activeTeamId
    const usersWithTeam = await ctx.db.query("users")
      .filter(q => q.neq(q.field("activeTeamId"), undefined))
      .collect();

    return {
      teamMembersCount: teamMembers.length,
      usersWithTeamCount: usersWithTeam.length,
      usersSample: usersWithTeam.slice(0, 5).map(u => ({ id: u._id, activeTeamId: u.activeTeamId })),
    };
  },
});