/**
 * Authentication and Authorization Helpers for Convex
 *
 * These helpers enforce security controls across all Convex queries and mutations.
 *
 * @module auth-helpers
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { ConvexError, ErrorType, safeDatabaseOperation } from "./errorHandling";

/**
 * Get authenticated user with error handling
 *
 * @throws {Error} If user is not authenticated or not found in database
 * @returns Promise<User> The authenticated user object
 */
export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  try {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.email) {
      throw new ConvexError(
        "You must be logged in to perform this action",
        ErrorType.AUTHENTICATION,
        401
      );
    }

    const user = await safeDatabaseOperation(
      () => ctx.db
        .query("users")
        .withIndex("byEmail", (q) => q.eq("email", identity.email!))
        .first(),
      "Failed to fetch user from database"
    );

    if (!user) {
      throw new ConvexError(
        "User account not found. Please contact support.",
        ErrorType.NOT_FOUND,
        404,
        { email: identity.email }
      );
    }

    return user;
  } catch (error) {
    if (error instanceof ConvexError) {
      throw error;
    }
    throw new ConvexError(
      "Authentication failed. Please try logging in again.",
      ErrorType.AUTHENTICATION,
      401,
      { originalError: (error as Error).message }
    );
  }
}

/**
 * Check if user is SaaS admin
 */
export async function isSaasAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  return user?.isSaasAdmin === true;
}

/**
 * Check if user has access to a specific resident
 *
 * SaaS admin has access to all residents.
 * Role-based authorization will be implemented for other users.
 *
 * @param ctx - Query or Mutation context
 * @param userId - ID of the user requesting access (Convex document ID)
 * @param residentId - ID of the resident being accessed
 * @throws {Error} If resident not found or user not authenticated
 * @returns Promise<Resident> The resident object if access is granted
 */
export async function canAccessResident(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  residentId: Id<"residents">
) {
  const user = await ctx.db.get(userId);
  const resident = await ctx.db.get(residentId);

  if (!resident) {
    throw new Error("Resident not found");
  }

  // Get the user's better-auth identity
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // SaaS admin has access to everything
  if (user?.isSaasAdmin) {
    return resident;
  }

  // TODO: Add role-based authorization checks here for non-SaaS admins
  // For now, any authenticated user can access resident data
  return resident;
}

/**
 * Check if user has permission for specific action
 *
 * SaaS admin has all permissions.
 * Role-based permissions will be implemented for other users.
 *
 * Planned RBAC:
 * - SaaS Admin: Full access to everything
 * - Owner: Full access (create, view, edit, delete)
 * - Admin: Create, view, edit (no delete)
 * - Member: Create and view only
 *
 * @param ctx - Query or Mutation context
 * @param userId - ID of the user
 * @param permission - Action being requested
 * @throws {Error} If user not authenticated
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

  // Get the user's better-auth identity
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // SaaS admin has all permissions
  if (user.isSaasAdmin) {
    return true;
  }

  // TODO: Implement role-based permission checks here for non-SaaS admins
  // For now, any authenticated user can perform any action
  return true;
}

/**
 * Log data access for audit trail
 *
 * Creates an audit log entry for compliance and security monitoring.
 * Note: This function is currently disabled as incidentAuditLog table doesn't exist.
 * Use foodFluidAuditLog for food/fluid logging audit trails.
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
  // TODO: Add incidentAuditLog table to schema if incident audit logging is needed
  // For now, this function is a no-op
  console.log(`Audit log: ${params.action} by ${params.userId} on incident ${params.incidentId}`);
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
 * Uses pure JavaScript sanitization - no external dependencies.
 *
 * @param args - Incident form data
 * @returns Sanitized data object
 */
export function sanitizeIncidentInputs(args: any): any {
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
      sanitized[field] = sanitizeInput(sanitized[field]);
    }
  });

  // Sanitize array fields
  if (sanitized.incidentTypes && Array.isArray(sanitized.incidentTypes)) {
    sanitized.incidentTypes = sanitized.incidentTypes.map((type: string) =>
      sanitizeInput(type)
    );
  }

  if (sanitized.treatmentTypes && Array.isArray(sanitized.treatmentTypes)) {
    sanitized.treatmentTypes = sanitized.treatmentTypes.map((type: string) =>
      sanitizeInput(type)
    );
  }

  if (sanitized.nurseActions && Array.isArray(sanitized.nurseActions)) {
    sanitized.nurseActions = sanitized.nurseActions.map((action: string) =>
      sanitizeInput(action)
    );
  }

  if (sanitized.injuredPersonStatus && Array.isArray(sanitized.injuredPersonStatus)) {
    sanitized.injuredPersonStatus = sanitized.injuredPersonStatus.map((status: string) =>
      sanitizeInput(status)
    );
  }

  return sanitized;
}

