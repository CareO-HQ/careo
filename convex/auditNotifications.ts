import { v } from "convex/values";
import { query, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { components } from "./_generated/api";

/**
 * Helper query to get an audit by ID from a specific table
 */
export const getAuditById = internalQuery({
  args: {
    tableName: v.union(
      v.literal("residentAuditCompletions"),
      v.literal("careFileAuditCompletions"),
      v.literal("governanceAuditCompletions"),
      v.literal("clinicalAuditCompletions"),
      v.literal("environmentAuditCompletions")
    ),
    auditId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("residentAuditCompletions"),
      status: v.string(),
      nextAuditDue: v.optional(v.number()),
    }),
    v.object({
      _id: v.id("careFileAuditCompletions"),
      status: v.string(),
      nextAuditDue: v.optional(v.number()),
    }),
    v.object({
      _id: v.id("governanceAuditCompletions"),
      status: v.string(),
      nextAuditDue: v.optional(v.number()),
    }),
    v.object({
      _id: v.id("clinicalAuditCompletions"),
      status: v.string(),
      nextAuditDue: v.optional(v.number()),
    }),
    v.object({
      _id: v.id("environmentAuditCompletions"),
      status: v.string(),
      nextAuditDue: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    if (args.tableName === "residentAuditCompletions") {
      const audit = await ctx.db.get(args.auditId as Id<"residentAuditCompletions">);
      return audit ? { _id: audit._id, status: audit.status, nextAuditDue: audit.nextAuditDue } : null;
    } else if (args.tableName === "careFileAuditCompletions") {
      const audit = await ctx.db.get(args.auditId as Id<"careFileAuditCompletions">);
      return audit ? { _id: audit._id, status: audit.status, nextAuditDue: audit.nextAuditDue } : null;
    } else if (args.tableName === "governanceAuditCompletions") {
      const audit = await ctx.db.get(args.auditId as Id<"governanceAuditCompletions">);
      return audit ? { _id: audit._id, status: audit.status, nextAuditDue: audit.nextAuditDue } : null;
    } else if (args.tableName === "clinicalAuditCompletions") {
      const audit = await ctx.db.get(args.auditId as Id<"clinicalAuditCompletions">);
      return audit ? { _id: audit._id, status: audit.status, nextAuditDue: audit.nextAuditDue } : null;
    } else if (args.tableName === "environmentAuditCompletions") {
      const audit = await ctx.db.get(args.auditId as Id<"environmentAuditCompletions">);
      return audit ? { _id: audit._id, status: audit.status, nextAuditDue: audit.nextAuditDue } : null;
    }
    return null;
  },
});

/**
 * Get all Managers in an organization
 */
export const getAllManagersInOrganization = internalQuery({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      userId: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // Get organization members from better-auth
    const membersResult = await ctx.runQuery(components.betterAuth.lib.findMany, {
      model: "member",
      where: [{ field: "organizationId", value: args.organizationId }],
      paginationOpts: {
        cursor: null,
        numItems: 100,
      },
    });

    const members = membersResult?.page || [];
    const managers: Array<{ userId: string; email: string; name?: string }> = [];

    for (const member of members) {
      // Filter for managers only
      if (member.role === "manager" || member.role === "owner") {
        // Get user details from better-auth
        const authUser = await ctx.runQuery(components.betterAuth.lib.findOne, {
          model: "user",
          where: [{ field: "id", value: member.userId }],
        });

        if (authUser) {
          managers.push({
            userId: member.userId,
            email: authUser.email,
            name: authUser.name || undefined,
          });
        }
      }
    }

    return managers;
  },
});

/**
 * Calculate days remaining until next audit
 */
