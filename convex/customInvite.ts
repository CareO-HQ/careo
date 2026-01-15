import { v } from "convex/values";
import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { components, api, internal } from "./_generated/api";
import { canInviteMembers, getAllowedRolesToInvite, type UserRole } from "./lib/permissions";

/**
 * Create an invitation directly, bypassing better-auth's permission check
 * This allows managers to invite members
 */
export const createInvitationForManager = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("manager"), v.literal("nurse"), v.literal("care_assistant")),
    teamId: v.optional(v.string()),
    careHomeId: v.optional(v.id("careHomes")),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      invitationId: v.string(),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    try {
      // Get current session
      const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
      if (!session || !session.userId) {
        return { success: false as const, error: "Not authenticated" };
      }

      // Get the current user's member record (fallback if session org isn't set)
      let currentMember = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [
          { field: "userId", value: session.userId },
          { field: "organizationId", value: session.activeOrganizationId }
        ]
      });

      if (!currentMember) {
        const members = await ctx.runQuery(components.betterAuth.lib.findMany, {
          model: "member",
          where: [{ field: "userId", value: session.userId }],
          paginationOpts: { numItems: 1, cursor: null }
        });
        currentMember = members?.page?.[0] || null;
      }

      if (!currentMember) {
        const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "user",
          where: [{ field: "id", value: session.userId }]
        });
        const userEmail = authUser?.email;

        if (userEmail && session.activeOrganizationId) {
          const invitation = await ctx.runQuery(components.betterAuth.lib.findOne, {
            model: "invitation",
            where: [
              { field: "email", value: userEmail },
              { field: "organizationId", value: session.activeOrganizationId }
            ]
          });

          if (invitation) {
            const member = await ctx.runMutation(components.betterAuth.lib.create, {
              input: {
                model: "member",
                data: {
                  userId: session.userId,
                  organizationId: session.activeOrganizationId,
                  role: invitation.role,
                  createdAt: Date.now()
                }
              }
            });

            const memberId = typeof member === "object" && member !== null && "_id" in member
              ? (member as any)._id
              : member;

            const invitationId = invitation.id || invitation._id;
            if (invitationId) {
              await ctx.runMutation(components.betterAuth.lib.updateOne, {
                input: {
                  model: "invitation",
                  where: [{ field: "id", value: String(invitationId) }],
                  update: { status: "accepted" }
                }
              });
            }

            currentMember = {
              ...invitation,
              id: String(memberId),
              userId: session.userId,
              organizationId: session.activeOrganizationId,
              role: invitation.role
            } as any;
          }
        }
      }

      if (!currentMember) {
        return { success: false as const, error: "Member record not found. Please accept your invitation first." };
      }

      const userRole = currentMember.role as UserRole;

      // Check permissions
      if (!canInviteMembers(userRole)) {
        return { success: false as const, error: "You don't have permission to invite members" };
      }

      // Check if they can invite this specific role
      const allowedRoles = getAllowedRolesToInvite(userRole);
      if (!allowedRoles.includes(args.role as UserRole)) {
        return {
          success: false as const,
          error: `You can only invite: ${allowedRoles.join(", ")}`
        };
      }

      let careHomeIdToUse = args.careHomeId ?? null;

      if (args.role === "manager" && !careHomeIdToUse) {
        const identity = await ctx.auth.getUserIdentity();
        const userEmail = identity?.email;
        if (userEmail) {
          const convexUser = await ctx.db
            .query("users")
            .withIndex("byEmail", (q) => q.eq("email", userEmail))
            .first();
          if (convexUser?.activeCareHomeId) {
            careHomeIdToUse = convexUser.activeCareHomeId;
          }
        }

        if (!careHomeIdToUse) {
          const careHome = await ctx.db
            .query("careHomes")
            .withIndex("by_organizationId", (q) => q.eq("organizationId", currentMember.organizationId))
            .first();
          if (careHome) {
            careHomeIdToUse = careHome._id;
          }
        }
      }

      if (args.role === "manager" && careHomeIdToUse) {
        const careHome = await ctx.db.get(careHomeIdToUse);
        if (!careHome) {
          return {
            success: false as const,
            error: "Care home not found"
          };
        }
        if (careHome.organizationId !== currentMember.organizationId) {
          return {
            success: false as const,
            error: "Care home does not belong to your organization"
          };
        }
      }

      if (args.role === "manager" && !careHomeIdToUse) {
        return {
          success: false as const,
          error: "No care home found. Please create a care home before inviting a manager."
        };
      }

      // Validate teamId if provided
      if (args.teamId) {
        // Only allow teamId for nurse and care_assistant roles
        if (args.role !== "nurse" && args.role !== "care_assistant") {
          return {
            success: false as const,
            error: "Team selection is only available for nurse and care assistant roles"
          };
        }

        // Verify the team exists and belongs to the same organization
        const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "team",
          where: [{ field: "id", value: args.teamId }]
        });

        if (!team) {
          return {
            success: false as const,
            error: "Team not found"
          };
        }

        if (team.organizationId !== currentMember.organizationId) {
          return {
            success: false as const,
            error: "Team does not belong to your organization"
          };
        }
      }

      // Check if user already invited
      const existingInvitation = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "invitation",
        where: [
          { field: "email", value: args.email },
          { field: "organizationId", value: currentMember.organizationId }
        ]
      });

      if (existingInvitation) {
        return {
          success: false as const,
          error: "User is already invited to this organization"
        };
      }

      // Get the organization details
      const organization = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "organization",
        where: [{ field: "id", value: currentMember.organizationId }]
      });

      if (!organization) {
        return { success: false as const, error: "Organization not found" };
      }

      // Create the invitation directly
      const invitationResult = await ctx.runMutation(components.betterAuth.lib.create, {
        input: {
          model: "invitation",
          data: {
            email: args.email,
            role: args.role,
            organizationId: currentMember.organizationId,
            inviterId: session.userId,
            status: "pending",
            expiresAt: Date.now() + (1000 * 60 * 60 * 24 * 7), // 7 days
          }
        }
      });

      // Extract the ID from the result
      const invitationId = typeof invitationResult === 'object' && invitationResult !== null && '_id' in invitationResult
        ? (invitationResult as any)._id
        : invitationResult;

      const invitationIdStr = String(invitationId);
      console.log("Created invitation with ID:", invitationIdStr, "TeamId:", args.teamId);

      // Store assignment metadata (team or care home) if provided
      if (args.teamId || careHomeIdToUse) {
        const metadataId = await ctx.db.insert("invitationMetadata", {
          invitationId: invitationIdStr,
          teamId: args.teamId,
          careHomeId: careHomeIdToUse ?? undefined,
          organizationId: currentMember.organizationId
        });
        console.log("Stored invitation metadata with ID:", metadataId, "for invitation:", invitationIdStr);
      }

      // Schedule the email sending action immediately
      // Use internal action for better reliability
      try {
        await ctx.scheduler.runAfter(0, internal.customInviteEmail.sendInvitationEmailInternal, {
          invitationId: invitationIdStr,
          email: args.email,
          organizationName: organization.name,
          inviterName: session.user?.name || "A team member",
        });
        console.log("✅ Email sending scheduled for invitation:", invitationIdStr);
      } catch (schedulerError) {
        console.error("❌ Failed to schedule email sending:", schedulerError);
        // Log the full error for debugging
        console.error("Scheduler error details:", {
          error: schedulerError,
          invitationId: invitationIdStr,
          email: args.email,
          errorMessage: schedulerError instanceof Error ? schedulerError.message : String(schedulerError),
          errorStack: schedulerError instanceof Error ? schedulerError.stack : undefined
        });
        // Don't fail the invitation creation if email scheduling fails
        // The invitation is still created and can be resent later
      }

      return {
        success: true as const,
        invitationId: String(invitationId),
      };
    } catch (error) {
      console.error("Error creating invitation:", error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to create invitation"
      };
    }
  },
});

