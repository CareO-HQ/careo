/**
 * COMPLIANCE MODULE
 *
 * Implements GDPR data export, backup, and retention policies.
 *
 * Features:
 * - GDPR right to data portability (export user data)
 * - Automated backups for disaster recovery
 * - 7-year retention enforcement
 * - Audit trail for all compliance operations
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthenticatedUser, checkPermission } from "./lib/auth-helpers";

/**
 * GDPR DATA EXPORT
 *
 * Exports all incident data for a specific user or resident.
 * Required for GDPR Article 20 (Right to Data Portability).
 */
export const exportUserData = mutation({
  args: {
    userId: v.optional(v.id("users")),
    residentId: v.optional(v.id("residents")),
    format: v.optional(v.union(v.literal("json"), v.literal("csv"))),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Check permission (only owners and admins can export)
    await checkPermission(ctx, user._id, "view_incident");

    const format = args.format || "json";

    // Collect all incident data
    let incidents = [];

    if (args.userId) {
      // Export incidents created by this user
      incidents = await ctx.db
        .query("incidents")
        .filter((q) => q.eq(q.field("createdBy"), args.userId))
        .collect();
    } else if (args.residentId) {
      // Export incidents for this resident
      incidents = await ctx.db
        .query("incidents")
        .withIndex("by_resident", (q) => q.eq("residentId", args.residentId))
        .collect();
    } else {
      throw new Error("Must specify userId or residentId");
    }

    // Collect audit logs
    const auditLogs = await ctx.db
      .query("incidentAuditLog")
      .filter((q) =>
        args.userId
          ? q.eq(q.field("userId"), args.userId)
          : q.eq(q.field("metadata.residentId"), args.residentId)
      )
      .collect();

    // Create export package
    const exportData = {
      exportDate: new Date().toISOString(),
      exportedBy: user._id,
      dataType: args.userId ? "user_data" : "resident_data",
      subjectId: args.userId || args.residentId,
      incidents: incidents.map(incident => ({
        ...incident,
        // Remove internal IDs for privacy
        _id: undefined,
        _creationTime: undefined,
      })),
      auditLogs: auditLogs.map(log => ({
        ...log,
        _id: undefined,
        _creationTime: undefined,
      })),
      totalIncidents: incidents.length,
      totalAuditEntries: auditLogs.length,
    };

    // Log the export for compliance
    await ctx.db.insert("incidentAuditLog", {
      incidentId: null,
      userId: user._id,
      action: "export",
      timestamp: Date.now(),
      metadata: {
        count: incidents.length,
        exportFormat: format,
        residentId: args.residentId,
      },
    });

    // Return formatted data
    if (format === "csv") {
      return {
        format: "csv",
        data: convertToCSV(exportData.incidents),
        filename: `incident_export_${Date.now()}.csv`,
      };
    }

    return {
      format: "json",
      data: JSON.stringify(exportData, null, 2),
      filename: `incident_export_${Date.now()}.json`,
    };
  },
});

/**
 * CREATE BACKUP
 *
 * Creates a complete backup of all incidents.
 * Should be run via cron job (weekly).
 */
export const createBackup = internalMutation({
  args: {
    organizationId: v.optional(v.string()),
    teamId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    // Fetch all incidents
    let query = ctx.db.query("incidents");

    if (args.organizationId) {
      query = query
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        );
    } else if (args.teamId) {
      query = query
        .withIndex("by_team", (q) => q.eq("teamId", args.teamId));
    }

    const incidents = await query.collect();

    // Create backup data
    const backupData = {
      backupDate: new Date().toISOString(),
      version: "2.0",
      schemaVersion: 2,
      organizationId: args.organizationId,
      teamId: args.teamId,
      incidentCount: incidents.length,
      incidents: incidents,
    };

    const backupJson = JSON.stringify(backupData);
    const fileSizeBytes = new Blob([backupJson]).size;

    // Store backup file
    const blob = new Blob([backupJson], { type: "application/json" });
    const storageId = await ctx.storage.store(blob);

    // Calculate checksum for integrity
    const checksumMD5 = await generateMD5(backupJson);

    // Create backup record
    const backupId = await ctx.db.insert("incidentBackups", {
      backupDate: Date.now(),
      incidentCount: incidents.length,
      fileSize: fileSizeBytes,
      storageId,
      status: "completed",
      createdBy: incidents[0]?.createdBy || ("system" as Id<"users">),
      organizationId: args.organizationId,
      teamId: args.teamId,
      checksumMD5,
    });

    const duration = Date.now() - startTime;

    return {
      backupId,
      incidentCount: incidents.length,
      fileSizeKB: Math.round(fileSizeBytes / 1024),
      durationMs: duration,
      checksumMD5,
    };
  },
});

/**
 * RESTORE FROM BACKUP
 *
 * Restores incidents from a previous backup.
 * Use with caution - this can overwrite data!
 */