export function calculateDaysRemaining(nextAuditDue: number): number {
  const now = Date.now();
  const diffMs = nextAuditDue - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format next audit due date as a readable string
 */
export function formatNextAuditDate(nextAuditDue: number): string {
  const date = new Date(nextAuditDue);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Get audit folder name (category display name)
 */
export function getAuditFolderName(category: string): string {
  const folderNames: Record<string, string> = {
    resident: "Resident Audit",
    carefile: "Care File Audit",
    governance: "Governance & Complaints",
    clinical: "Clinical Care & Medicines",
    environment: "Environment & Safety",
  };
  return folderNames[category] || category;
}

/**
 * Create a notification for a manager about audit days remaining or expiry
 */
export const createAuditNotification = internalMutation({
  args: {
    userId: v.string(),
    userEmail: v.string(),
    organizationId: v.string(),
    notificationType: v.union(v.literal("audit_days_remaining"), v.literal("audit_expired")),
    auditCategory: v.string(),
    auditName: v.string(),
    templateId: v.string(),
    auditCompletionId: v.string(),
      daysRemaining: v.optional(v.number()),
      nextAuditDue: v.number(),
    teamId: v.optional(v.string()),
    teamName: v.optional(v.string()),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    // Validate that nextAuditDue is valid if provided
    if (args.nextAuditDue === undefined || args.nextAuditDue === null || args.nextAuditDue <= 0 || typeof args.nextAuditDue !== "number") {
      console.warn(`[createAuditNotification] Invalid nextAuditDue: ${args.nextAuditDue}, skipping notification creation`);
      // Delete existing notification if it exists and is invalid
      const idempotencyKey = `audit_${args.notificationType}_${args.auditCompletionId}_${args.userId}`;
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", idempotencyKey))
        .first();
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      throw new Error("Invalid nextAuditDue: cannot create notification without valid next audit date");
    }

    // Verify the audit completion record exists and is still completed
    // This prevents creating notifications for audits that don't exist or aren't completed
    try {
      let auditExists = false;
      let auditStatus = null;
      let audit: any = null;
      
      if (args.auditCategory === "resident" && args.auditCompletionId) {
        audit = await ctx.db.get(args.auditCompletionId as any);
        if (audit) {
          auditExists = true;
          auditStatus = (audit as any).status;
        }
      } else if (args.auditCategory === "carefile" && args.auditCompletionId) {
        audit = await ctx.db.get(args.auditCompletionId as any);
        if (audit) {
          auditExists = true;
          auditStatus = (audit as any).status;
        }
      } else if (args.auditCategory === "governance" && args.auditCompletionId) {
        audit = await ctx.db.get(args.auditCompletionId as any);
        if (audit) {
          auditExists = true;
          auditStatus = (audit as any).status;
        }
      } else if (args.auditCategory === "clinical" && args.auditCompletionId) {
        audit = await ctx.db.get(args.auditCompletionId as any);
        if (audit) {
          auditExists = true;
          auditStatus = (audit as any).status;
        }
      } else if (args.auditCategory === "environment" && args.auditCompletionId) {
        audit = await ctx.db.get(args.auditCompletionId as any);
        if (audit) {
          auditExists = true;
          auditStatus = (audit as any).status;
        }
      }

      // Only create notification if audit exists, is completed, and is not "new"
      if (!auditExists || auditStatus !== "completed" || auditStatus === "new") {
        console.warn(`[createAuditNotification] Audit not found, not completed, or has status "new" (exists: ${auditExists}, status: ${auditStatus}), skipping notification creation`);
        // Delete existing notification if it exists
        const idempotencyKey = `audit_${args.notificationType}_${args.auditCompletionId}_${args.userId}`;
        const existing = await ctx.db
          .query("notifications")
          .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", idempotencyKey))
          .first();
        if (existing) {
          await ctx.db.delete(existing._id);
        }
        throw new Error("Audit not found or not completed: cannot create notification");
      }

      // Verify nextAuditDue matches the audit record
      const auditNextAuditDue = audit?.nextAuditDue;
      if (auditNextAuditDue === undefined || auditNextAuditDue === null || auditNextAuditDue <= 0) {
        console.warn(`[createAuditNotification] Audit has no valid nextAuditDue, skipping notification creation`);
        // Delete existing notification if it exists
        const idempotencyKey = `audit_${args.notificationType}_${args.auditCompletionId}_${args.userId}`;
        const existing = await ctx.db
          .query("notifications")
          .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", idempotencyKey))
          .first();
        if (existing) {
          await ctx.db.delete(existing._id);
        }
        throw new Error("Audit has no valid nextAuditDue: cannot create notification");
      }

      // Verify nextAuditDue matches what was passed in
      if (auditNextAuditDue !== args.nextAuditDue) {
        console.warn(`[createAuditNotification] nextAuditDue mismatch (audit: ${auditNextAuditDue}, provided: ${args.nextAuditDue}), using audit value`);
        // Use the audit's nextAuditDue instead
        args.nextAuditDue = auditNextAuditDue;
      }
    } catch (error) {
      console.error(`[createAuditNotification] Error validating audit:`, error);
      throw error;
    }

    const folderName = getAuditFolderName(args.auditCategory);
    const idempotencyKey = `audit_${args.notificationType}_${args.auditCompletionId}_${args.userId}`;

    // Check if notification already exists with this idempotency key
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first();

    let title: string;
    let message: string;

    if (args.notificationType === "audit_expired") {
      title = "Audit Expired";
      if (args.auditCategory === "resident" || args.auditCategory === "carefile") {
        message = `Team: ${args.teamName || "Unknown"}, Folder: ${folderName}, Audit: ${args.auditName} - This audit has expired and needs to be completed.`;
      } else {
        message = `Folder: ${folderName}, Audit: ${args.auditName} - This audit has expired and needs to be completed.`;
      }
    } else {
      title = "Audit Reminder";
      if (args.daysRemaining !== undefined && args.daysRemaining !== null) {
        if (args.auditCategory === "resident" || args.auditCategory === "carefile") {
          message = `Team: ${args.teamName || "Unknown"}, Folder: ${folderName}, Audit: ${args.auditName} - ${args.daysRemaining} days remaining until next audit (due ${formatNextAuditDate(args.nextAuditDue)}).`;
        } else {
          message = `Folder: ${folderName}, Audit: ${args.auditName} - ${args.daysRemaining} days remaining until next audit (due ${formatNextAuditDate(args.nextAuditDue)}).`;
        }
      } else {
        // Overdue notification (no days remaining)
        if (args.auditCategory === "resident" || args.auditCategory === "carefile") {
          message = `Team: ${args.teamName || "Unknown"}, Folder: ${folderName}, Audit: ${args.auditName} - This audit is overdue and needs to be completed.`;
        } else {
          message = `Folder: ${folderName}, Audit: ${args.auditName} - This audit is overdue and needs to be completed.`;
        }
      }
    }

    const metadata = {
      auditCompletionId: args.auditCompletionId,
      auditCategory: args.auditCategory,
      templateId: args.templateId,
      auditName: args.auditName,
      folderName: folderName,
      daysRemaining: args.daysRemaining,
      nextAuditDue: args.nextAuditDue,
      teamId: args.teamId,
      teamName: args.teamName,
    };

    if (existing) {
      // Update existing notification
      await ctx.db.patch(existing._id, {
        title,
        message,
        metadata,
        isRead: false, // Mark as unread when updated
      });
      return existing._id;
    } else {
      // Create new notification
      const notificationId = await ctx.db.insert("notifications", {
        userId: args.userEmail,
        type: args.notificationType,
        title,
        message,
        link: getAuditLink(args.auditCategory, args.templateId, args.teamId),
        metadata,
        organizationId: args.organizationId,
        teamId: args.teamId, // Set to null for organization-wide, but keep teamId for reference
        isRead: false,
        idempotencyKey,
        createdAt: Date.now(),
      });
      return notificationId;
    }
  },
});

/**
 * Get audit link based on category
 */
function getAuditLink(category: string, templateId: string, teamId?: string): string {
  const basePath = "/dashboard/careo-audit";
  switch (category) {
    case "resident":
      return `${basePath}/resident/${templateId}`;
    case "carefile":
      return `${basePath}?tab=carefile`;
    case "governance":
      return `${basePath}/governance/${templateId}`;
    case "clinical":
      return `${basePath}/clinical/${templateId}`;
    case "environment":
      return `${basePath}/environment/${templateId}`;
    default:
      return basePath;
  }
}

/**
 * Internal action to notify managers 15 days before the next audit due date
 */
export const notifyManagersBeforeDueDate = internalAction({
  args: {
    auditCategory: v.string(),
    auditCompletionId: v.string(),
    templateId: v.string(),
    auditName: v.string(),
    organizationId: v.string(),
    nextAuditDue: v.number(),
    teamId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Validate that nextAuditDue is a valid positive number
    if (!args.nextAuditDue || args.nextAuditDue <= 0 || typeof args.nextAuditDue !== "number") {
      console.warn(`[notifyManagersBeforeDueDate] Invalid nextAuditDue: ${args.nextAuditDue}, skipping notification`);
      return null;
    }

    // Verify the audit completion record exists and is completed (not "new")
    // This prevents notifications for audits that are not completed or are in "new" status
    try {
      let auditExists = false;
      let auditStatus: string | null = null;
      let audit: any = null;
      
      if (args.auditCategory === "resident" && args.auditCompletionId) {
        audit = await ctx.runQuery(internal.auditNotifications.getAuditById, {
          tableName: "residentAuditCompletions",
          auditId: args.auditCompletionId,
        });
        if (audit) {
          auditExists = true;
          auditStatus = audit.status;
        }
      } else if (args.auditCategory === "carefile" && args.auditCompletionId) {
        audit = await ctx.runQuery(internal.auditNotifications.getAuditById, {
          tableName: "careFileAuditCompletions",
          auditId: args.auditCompletionId,
        });
        if (audit) {
          auditExists = true;
          auditStatus = audit.status;
        }
      } else if (args.auditCategory === "governance" && args.auditCompletionId) {
        audit = await ctx.runQuery(internal.auditNotifications.getAuditById, {
          tableName: "governanceAuditCompletions",
          auditId: args.auditCompletionId,
        });
        if (audit) {
          auditExists = true;
          auditStatus = audit.status;
        }
      } else if (args.auditCategory === "clinical" && args.auditCompletionId) {
        audit = await ctx.runQuery(internal.auditNotifications.getAuditById, {
          tableName: "clinicalAuditCompletions",
          auditId: args.auditCompletionId,
        });
        if (audit) {
          auditExists = true;
          auditStatus = audit.status;
        }
      } else if (args.auditCategory === "environment" && args.auditCompletionId) {
        audit = await ctx.runQuery(internal.auditNotifications.getAuditById, {
          tableName: "environmentAuditCompletions",
          auditId: args.auditCompletionId,
        });
        if (audit) {
          auditExists = true;
          auditStatus = audit.status;
        }
      }

      // Only proceed if audit exists and is completed (this automatically excludes "new" status)
      if (!auditExists || auditStatus !== "completed") {
        console.warn(`[notifyManagersBeforeDueDate] Audit not found or not completed (exists: ${auditExists}, status: ${auditStatus}), skipping notification`);
        return null;
      }

      // Check if the audit is still due (not already past due)
      const now = Date.now();
      if (args.nextAuditDue <= now) {
        // Audit is already overdue, skip the 15-day reminder and let the overdue check handle it
        console.log(`[notifyManagersBeforeDueDate] Audit is already overdue, skipping 15-day reminder`);
        return null;
      }
    } catch (error) {
      console.error(`[notifyManagersBeforeDueDate] Error validating audit:`, error);
      return null;
    }

    // Get all managers in the organization
    const managers = await ctx.runQuery(internal.auditNotifications.getAllManagersInOrganization, {
      organizationId: args.organizationId,
    });

    // Get team name if teamId is provided
    let teamName: string | undefined = undefined;
    if (args.teamId) {
      const team = await ctx.runQuery(api.teams.getTeamName, {
        teamId: args.teamId,
      });
      teamName = team?.name;
    }

    const daysRemaining = calculateDaysRemaining(args.nextAuditDue);

    // Create notification for each manager
    for (const manager of managers) {
      await ctx.runMutation(internal.auditNotifications.createAuditNotification, {
        userId: manager.userId,
        userEmail: manager.email,
        organizationId: args.organizationId,
        notificationType: "audit_days_remaining",
        auditCategory: args.auditCategory,
        auditName: args.auditName,
        templateId: args.templateId,
        auditCompletionId: args.auditCompletionId,
        daysRemaining,
        nextAuditDue: args.nextAuditDue,
        teamId: args.teamId,
        teamName,
      });
    }

    return null;
  },
});

/**
 * Internal action to check for audits that need notifications (15 days before or overdue)
 * This replaces the old updateDaysRemainingNotifications function
 */
export const checkAndNotifyAuditReminders = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;

    // 1. Resident Audits
    const residentAudits = await ctx.runQuery(internal.auditNotifications.getCompletedResidentAudits, {});
    for (const audit of residentAudits) {
      if (audit.nextAuditDue && audit.nextAuditDue > 0) {
        const fifteenDaysBefore = audit.nextAuditDue - fifteenDaysInMs;
        const isFifteenDaysBefore = now >= fifteenDaysBefore && now < audit.nextAuditDue;
        const isOverdue = audit.nextAuditDue <= now;

        if (isFifteenDaysBefore || isOverdue) {
          const managers = await ctx.runQuery(internal.auditNotifications.getAllManagersInOrganization, {
            organizationId: audit.organizationId,
          });

          let teamName: string | undefined = undefined;
          if (audit.teamId) {
            const team = await ctx.runQuery(api.teams.getTeamName, {
              teamId: audit.teamId,
            });
            teamName = team?.name;
          }

          for (const manager of managers) {
            await ctx.runMutation(internal.auditNotifications.createAuditNotification, {
              userId: manager.userId,
              userEmail: manager.email,
              organizationId: audit.organizationId,
              notificationType: isOverdue ? "audit_expired" : "audit_days_remaining",
              auditCategory: "resident",
              auditName: audit.templateName,
              templateId: audit.templateId,
              auditCompletionId: audit._id,
              daysRemaining: isOverdue ? undefined : calculateDaysRemaining(audit.nextAuditDue),
              nextAuditDue: audit.nextAuditDue,
              teamId: audit.teamId,
              teamName,
            });
          }
        }
      }
    }

    // 2. Care File Audits
    const careFileAudits = await ctx.runQuery(internal.auditNotifications.getCompletedCareFileAudits, {});
    for (const audit of careFileAudits) {
      if (audit.nextAuditDue && audit.nextAuditDue > 0) {
        const fifteenDaysBefore = audit.nextAuditDue - fifteenDaysInMs;
        const isFifteenDaysBefore = now >= fifteenDaysBefore && now < audit.nextAuditDue;
        const isOverdue = audit.nextAuditDue <= now;

        if (isFifteenDaysBefore || isOverdue) {
          const managers = await ctx.runQuery(internal.auditNotifications.getAllManagersInOrganization, {
            organizationId: audit.organizationId,
          });

          let teamName: string | undefined = undefined;
          if (audit.teamId) {
            const team = await ctx.runQuery(api.teams.getTeamName, {
              teamId: audit.teamId,
            });
            teamName = team?.name;
          }

          for (const manager of managers) {
            await ctx.runMutation(internal.auditNotifications.createAuditNotification, {
              userId: manager.userId,
              userEmail: manager.email,
              organizationId: audit.organizationId,
              notificationType: isOverdue ? "audit_expired" : "audit_days_remaining",
              auditCategory: "carefile",
              auditName: audit.templateName,
              templateId: audit.templateId,
              auditCompletionId: audit._id,
              daysRemaining: isOverdue ? undefined : calculateDaysRemaining(audit.nextAuditDue),
              nextAuditDue: audit.nextAuditDue,
              teamId: audit.teamId,
              teamName,
            });
          }
        }
      }
    }

    // 3. Governance Audits
    const governanceAudits = await ctx.runQuery(internal.auditNotifications.getCompletedGovernanceAudits, {});
    for (const audit of governanceAudits) {
      if (audit.nextAuditDue && audit.nextAuditDue > 0) {
        const fifteenDaysBefore = audit.nextAuditDue - fifteenDaysInMs;
        const isFifteenDaysBefore = now >= fifteenDaysBefore && now < audit.nextAuditDue;
        const isOverdue = audit.nextAuditDue <= now;

        if (isFifteenDaysBefore || isOverdue) {
          const managers = await ctx.runQuery(internal.auditNotifications.getAllManagersInOrganization, {
            organizationId: audit.organizationId,
          });

          for (const manager of managers) {
            await ctx.runMutation(internal.auditNotifications.createAuditNotification, {
              userId: manager.userId,
              userEmail: manager.email,
              organizationId: audit.organizationId,
              notificationType: isOverdue ? "audit_expired" : "audit_days_remaining",
              auditCategory: "governance",
              auditName: audit.templateName,
              templateId: audit.templateId,
              auditCompletionId: audit._id,
              daysRemaining: isOverdue ? undefined : calculateDaysRemaining(audit.nextAuditDue),
              nextAuditDue: audit.nextAuditDue,
              teamId: undefined,
              teamName: undefined,
            });
          }
        }
      }
    }

    // 4. Clinical Audits
    const clinicalAudits = await ctx.runQuery(internal.auditNotifications.getCompletedClinicalAudits, {});
    for (const audit of clinicalAudits) {
      if (audit.nextAuditDue && audit.nextAuditDue > 0) {
        const fifteenDaysBefore = audit.nextAuditDue - fifteenDaysInMs;
        const isFifteenDaysBefore = now >= fifteenDaysBefore && now < audit.nextAuditDue;
        const isOverdue = audit.nextAuditDue <= now;

        if (isFifteenDaysBefore || isOverdue) {
          const managers = await ctx.runQuery(internal.auditNotifications.getAllManagersInOrganization, {
            organizationId: audit.organizationId,
          });

          for (const manager of managers) {
            await ctx.runMutation(internal.auditNotifications.createAuditNotification, {
              userId: manager.userId,
              userEmail: manager.email,
              organizationId: audit.organizationId,
              notificationType: isOverdue ? "audit_expired" : "audit_days_remaining",
              auditCategory: "clinical",
              auditName: audit.templateName,
              templateId: audit.templateId,
              auditCompletionId: audit._id,
              daysRemaining: isOverdue ? undefined : calculateDaysRemaining(audit.nextAuditDue),
              nextAuditDue: audit.nextAuditDue,
              teamId: undefined,
              teamName: undefined,
            });
          }
        }
      }
    }

    // 5. Environment Audits
    const environmentAudits = await ctx.runQuery(internal.auditNotifications.getCompletedEnvironmentAudits, {});
    for (const audit of environmentAudits) {
      if (audit.nextAuditDue && audit.nextAuditDue > 0) {
        const fifteenDaysBefore = audit.nextAuditDue - fifteenDaysInMs;
        const isFifteenDaysBefore = now >= fifteenDaysBefore && now < audit.nextAuditDue;
        const isOverdue = audit.nextAuditDue <= now;

        if (isFifteenDaysBefore || isOverdue) {
          const managers = await ctx.runQuery(internal.auditNotifications.getAllManagersInOrganization, {
            organizationId: audit.organizationId,
          });

          for (const manager of managers) {
            await ctx.runMutation(internal.auditNotifications.createAuditNotification, {
              userId: manager.userId,
              userEmail: manager.email,
              organizationId: audit.organizationId,
              notificationType: isOverdue ? "audit_expired" : "audit_days_remaining",
              auditCategory: "environment",
              auditName: audit.templateName,
              templateId: audit.templateId,
              auditCompletionId: audit._id,
              daysRemaining: isOverdue ? undefined : calculateDaysRemaining(audit.nextAuditDue),
              nextAuditDue: audit.nextAuditDue,
              teamId: undefined,
              teamName: undefined,
            });
          }
        }
      }
    }

    return null;
  },
});

