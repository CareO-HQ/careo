/**
 * Authentication and Authorization Helpers for Convex
 *
 * These helpers enforce security controls across all Convex queries and mutations.
 *
 * @module auth-helpers
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get authenticated user with error handling
 *
 * @throws {Error} If user is not authenticated or not found in database
 * @returns Promise<User> The authenticated user object
 */
export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity?.email) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("byEmail", (q) => q.eq("email", identity.email))
    .first();

  if (!user) {
    throw new Error("User not found in database");
  }

  return user;
}

/**
 * Check if user has access to a specific resident
 *
 * Verifies that the user belongs to the same team as the resident.
 * This prevents cross-team data access.
 *
 * @param ctx - Query or Mutation context
 * @param userId - ID of the user requesting access
 * @param residentId - ID of the resident being accessed
 * @throws {Error} If resident not found or user not authorized
 * @returns Promise<Resident> The resident object if access is granted
 */
export async function canAccessResident(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  residentId: Id<"residents">
) {
  const resident = await ctx.db.get(residentId);

  if (!resident) {
    throw new Error("Resident not found");
  }

  // Get user's team memberships
  const teamMember = await ctx.db
    .query("teamMembers")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("teamId"), resident.teamId))
    .first();

  if (!teamMember) {
    throw new Error("Not authorized to access this resident's data");
  }

  return resident;
}

/**
 * Check if user has permission for specific action
 *
 * Implements Role-Based Access Control (RBAC):
 * - Owner: Full access (create, view, edit, delete)
 * - Admin: Create, view, edit (no delete)
 * - Member: Create and view only
 *
 * @param ctx - Query or Mutation context
 * @param userId - ID of the user
 * @param permission - Action being requested
 * @throws {Error} If user lacks permission
 * @returns Promise<true> If permission is granted
 */
export async function checkPermission(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  permission: "create_incident" | "view_incident" | "edit_incident" | "delete_incident"
): Promise<boolean> {
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Get user's role from team membership
  const teamMember = await ctx.db
    .query("teamMembers")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .first();

  if (!teamMember) {
    throw new Error("User not assigned to any team");
  }

  const role = teamMember.role; // "owner" | "admin" | "member"

  // Define permissions matrix
  const permissions: Record<string, string[]> = {
    owner: ["create_incident", "view_incident", "edit_incident", "delete_incident"],
    admin: ["create_incident", "view_incident", "edit_incident"],
    member: ["create_incident", "view_incident"],
  };

  if (!permissions[role]?.includes(permission)) {
    throw new Error(`Permission denied: ${permission} (role: ${role})`);
  }

  return true;
}

/**
 * Log data access for audit trail
 *
 * Creates an audit log entry for compliance and security monitoring.
 *
 * @param ctx - Mutation context (queries can't insert)
 * @param params - Audit log parameters
 */
export async function logDataAccess(
  ctx: MutationCtx,
  params: {
    incidentId: Id<"incidents"> | null;
    userId: Id<"users">;
    action: "create" | "view" | "view_list" | "update" | "delete" | "archive" | "export" | "print";
    metadata?: Record<string, any>;
  }
) {
  await ctx.db.insert("incidentAuditLog", {
    incidentId: params.incidentId,
    userId: params.userId,
    action: params.action,
    timestamp: Date.now(),
    metadata: params.metadata,
  });
}

/**
 * Validate incident data before storage
 *
 * Performs backend validation to prevent invalid data even if frontend is bypassed.
 *
 * @param args - Incident form data
 * @throws {Error} If validation fails
 */