/**
 * Revoke an invitation (manager/owner)
 */
export const revokeInvitationForManager = mutation({
  args: {
    invitationId: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    try {
      const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
      if (!session || !session.userId) {
        return { success: false as const, error: "Not authenticated" };
      }

      const currentMember = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [
          { field: "userId", value: session.userId },
          { field: "organizationId", value: session.activeOrganizationId }
        ]
      });

      if (!currentMember) {
        return { success: false as const, error: "Member record not found" };
      }

      const userRole = currentMember.role as UserRole;

      if (!canInviteMembers(userRole)) {
        return { success: false as const, error: "You don't have permission to revoke invitations" };
      }

      const invitation = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "invitation",
        where: [{ field: "id", value: args.invitationId }]
      });

      if (!invitation) {
        return { success: false as const, error: "Invitation not found" };
      }

      if (invitation.organizationId !== currentMember.organizationId) {
        return { success: false as const, error: "Invitation does not belong to your organization" };
      }

      // Managers can only revoke invitations they sent themselves
      // Owners can revoke any invitation in their organization
      if (userRole === "manager") {
        const invitationInviterId = (invitation as any).inviterId;
        if (!invitationInviterId || String(invitationInviterId) !== String(session.userId)) {
          return { success: false as const, error: "You can only revoke invitations you sent" };
        }
      }

      await ctx.runMutation(components.betterAuth.lib.deleteOne, {
        model: "invitation",
        where: [{ field: "id", value: args.invitationId }]
      });

      return { success: true as const };
    } catch (error) {
      console.error("Error revoking invitation:", error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to revoke invitation"
      };
    }
  },
});