/**
 * Internal queries to get completed audits from each table
 */
export const getCompletedResidentAudits = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("residentAuditCompletions"),
      templateId: v.id("residentAuditTemplates"),
      templateName: v.string(),
      organizationId: v.string(),
      teamId: v.string(),
      nextAuditDue: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const audits = await ctx.db
      .query("residentAuditCompletions")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    return audits
      .filter((a) => 
        a.nextAuditDue !== undefined && 
        a.nextAuditDue !== null && 
        typeof a.nextAuditDue === "number" &&
        a.nextAuditDue > 0
      )
      .map((a) => ({
        _id: a._id,
        templateId: a.templateId,
        templateName: a.templateName,
        organizationId: a.organizationId,
        teamId: a.teamId,
        nextAuditDue: a.nextAuditDue!,
      }));
  },
});

export const getCompletedCareFileAudits = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("careFileAuditCompletions"),
      templateId: v.id("careFileAuditTemplates"),
      templateName: v.string(),
      organizationId: v.string(),
      teamId: v.string(),
      nextAuditDue: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const audits = await ctx.db
      .query("careFileAuditCompletions")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "completed"),
          q.neq(q.field("status"), "new")
        )
      )
      .collect();

    return audits
      .filter((a) => 
        a.nextAuditDue !== undefined && 
        a.nextAuditDue !== null && 
        typeof a.nextAuditDue === "number" &&
        a.nextAuditDue > 0
      )
      .map((a) => ({
        _id: a._id,
        templateId: a.templateId,
        templateName: a.templateName,
        organizationId: a.organizationId,
        teamId: a.teamId,
        nextAuditDue: a.nextAuditDue!,
      }));
  },
});