export const restoreFromBackup = mutation({
  args: {
    backupId: v.id("incidentBackups"),
    confirmRestore: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Only owners can restore
    await checkPermission(ctx, user._id, "delete_incident");

    if (!args.confirmRestore) {
      throw new Error("Must confirm restore operation");
    }

    // Get backup record
    const backup = await ctx.db.get(args.backupId);
    if (!backup) {
      throw new Error("Backup not found");
    }

    if (backup.status !== "completed") {
      throw new Error("Cannot restore from incomplete backup");
    }

    // Get backup file
    const backupFile = await ctx.storage.getUrl(backup.storageId);
    if (!backupFile) {
      throw new Error("Backup file not found in storage");
    }

    // Fetch and parse backup data
    const response = await fetch(backupFile);
    const backupData = await response.json();

    // Verify checksum
    const currentChecksum = await generateMD5(JSON.stringify(backupData));
    if (currentChecksum !== backup.checksumMD5) {
      throw new Error("Backup integrity check failed - data may be corrupted");
    }

    // Restore incidents
    let restoredCount = 0;
    for (const incident of backupData.incidents) {
      // Check if incident already exists
      const existing = await ctx.db.get(incident._id);
      if (!existing) {
        await ctx.db.insert("incidents", incident);
        restoredCount++;
      }
    }

    // Log restore operation
    await ctx.db.insert("incidentAuditLog", {
      incidentId: null,
      userId: user._id,
      action: "export", // Using 'export' as closest match
      timestamp: Date.now(),
      metadata: {
        count: restoredCount,
        reason: `Restored from backup ${args.backupId}`,
      },
    });

    return {
      restoredCount,
      totalInBackup: backupData.incidentCount,
      backupDate: backupData.backupDate,
    };
  },
});

/**
 * ENFORCE RETENTION POLICY
 *
 * Permanently deletes incidents past their retention period.
 * Run via cron job (monthly).
 *
 * IMPORTANT: This is permanent deletion!
 */
export const enforceRetentionPolicy = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Find incidents past their retention period
    const expiredIncidents = await ctx.db
      .query("incidents")
      .filter((q) =>
        q.and(
          q.neq(q.field("scheduledDeletionAt"), undefined),
          q.lt(q.field("scheduledDeletionAt"), now)
        )
      )
      .collect();

    let deletedCount = 0;

    for (const incident of expiredIncidents) {
      // Final audit log before deletion
      await ctx.db.insert("incidentAuditLog", {
        incidentId: incident._id,
        userId: incident.createdBy || ("system" as Id<"users">),
        action: "delete",
        timestamp: now,
        metadata: {
          reason: `Retention period expired (${incident.retentionPeriodYears} years)`,
          incidentLevel: incident.incidentLevel,
        },
      });

      // Permanent deletion
      await ctx.db.delete(incident._id);
      deletedCount++;
    }

    return {
      deletedCount,
      nextRunDate: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  },
});

/**
 * GET AUDIT TRAIL
 *
 * Retrieves audit log for a specific incident or user.
 */
export const getAuditTrail = query({
  args: {
    incidentId: v.optional(v.id("incidents")),
    userId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // Check permission
    await checkPermission(ctx, user._id, "view_incident");

    let query = ctx.db.query("incidentAuditLog");

    if (args.incidentId) {
      query = query.withIndex("by_incident", (q) =>
        q.eq("incidentId", args.incidentId)
      );
    } else if (args.userId) {
      query = query.withIndex("by_user", (q) => q.eq("userId", args.userId));
    }

    let logs = await query.collect();

    // Filter by date range
    if (args.startDate) {
      logs = logs.filter(log => log.timestamp >= args.startDate!);
    }
    if (args.endDate) {
      logs = logs.filter(log => log.timestamp <= args.endDate!);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    const limit = args.limit || 100;
    return logs.slice(0, limit);
  },
});

/**
 * GET RETENTION REPORT
 *
 * Shows incidents approaching retention limits.
 */
export const getRetentionReport = query({
  args: {
    organizationId: v.optional(v.string()),
    daysUntilExpiry: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await checkPermission(ctx, user._id, "view_incident");

    const now = Date.now();
    const warningPeriod = (args.daysUntilExpiry || 90) * 24 * 60 * 60 * 1000;
    const warningDate = now + warningPeriod;

    let query = ctx.db.query("incidents");

    if (args.organizationId) {
      query = query.withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      );
    }

    const incidents = await query.collect();

    const expiringIncidents = incidents.filter(inc =>
      inc.scheduledDeletionAt &&
      inc.scheduledDeletionAt <= warningDate &&
      inc.scheduledDeletionAt > now
    );

    const expiredIncidents = incidents.filter(inc =>
      inc.scheduledDeletionAt &&
      inc.scheduledDeletionAt <= now
    );

    const archivedIncidents = incidents.filter(inc => inc.isArchived);

    return {
      totalIncidents: incidents.length,
      archivedCount: archivedIncidents.length,
      expiringCount: expiringIncidents.length,
      expiredCount: expiredIncidents.length,
      expiringIncidents: expiringIncidents.map(inc => ({
        _id: inc._id,
        date: inc.date,
        incidentLevel: inc.incidentLevel,
        scheduledDeletionAt: inc.scheduledDeletionAt,
        daysUntilDeletion: Math.floor(
          ((inc.scheduledDeletionAt || 0) - now) / (24 * 60 * 60 * 1000)
        ),
      })),
    };
  },
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Convert incidents array to CSV format
 */
function convertToCSV(incidents: any[]): string {
  if (incidents.length === 0) {
    return "No data";
  }

  const headers = Object.keys(incidents[0]);
  const csvRows = [headers.join(",")];

  for (const incident of incidents) {
    const values = headers.map(header => {
      const value = incident[header];
      // Escape commas and quotes
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Generate MD5 checksum for data integrity
 */
async function generateMD5(data: string): Promise<string> {
  // Use Web Crypto API for MD5 hashing
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Note: MD5 is not in Web Crypto, use SHA-256 instead for production
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}