/**
 * Validate that the current user can invite the specified role
 */
export const validateInvitePermission = mutation({
  args: {
    targetRole: v.union(v.literal("manager"), v.literal("nurse"), v.literal("care_assistant")),
  },
  returns: v.union(
    v.object({
      canInvite: v.literal(true),
    }),
    v.object({
      canInvite: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    try {
      // Get current session
      const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
      if (!session || !session.userId) {
        return { canInvite: false as const, error: "Not authenticated" };
      }

      // Get the current user's member record
      const currentMember = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [
          { field: "userId", value: session.userId },
          { field: "organizationId", value: session.activeOrganizationId }
        ]
      });

      if (!currentMember) {
        return { canInvite: false as const, error: "Member record not found" };
      }

      const userRole = currentMember.role as UserRole;

      // Check if user can invite
      if (!canInviteMembers(userRole)) {
        return { canInvite: false as const, error: "You don't have permission to invite members" };
      }

      // Check if they can invite this specific role
      const allowedRoles = getAllowedRolesToInvite(userRole);
      if (!allowedRoles.includes(args.targetRole as UserRole)) {
        return {
          canInvite: false as const,
          error: `You can only invite: ${allowedRoles.join(", ")}`
        };
      }

      return { canInvite: true as const };
    } catch (error) {
      console.error("Error validating invite permission:", error);
      return {
        canInvite: false as const,
        error: error instanceof Error ? error.message : "Failed to validate permissions"
      };
    }
  },
});

/**
 * Get invitation metadata by invitationId
 */