export const getCompletedGovernanceAudits = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("governanceAuditCompletions"),
      templateId: v.id("governanceAuditTemplates"),
      templateName: v.string(),
      organizationId: v.string(),
      nextAuditDue: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const audits = await ctx.db
      .query("governanceAuditCompletions")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "completed"),
          q.neq(q.field("status"), "new")
        )
      )
      .collect();

    return audits
      .filter((a) => 
        a.nextAuditDue !== undefined && 
        a.nextAuditDue !== null && 
        typeof a.nextAuditDue === "number" &&
        a.nextAuditDue > 0
      )
      .map((a) => ({
        _id: a._id,
        templateId: a.templateId,
        templateName: a.templateName,
        organizationId: a.organizationId,
        nextAuditDue: a.nextAuditDue!,
      }));
  },
});

export const getCompletedClinicalAudits = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("clinicalAuditCompletions"),
      templateId: v.id("clinicalAuditTemplates"),
      templateName: v.string(),
      organizationId: v.string(),
      nextAuditDue: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const audits = await ctx.db
      .query("clinicalAuditCompletions")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "completed"),
          q.neq(q.field("status"), "new")
        )
      )
      .collect();

    return audits
      .filter((a) => 
        a.nextAuditDue !== undefined && 
        a.nextAuditDue !== null && 
        typeof a.nextAuditDue === "number" &&
        a.nextAuditDue > 0
      )
      .map((a) => ({
        _id: a._id,
        templateId: a.templateId,
        templateName: a.templateName,
        organizationId: a.organizationId,
        nextAuditDue: a.nextAuditDue!,
      }));
  },
});