/**
 * Rate limiting check
 *
 * Prevents abuse by limiting operations per user per time period.
 * In production, use Redis or Convex tables for distributed rate limiting.
 *
 * @param ctx - Query or Mutation context
 * @param userId - ID of the user
 * @param options - Rate limit configuration
 * @throws {Error} If rate limit exceeded
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  options?: {
    operation?: string;
    maxRequests?: number;
    windowMs?: number;
  }
): Promise<void> {
  const operation = options?.operation || "incident_create";
  const maxRequests = options?.maxRequests || 10;
  const windowMs = options?.windowMs || 60 * 60 * 1000; // 1 hour default

  const now = Date.now();
  const key = `${operation}:${userId}`;

  const limit = rateLimitMap.get(key);

  if (!limit || limit.resetAt < now) {
    // Reset or initialize
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (limit.count >= maxRequests) {
    const minutesUntilReset = Math.ceil((limit.resetAt - now) / 60000);
    throw new Error(
      `Rate limit exceeded. You can perform this action again in ${minutesUntilReset} minutes.`
    );
  }

  limit.count++;
}

/**
 * Sanitize text input (server-side)
 *
 * Removes HTML tags, script tags, and dangerous characters.
 * Pure JavaScript implementation - no external dependencies needed.
 *
 * @param text - Input text to sanitize
 * @returns Sanitized text with HTML/scripts stripped
 */
export function sanitizeInput(text: string | undefined | null): string {
  if (!text) return "";

  // Convert to string and trim
  let sanitized = String(text).trim();

  // Remove script tags and content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove all HTML tags but keep text content
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove HTML entities that could be used for XSS
  sanitized = sanitized.replace(/&lt;/g, '<');
  sanitized = sanitized.replace(/&gt;/g, '>');
  sanitized = sanitized.replace(/&quot;/g, '"');
  sanitized = sanitized.replace(/&#x27;/g, "'");
  sanitized = sanitized.replace(/&#x2F;/g, '/');

  // Remove any remaining < > characters (XSS prevention)
  sanitized = sanitized.replace(/[<>]/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized.trim();
}

/**
 * Validate food/fluid log data
 *
 * Server-side validation for food and fluid intake logs.
 *
 * @param args - Log form data
 * @throws {Error} If validation fails
 */
export function validateFoodFluidLog(args: {
  section?: string;
  typeOfFoodDrink?: string;
  portionServed?: string;
  amountEaten?: string;
  fluidConsumedMl?: number | null;
  signature?: string;
}): void {
  // Validate section
  const validSections = ["midnight-7am", "7am-12pm", "12pm-5pm", "5pm-midnight"];
  if (args.section && !validSections.includes(args.section)) {
    throw new Error(`Invalid section: ${args.section}`);
  }

  // Validate typeOfFoodDrink (required, max 100 chars)
  if (!args.typeOfFoodDrink || args.typeOfFoodDrink.trim().length === 0) {
    throw new Error("Food/drink type is required");
  }
  if (args.typeOfFoodDrink.length > 100) {
    throw new Error("Food/drink type must not exceed 100 characters");
  }

  // Validate amountEaten
  const validAmounts = ["None", "1/4", "1/2", "3/4", "All"];
  if (args.amountEaten && !validAmounts.includes(args.amountEaten)) {
    throw new Error(`Invalid amount eaten: ${args.amountEaten}`);
  }

  // Validate fluidConsumedMl
  if (args.fluidConsumedMl !== undefined && args.fluidConsumedMl !== null) {
    if (args.fluidConsumedMl < 0 || args.fluidConsumedMl > 2000) {
      throw new Error("Fluid volume must be between 0-2000ml");
    }
  }

  // Validate signature (required, max 50 chars)
  if (!args.signature || args.signature.trim().length === 0) {
    throw new Error("Signature is required");
  }
  if (args.signature.length > 50) {
    throw new Error("Signature must not exceed 50 characters");
  }
}

/**
 * Log food/fluid data access for audit trail
 *
 * Creates an audit log entry for GDPR compliance and security monitoring.
 *
 * @param ctx - Mutation context
 * @param params - Audit log parameters
 */
export async function logFoodFluidAccess(
  ctx: MutationCtx,
  params: {
    logId: Id<"foodFluidLogs"> | null;
    residentId: Id<"residents">;
    userId: Id<"users">;
    action: "create" | "view" | "update" | "delete" | "archive" | "export";
    metadata?: {
      count?: number;
      exportFormat?: string;
      section?: string;
      fluidMl?: number;
    };
  }
) {
  await ctx.db.insert("foodFluidAuditLog", {
    logId: params.logId,
    residentId: params.residentId,
    userId: params.userId,
    action: params.action,
    timestamp: Date.now(),
    metadata: params.metadata,
  });
}