export const getInvitationMetadata = internalQuery({
  args: {
    invitationId: v.string(),
  },
  returns: v.union(
    v.object({
      teamId: v.optional(v.string()),
      careHomeId: v.optional(v.id("careHomes")),
      organizationId: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const metadata = await ctx.db
      .query("invitationMetadata")
      .withIndex("byInvitationId", (q) => q.eq("invitationId", args.invitationId))
      .first();

    if (!metadata) {
      return null;
    }

    return {
      teamId: metadata.teamId ?? undefined,
      careHomeId: metadata.careHomeId,
      organizationId: metadata.organizationId,
    };
  },
});

/**
 * Assign user to team from invitation metadata (public mutation for client-side calls)
 */
export const assignTeamFromInvitationPublic = mutation({
  args: {
    invitationId: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      teamId: v.string(),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args): Promise<
    | { success: true; teamId: string }
    | { success: false; error: string }
  > => {
    try {
      const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
      if (!session || !session.userId) {
        return {
          success: false as const,
          error: "Not authenticated",
        };
      }

      // Get invitation metadata directly
      const metadataRecord = await ctx.db
        .query("invitationMetadata")
        .withIndex("byInvitationId", (q) => q.eq("invitationId", args.invitationId))
        .first();

      const metadata: { teamId?: string; careHomeId?: Id<"careHomes">; organizationId: string } | null = metadataRecord
        ? {
            teamId: metadataRecord.teamId!,
            careHomeId: metadataRecord.careHomeId,
            organizationId: metadataRecord.organizationId,
          }
        : null;

      if (!metadata || (!metadata.teamId && !metadata.careHomeId)) {
        return {
          success: false as const,
          error: "No assignment specified in invitation",
        };
      }

      // Get the member record for this user
      const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [{ field: "userId", value: session.userId }],
      });

      if (!member) {
        return {
          success: false as const,
          error: "Member record not found",
        };
      }

      if (metadata.teamId) {
        // Verify the team still exists
        const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "team",
          where: [{ field: "id", value: metadata.teamId }],
        });

        if (!team) {
          return {
            success: false as const,
            error: "Team no longer exists",
          };
        }
      }

      // Get user email for teamMembers record and activeTeamId update
      let userEmail: string | undefined = undefined;
      try {
        const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "user",
          where: [{ field: "id", value: session.userId }]
        });
        userEmail = authUser?.email;
      } catch (error) {
        console.warn(`Failed to get user email for userId ${session.userId}:`, error);
      }

      if (metadata.teamId) {
        // Check if member is already in this team
        const existingTeamMember = await ctx.db
          .query("teamMembers")
          .withIndex("byUserAndTeam", (q) =>
            q.eq("userId", session.userId).eq("teamId", metadata.teamId!)
          )
          .first();

        if (!existingTeamMember) {
          // Create team membership
          await ctx.db.insert("teamMembers", {
            userId: session.userId,
            teamId: metadata.teamId,
            organizationId: metadata.organizationId,
            role: member.role,
            email: userEmail, // Store email for fallback lookup
            createdAt: Date.now(),
            createdBy: session.userId,
          });
        }

        // Set activeTeamId in the users table so the team is selected in the sidebar
        if (userEmail) {
          const convexUser = await ctx.db
            .query("users")
            .withIndex("byEmail", (q) => q.eq("email", userEmail!))
            .first();
          
          if (convexUser && convexUser.activeTeamId !== metadata.teamId) {
            await ctx.db.patch(convexUser._id, {
              activeTeamId: metadata.teamId
            });
            console.log(`Set activeTeamId to ${metadata.teamId} for user ${userEmail}`);
          }
        }

        // For nurse/care_assistant, set activeUnitId and activeCareHomeId based on team
        if (userEmail && (member.role === "nurse" || member.role === "care_assistant")) {
          const teamId = metadata.teamId!;
          const unit = await ctx.db
            .query("units")
            .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
            .first();
          if (unit) {
            const convexUser = await ctx.db
              .query("users")
              .withIndex("byEmail", (q) => q.eq("email", userEmail!))
              .first();
            if (convexUser) {
              await ctx.db.patch(convexUser._id, {
                activeUnitId: unit._id,
                activeCareHomeId: unit.careHomeId,
                activeTeamId: teamId
              });
            }
          }
        }
      }

      if (metadata.careHomeId && member.role === "manager") {
        const existingAssignment = await ctx.db
          .query("careHomeManagers")
          .withIndex("by_careHomeId", (q) => q.eq("careHomeId", metadata.careHomeId!))
          .filter((q) => q.eq(q.field("userId"), session.userId))
          .first();

        if (!existingAssignment) {
          await ctx.db.insert("careHomeManagers", {
            careHomeId: metadata.careHomeId,
            userId: session.userId,
            assignedAt: Date.now(),
            assignedBy: session.userId
          });
        }

        if (userEmail) {
          const convexUser = await ctx.db
            .query("users")
            .withIndex("byEmail", (q) => q.eq("email", userEmail!))
            .first();

          if (convexUser && convexUser.activeCareHomeId !== metadata.careHomeId) {
            await ctx.db.patch(convexUser._id, {
              activeCareHomeId: metadata.careHomeId
            });
          }
        }
      }

      return {
        success: true as const,
        teamId: metadata.teamId || "",
      };
    } catch (error) {
      console.error("Error assigning team from invitation:", error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to assign team",
      };
    }
  },
});

/**
 * Assign user to team from invitation metadata (internal mutation)
 */