export function validateIncidentData(args: any): void {
  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD");
  }

  // Validate time format (HH:mm)
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(args.time)) {
    throw new Error("Invalid time format. Expected HH:mm");
  }

  // Validate NHS number if provided (10 digits)
  if (args.healthCareNumber && !/^\d{10}$/.test(args.healthCareNumber)) {
    throw new Error("Invalid NHS number. Must be 10 digits");
  }

  // Validate incident level
  const validLevels = ["death", "permanent_harm", "minor_injury", "no_harm", "near_miss"];
  if (!validLevels.includes(args.incidentLevel)) {
    throw new Error(`Invalid incident level: ${args.incidentLevel}`);
  }

  // Conditional validation: serious incidents require detailed information
  if (["death", "permanent_harm"].includes(args.incidentLevel)) {
    if (!args.detailedDescription || args.detailedDescription.length < 100) {
      throw new Error("Serious incidents require detailed description (minimum 100 characters)");
    }
    if (!args.injuryDescription) {
      throw new Error("Injury description required for serious incidents");
    }
    if (!args.treatmentDetails) {
      throw new Error("Treatment details required for serious incidents");
    }
  }

  // Validate date is not in the future
  const incidentDate = new Date(args.date + "T" + args.time);
  if (incidentDate > new Date()) {
    throw new Error("Incident date and time cannot be in the future");
  }

  // Validate required fields
  if (!args.homeName || args.homeName.trim().length === 0) {
    throw new Error("Home name is required");
  }

  if (!args.unit || args.unit.trim().length === 0) {
    throw new Error("Unit is required");
  }

  if (!args.detailedDescription || args.detailedDescription.trim().length < 50) {
    throw new Error("Detailed description must be at least 50 characters");
  }

  if (!args.incidentTypes || args.incidentTypes.length === 0) {
    throw new Error("At least one incident type must be selected");
  }
}

/**
 * Sanitize text inputs (server-side)
 *
 * Note: Requires isomorphic-dompurify
 * npm install isomorphic-dompurify
 *
 * @param args - Incident form data
 * @returns Sanitized data object
 */
export function sanitizeIncidentInputs(args: any): any {
  // Import DOMPurify (works on server-side with isomorphic-dompurify)
  const createDOMPurify = require('isomorphic-dompurify');
  const DOMPurify = createDOMPurify();

  const sanitized = { ...args };

  // List of all text fields that need sanitization
  const textFields = [
    'homeName',
    'unit',
    'injuredPersonFirstName',
    'injuredPersonSurname',
    'residentInternalId',
    'healthCareNumber',
    'contractorEmployer',
    'detailedDescription',
    'injuryDescription',
    'bodyPartInjured',
    'treatmentDetails',
    'vitalSigns',
    'furtherActionsAdvised',
    'preventionMeasures',
    'homeManagerInformedBy',
    'onCallManagerName',
    'nokInformedWho',
    'nokInformedBy',
    'careManagerName',
    'careManagerEmail',
    'keyWorkerName',
    'keyWorkerEmail',
    'completedByFullName',
    'completedByJobTitle',
    'completedBySignature',
    'witness1Name',
    'witness1Contact',
    'witness2Name',
    'witness2Contact',
    'typeOtherDetails',
  ];

  textFields.forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      // Strip all HTML tags and dangerous characters
      sanitized[field] = DOMPurify.sanitize(sanitized[field], {
        ALLOWED_TAGS: [], // Remove all HTML
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true, // Keep text content
      }).trim();
    }
  });

  // Sanitize array fields
  if (sanitized.incidentTypes && Array.isArray(sanitized.incidentTypes)) {
    sanitized.incidentTypes = sanitized.incidentTypes.map((type: string) =>
      DOMPurify.sanitize(type, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    );
  }

  if (sanitized.treatmentTypes && Array.isArray(sanitized.treatmentTypes)) {
    sanitized.treatmentTypes = sanitized.treatmentTypes.map((type: string) =>
      DOMPurify.sanitize(type, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    );
  }

  if (sanitized.nurseActions && Array.isArray(sanitized.nurseActions)) {
    sanitized.nurseActions = sanitized.nurseActions.map((action: string) =>
      DOMPurify.sanitize(action, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    );
  }

  if (sanitized.injuredPersonStatus && Array.isArray(sanitized.injuredPersonStatus)) {
    sanitized.injuredPersonStatus = sanitized.injuredPersonStatus.map((status: string) =>
      DOMPurify.sanitize(status, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    );
  }

  return sanitized;
}

/**
 * Rate limiting check for incident creation
 *
 * Prevents abuse by limiting incidents per user per time period.
 * In production, use Redis instead of in-memory Map.
 *
 * @param ctx - Query or Mutation context
 * @param userId - ID of the user
 * @throws {Error} If rate limit exceeded
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<void> {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const key = `incident_create:${userId}`;

  const limit = rateLimitMap.get(key);

  if (!limit || limit.resetAt < now) {
    // Reset or initialize
    rateLimitMap.set(key, { count: 1, resetAt: now + oneHour });
    return;
  }

  if (limit.count >= 10) {
    // Max 10 incidents per hour
    const minutesUntilReset = Math.ceil((limit.resetAt - now) / 60000);
    throw new Error(
      `Rate limit exceeded. You can create more incidents in ${minutesUntilReset} minutes.`
    );
  }

  limit.count++;
}