export const getCompletedEnvironmentAudits = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("environmentAuditCompletions"),
      templateId: v.id("environmentAuditTemplates"),
      templateName: v.string(),
      organizationId: v.string(),
      nextAuditDue: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const audits = await ctx.db
      .query("environmentAuditCompletions")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "completed"),
          q.neq(q.field("status"), "new")
        )
      )
      .collect();

    return audits
      .filter((a) => 
        a.nextAuditDue !== undefined && 
        a.nextAuditDue !== null && 
        typeof a.nextAuditDue === "number" &&
        a.nextAuditDue > 0
      )
      .map((a) => ({
        _id: a._id,
        templateId: a.templateId,
        templateName: a.templateName,
        organizationId: a.organizationId,
        nextAuditDue: a.nextAuditDue!,
      }));
  },
});

/**
 * Internal mutation to cleanup invalid audit notifications
 * Removes notifications for audits that are no longer completed or don't have valid nextAuditDue
 */
export const cleanupInvalidAuditNotificationsMutation = internalMutation({
  args: {},
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async (ctx) => {
    // Get all audit notifications
    const auditNotifications = await ctx.db
      .query("notifications")
      .filter((q) =>
        q.or(
          q.eq(q.field("type"), "audit_days_remaining"),
          q.eq(q.field("type"), "audit_expired")
        )
      )
      .collect();

    let deleted = 0;

    for (const notification of auditNotifications) {
      const metadata = notification.metadata as any;
      if (!metadata) {
        // No metadata - invalid notification
        await ctx.db.delete(notification._id);
        deleted++;
        continue;
      }

      const nextAuditDue = metadata.nextAuditDue;
      const auditCompletionId = metadata.auditCompletionId;
      const auditCategory = metadata.auditCategory;

      // Check if nextAuditDue is invalid
      if (
        nextAuditDue === undefined ||
        nextAuditDue === null ||
        typeof nextAuditDue !== "number" ||
        nextAuditDue <= 0
      ) {
        await ctx.db.delete(notification._id);
        deleted++;
        continue;
      }

      // Verify the audit completion record exists and is still completed
      try {
        let auditExists = false;
        let auditStatus = null;
        let audit: any = null;

        if (auditCategory === "resident" && auditCompletionId) {
          audit = await ctx.db.get(auditCompletionId as any);
          if (audit) {
            auditExists = true;
            auditStatus = (audit as any).status;
          }
        } else if (auditCategory === "carefile" && auditCompletionId) {
          audit = await ctx.db.get(auditCompletionId as any);
          if (audit) {
            auditExists = true;
            auditStatus = (audit as any).status;
          }
        } else if (auditCategory === "governance" && auditCompletionId) {
          audit = await ctx.db.get(auditCompletionId as any);
          if (audit) {
            auditExists = true;
            auditStatus = (audit as any).status;
          }
        } else if (auditCategory === "clinical" && auditCompletionId) {
          audit = await ctx.db.get(auditCompletionId as any);
          if (audit) {
            auditExists = true;
            auditStatus = (audit as any).status;
          }
        } else if (auditCategory === "environment" && auditCompletionId) {
          audit = await ctx.db.get(auditCompletionId as any);
          if (audit) {
            auditExists = true;
            auditStatus = (audit as any).status;
          }
        }

        // Delete notification if audit doesn't exist, is not completed, or has no valid nextAuditDue
        if (!auditExists || auditStatus !== "completed") {
          await ctx.db.delete(notification._id);
          deleted++;
          continue;
        }

        const auditNextAuditDue = audit?.nextAuditDue;
        if (
          auditNextAuditDue === undefined ||
          auditNextAuditDue === null ||
          auditNextAuditDue <= 0
        ) {
          await ctx.db.delete(notification._id);
          deleted++;
          continue;
        }
      } catch (error) {
        // If we can't validate, delete the notification to be safe
        console.warn(`[cleanupInvalidAuditNotifications] Error validating notification ${notification._id}:`, error);
        await ctx.db.delete(notification._id);
        deleted++;
      }
    }

    console.log(`[cleanupInvalidAuditNotifications] Cleaned up ${deleted} invalid audit notifications`);
    return { deleted };
  },
});