export const assignTeamFromInvitation = internalMutation({
  args: {
    userId: v.string(),
    invitationId: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      teamId: v.string(),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args): Promise<
    | { success: true; teamId: string }
    | { success: false; error: string }
  > => {
    try {
      // Get invitation metadata directly
      const metadataRecord = await ctx.db
        .query("invitationMetadata")
        .withIndex("byInvitationId", (q) => q.eq("invitationId", args.invitationId))
        .first();

      const metadata: { teamId?: string; careHomeId?: Id<"careHomes">; organizationId: string } | null = metadataRecord
        ? {
            teamId: metadataRecord.teamId!,
            careHomeId: metadataRecord.careHomeId,
            organizationId: metadataRecord.organizationId,
          }
        : null;

      if (!metadata || (!metadata.teamId && !metadata.careHomeId)) {
        return {
          success: false as const,
          error: "No assignment specified in invitation",
        };
      }

      // Get the member record for this user
      const member = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "member",
        where: [{ field: "userId", value: args.userId }],
      });

      if (!member) {
        return {
          success: false as const,
          error: "Member record not found",
        };
      }

      if (metadata.teamId) {
        // Verify the team still exists
        const team = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "team",
          where: [{ field: "id", value: metadata.teamId }],
        });

        if (!team) {
          return {
            success: false as const,
            error: "Team no longer exists",
          };
        }
      }

      // Get user email for teamMembers record and activeTeamId update
      let userEmail: string | undefined = undefined;
      try {
        const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "user",
          where: [{ field: "id", value: args.userId }]
        });
        userEmail = authUser?.email;
      } catch (error) {
        console.warn(`Failed to get user email for userId ${args.userId}:`, error);
      }

      if (metadata.teamId) {
        // Check if member is already in this team
        const existingTeamMember = await ctx.db
          .query("teamMembers")
          .withIndex("byUserAndTeam", (q) =>
            q.eq("userId", args.userId).eq("teamId", metadata.teamId!)
          )
          .first();

        if (!existingTeamMember) {
          // Create team membership
          await ctx.db.insert("teamMembers", {
            userId: args.userId,
            teamId: metadata.teamId,
            organizationId: metadata.organizationId,
            role: member.role,
            email: userEmail, // Store email for fallback lookup
            createdAt: Date.now(),
            createdBy: "system",
          });
        }

        // Set activeTeamId in the users table so the team is selected in the sidebar
        if (userEmail) {
          const convexUser = await ctx.db
            .query("users")
            .withIndex("byEmail", (q) => q.eq("email", userEmail!))
            .first();
          
          if (convexUser && convexUser.activeTeamId !== metadata.teamId) {
            await ctx.db.patch(convexUser._id, {
              activeTeamId: metadata.teamId
            });
            console.log(`Set activeTeamId to ${metadata.teamId} for user ${userEmail}`);
          }
        }

        // For nurse/care_assistant, set activeUnitId and activeCareHomeId based on team
        if (userEmail && (member.role === "nurse" || member.role === "care_assistant")) {
          const teamId = metadata.teamId!;
          const unit = await ctx.db
            .query("units")
            .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
            .first();
          if (unit) {
            const convexUser = await ctx.db
              .query("users")
              .withIndex("byEmail", (q) => q.eq("email", userEmail!))
              .first();
            if (convexUser) {
              await ctx.db.patch(convexUser._id, {
                activeUnitId: unit._id,
                activeCareHomeId: unit.careHomeId,
                activeTeamId: teamId
              });
            }
          }
        }
      }

      if (metadata.careHomeId && member.role === "manager") {
        const existingAssignment = await ctx.db
          .query("careHomeManagers")
          .withIndex("by_careHomeId", (q) => q.eq("careHomeId", metadata.careHomeId!))
          .filter((q) => q.eq(q.field("userId"), args.userId))
          .first();

        if (!existingAssignment) {
          await ctx.db.insert("careHomeManagers", {
            careHomeId: metadata.careHomeId,
            userId: args.userId,
            assignedAt: Date.now(),
            assignedBy: "system"
          });
        }

        if (userEmail) {
          const convexUser = await ctx.db
            .query("users")
            .withIndex("byEmail", (q) => q.eq("email", userEmail!))
            .first();
          
          if (convexUser && convexUser.activeCareHomeId !== metadata.careHomeId) {
            await ctx.db.patch(convexUser._id, {
              activeCareHomeId: metadata.careHomeId
            });
          }
        }
      }

      return {
        success: true as const,
        teamId: metadata.teamId || "",
      };
    } catch (error) {
      console.error("Error assigning team from invitation:", error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to assign team",
      };
    }
  },
});

