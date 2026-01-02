import { v } from "convex/values";
import { components, api, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";

export const updateUserOnboarding = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { name, phone, imageUrl } = args;

    // Get user from Better Auth
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new Error("User not found");
    }

    // Update the Better Auth user table
    await ctx.runMutation(components.betterAuth.lib.updateOne, {
      input: {
        model: "user",
        where: [{ field: "email", value: user.email as string }],
        update: {
          name: name,
          phoneNumber: phone || undefined,
          image: imageUrl || undefined
        }
      }
    });

    // Also update the Convex users table to keep data in sync
    const convexUser = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", user.email as string))
      .first();

    if (convexUser) {
      await ctx.db.patch(convexUser._id, {
        name: name,
        phone: phone || undefined,
        image: imageUrl || undefined
      });
    }

    return {
      success: true,
      updatedFields: { name, phone, imageUrl }
    };
  }
});

export const setIsOnboardingCompleted = mutation({
  args: {},
  handler: async (ctx) => {
    // Get user from Better Auth
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) {
      throw new Error("User not found");
    }

    // Find the user in Convex users table
    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", userIdentity.email as string))
      .first();

    if (!user) {
      throw new Error("User not found in Convex database");
    }

    // Get the current session to find organization
    const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
    if (session && session.activeOrganizationId) {
      // Find all invitation metadata for this organization
      const allMetadata = await ctx.db
        .query("invitationMetadata")
        .withIndex("byOrganization", (q) => q.eq("organizationId", session.activeOrganizationId!))
        .collect();

      console.log("Found metadata records:", allMetadata.length, "for org:", session.activeOrganizationId);

      // For each metadata record, check if the invitation email matches this user
      for (const metadataRecord of allMetadata) {
        if (!metadataRecord.teamId) continue;

        // Try to find the invitation by ID (try both id and _id fields)
        let invitation = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "invitation",
          where: [{ field: "id", value: metadataRecord.invitationId }],
        });

        // If not found, try with _id
        if (!invitation) {
          invitation = await ctx.runQuery(components.betterAuth.lib.findOne, {
            model: "invitation",
            where: [{ field: "_id", value: metadataRecord.invitationId }],
          });
        }

        // Check if this invitation is for the current user
        if (invitation && invitation.email === userIdentity.email) {
          console.log("Found matching invitation metadata for user:", userIdentity.email, "TeamId:", metadataRecord.teamId);
          
          // Assign user to team
          const result = await ctx.runMutation(internal.customInvite.assignTeamFromInvitation, {
            userId: userIdentity.subject,
            invitationId: metadataRecord.invitationId,
          });
          console.log("Team assignment result:", result);
          break; // Only assign from the first matching metadata
        }
      }

      // Fallback: Also try the original invitation lookup method
      const invitations = await ctx.runQuery(components.betterAuth.lib.findMany, {
        model: "invitation",
        where: [
          { field: "email", value: userIdentity.email as string },
          { field: "organizationId", value: session.activeOrganizationId }
        ],
        paginationOpts: {
          cursor: null,
          numItems: 10
        }
      });

      console.log("Looking for invitations for:", userIdentity.email, "in org:", session.activeOrganizationId);
      console.log("Found invitations:", invitations?.page?.length || 0);

      // Check invitations in reverse order (most recent first) for team metadata
      if (invitations?.page && invitations.page.length > 0) {
        // Sort by creation time (most recent first) - Better Auth invitations should have createdAt
        const sortedInvitations = [...invitations.page].sort((a: any, b: any) => {
          const aTime = a.createdAt || a._creationTime || 0;
          const bTime = b.createdAt || b._creationTime || 0;
          return bTime - aTime;
        });

        // Check the most recent invitation for team metadata
        for (const invitation of sortedInvitations) {
          const invitationId = invitation.id || invitation._id;
          if (!invitationId) {
            console.log("Skipping invitation without ID:", invitation);
            continue;
          }

          const invitationIdStr = String(invitationId);
          console.log("Checking invitation:", invitationIdStr);

          // Check if this invitation has team metadata directly
          // Try both the invitation ID and _id format
          let metadataRecord = await ctx.db
            .query("invitationMetadata")
            .withIndex("byInvitationId", (q) => q.eq("invitationId", invitationIdStr))
            .first();

          // If not found, try with the invitation's _id if it exists
          if (!metadataRecord && invitation._id) {
            metadataRecord = await ctx.db
              .query("invitationMetadata")
              .withIndex("byInvitationId", (q) => q.eq("invitationId", String(invitation._id)))
              .first();
          }

          const metadata: { teamId: string; organizationId: string } | null = metadataRecord
            ? {
                teamId: metadataRecord.teamId!,
                organizationId: metadataRecord.organizationId,
              }
            : null;

          console.log("Metadata found:", !!metadata, "TeamId:", metadata?.teamId);

          // If metadata exists and has teamId, assign the user to the team
          if (metadata && metadata.teamId) {
            console.log("Assigning user to team:", metadata.teamId);
            const result = await ctx.runMutation(internal.customInvite.assignTeamFromInvitation, {
              userId: userIdentity.subject,
              invitationId: invitationIdStr,
            });
            console.log("Team assignment result:", result);
            // Only assign from the first invitation with team metadata
            break;
          }
        }
      } else {
        console.log("No invitations found for user");
      }
    }

    // Update user table to mark onboarding as complete
    await ctx.db.patch(user._id, {
      isOnboardingComplete: true
    });

    return { success: true };
  }
});

export const getUserByEmail = query({
  args: {
    email: v.string()
  },
  handler: async (ctx, args) => {
    const { email } = args;
    const user = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", email))
      .first();
    return user;
  }
});

// Get all users in the organization (for staff selection)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("name"), undefined))
      .collect();

    return users.map((user) => ({
      _id: user._id,
      name: user.name || user.email.split("@")[0], // Fallback to email prefix if no name
      email: user.email
    }));
  }
});