/**
 * Internal action wrapper to cleanup invalid audit notifications (for cron jobs)
 */
export const cleanupInvalidAuditNotifications = internalAction({
  args: {},
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async (ctx): Promise<{ deleted: number }> => {
    const result: { deleted: number } = await ctx.runMutation(internal.auditNotifications.cleanupInvalidAuditNotificationsMutation, {});
    return result;
  },
});

/**
 * Internal action to check and notify about overdue audits
 * Checks for audits where nextAuditDue has passed and sends overdue notifications
 */
export const checkAndNotifyExpiredAudits = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Resident Audits
    const residentAudits = await ctx.runQuery(internal.auditNotifications.getCompletedResidentAudits, {});
    const expiredResidentAudits = residentAudits.filter((a: { nextAuditDue: number }) => 
      a.nextAuditDue && 
      a.nextAuditDue > 0 && 
      a.nextAuditDue <= now
    );

    for (const audit of expiredResidentAudits) {
      const managers = await ctx.runQuery(internal.auditNotifications.getAllManagersInOrganization, {
        organizationId: audit.organizationId,
      });

      let teamName: string | undefined = undefined;
      if (audit.teamId) {
        const team = await ctx.runQuery(api.teams.getTeamName, {
          teamId: audit.teamId,
        });
        teamName = team?.name;
      }

      for (const manager of managers) {
        await ctx.runMutation(internal.auditNotifications.createAuditNotification, {
          userId: manager.userId,
          userEmail: manager.email,
          organizationId: audit.organizationId,
          notificationType: "audit_expired",
          auditCategory: "resident",
          auditName: audit.templateName,
          templateId: audit.templateId,
          auditCompletionId: audit._id,
          nextAuditDue: audit.nextAuditDue,
          teamId: audit.teamId,
          teamName,
        });
      }
    }

    // 2. Care File Audits
    const careFileAudits = await ctx.runQuery(internal.auditNotifications.getCompletedCareFileAudits, {});
    const expiredCareFileAudits = careFileAudits.filter((a: { nextAuditDue: number }) => 
      a.nextAuditDue && 
      a.nextAuditDue > 0 && 
      a.nextAuditDue <= now
    );

    for (const audit of expiredCareFileAudits) {
      const managers = await ctx.runQuery(internal.auditNotifications.getAllManagersInOrganization, {
        organizationId: audit.organizationId,
      });

      let teamName: string | undefined = undefined;
      if (audit.teamId) {
        const team = await ctx.runQuery(api.teams.getTeamName, {
          teamId: audit.teamId,
        });
        teamName = team?.name;
      }

      for (const manager of managers) {
        await ctx.runMutation(internal.auditNotifications.createAuditNotification, {
          userId: manager.userId,
          userEmail: manager.email,
          organizationId: audit.organizationId,
          notificationType: "audit_expired",
          auditCategory: "carefile",
          auditName: audit.templateName,
          templateId: audit.templateId,
          auditCompletionId: audit._id,
          nextAuditDue: audit.nextAuditDue,
          teamId: audit.teamId,
          teamName,
        });
      }
    }

    // 3. Governance Audits
    const governanceAudits = await ctx.runQuery(internal.auditNotifications.getCompletedGovernanceAudits, {});
    const expiredGovernanceAudits = governanceAudits.filter((a: { nextAuditDue: number }) => 
      a.nextAuditDue && 
      a.nextAuditDue > 0 && 
      a.nextAuditDue <= now
    );

    for (const audit of expiredGovernanceAudits) {
      const managers = await ctx.runQuery(internal.auditNotifications.getAllManagersInOrganization, {
        organizationId: audit.organizationId,
      });

      for (const manager of managers) {
        await ctx.runMutation(internal.auditNotifications.createAuditNotification, {
          userId: manager.userId,
          userEmail: manager.email,
          organizationId: audit.organizationId,
          notificationType: "audit_expired",
          auditCategory: "governance",
          auditName: audit.templateName,
          templateId: audit.templateId,
          auditCompletionId: audit._id,
          nextAuditDue: audit.nextAuditDue,
          teamId: undefined,
          teamName: undefined,
        });
      }
    }

    // 4. Clinical Audits
    const clinicalAudits = await ctx.runQuery(internal.auditNotifications.getCompletedClinicalAudits, {});
    const expiredClinicalAudits = clinicalAudits.filter((a: { nextAuditDue: number }) => 
      a.nextAuditDue && 
      a.nextAuditDue > 0 && 
      a.nextAuditDue <= now
    );

    for (const audit of expiredClinicalAudits) {
      const managers = await ctx.runQuery(internal.auditNotifications.getAllManagersInOrganization, {
        organizationId: audit.organizationId,
      });

      for (const manager of managers) {
        await ctx.runMutation(internal.auditNotifications.createAuditNotification, {
          userId: manager.userId,
          userEmail: manager.email,
          organizationId: audit.organizationId,
          notificationType: "audit_expired",
          auditCategory: "clinical",
          auditName: audit.templateName,
          templateId: audit.templateId,
          auditCompletionId: audit._id,
          nextAuditDue: audit.nextAuditDue,
          teamId: undefined,
          teamName: undefined,
        });
      }
    }

    // 5. Environment Audits
    const environmentAudits = await ctx.runQuery(internal.auditNotifications.getCompletedEnvironmentAudits, {});
    const expiredEnvironmentAudits = environmentAudits.filter((a: { nextAuditDue: number }) => 
      a.nextAuditDue && 
      a.nextAuditDue > 0 && 
      a.nextAuditDue <= now
    );

    for (const audit of expiredEnvironmentAudits) {
      const managers = await ctx.runQuery(internal.auditNotifications.getAllManagersInOrganization, {
        organizationId: audit.organizationId,
      });

      for (const manager of managers) {
        await ctx.runMutation(internal.auditNotifications.createAuditNotification, {
          userId: manager.userId,
          userEmail: manager.email,
          organizationId: audit.organizationId,
          notificationType: "audit_expired",
          auditCategory: "environment",
          auditName: audit.templateName,
          templateId: audit.templateId,
          auditCompletionId: audit._id,
          nextAuditDue: audit.nextAuditDue,
          teamId: undefined,
          teamName: undefined,
        });
      }
    }

    return null;
  },
});

