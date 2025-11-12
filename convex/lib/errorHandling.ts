/**
 * Error Handling Utilities for Convex Functions
 *
 * Provides consistent error handling, logging, and user-friendly error messages
 * for production reliability.
 */

import { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Error types for categorization and monitoring
 */
export enum ErrorType {
  AUTHENTICATION = "AUTHENTICATION_ERROR",
  AUTHORIZATION = "AUTHORIZATION_ERROR",
  VALIDATION = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND_ERROR",
  DATABASE = "DATABASE_ERROR",
  RATE_LIMIT = "RATE_LIMIT_ERROR",
  EXTERNAL_API = "EXTERNAL_API_ERROR",
  UNKNOWN = "UNKNOWN_ERROR",
}

/**
 * Custom error class with additional context
 */
export class ConvexError extends Error {
  type: ErrorType;
  statusCode: number;
  context?: Record<string, any>;
  timestamp: number;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusCode: number = 500,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = "ConvexError";
    this.type = type;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = Date.now();
  }
}

/**
 * User-friendly error messages
 */
const USER_ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.AUTHENTICATION]: "Please log in to continue.",
  [ErrorType.AUTHORIZATION]: "You don't have permission to perform this action.",
  [ErrorType.VALIDATION]: "The information provided is invalid. Please check and try again.",
  [ErrorType.NOT_FOUND]: "The requested information could not be found.",
  [ErrorType.DATABASE]: "A database error occurred. Please try again.",
  [ErrorType.RATE_LIMIT]: "Too many requests. Please wait a moment and try again.",
  [ErrorType.EXTERNAL_API]: "An external service is temporarily unavailable. Please try again later.",
  [ErrorType.UNKNOWN]: "An unexpected error occurred. Please try again.",
};

/**
 * Log error to console with structured data
 * In production, this would send to error tracking service (Sentry, etc.)
 */
export function logError(
  ctx: QueryCtx | MutationCtx,
  error: Error | ConvexError,
  operation: string,
  additionalContext?: Record<string, any>
) {
  const errorData = {
    timestamp: new Date().toISOString(),
    operation,
    message: error.message,
    type: error instanceof ConvexError ? error.type : ErrorType.UNKNOWN,
    stack: error.stack,
    context: {
      ...(error instanceof ConvexError ? error.context : {}),
      ...additionalContext,
    },
  };

  // Log to console (in production, send to error tracking service)
  console.error("=== CONVEX ERROR ===");
  console.error(JSON.stringify(errorData, null, 2));
  console.error("===================");

  // TODO: Send to Sentry/error tracking service
  // Example: Sentry.captureException(error, { extra: errorData });

  return errorData;
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: Error | ConvexError): string {
  if (error instanceof ConvexError) {
    // Return custom message if provided, otherwise use default for type
    return error.message || USER_ERROR_MESSAGES[error.type];
  }

  // For standard errors, return generic message
  return USER_ERROR_MESSAGES[ErrorType.UNKNOWN];
}

/**
 * Wrap mutation handler with error handling
 *
 * Usage:
 * export const myMutation = mutation({
 *   args: { ... },
 *   handler: withErrorHandling("myMutation", async (ctx, args) => {
 *     // Your mutation logic here
 *   })
 * });
 */
export function withErrorHandling<Args, Result>(
  operationName: string,
  handler: (ctx: MutationCtx, args: Args) => Promise<Result>
) {
  return async (ctx: MutationCtx, args: Args): Promise<Result> => {
    try {
      return await handler(ctx, args);
    } catch (error) {
      // Log the error
      logError(ctx, error as Error, operationName, { args });

      // Re-throw with user-friendly message
      if (error instanceof ConvexError) {
        throw new Error(getUserErrorMessage(error));
      }

      // For unexpected errors, throw generic message
      throw new Error(USER_ERROR_MESSAGES[ErrorType.UNKNOWN]);
    }
  };
}

/**
 * Wrap query handler with error handling
 */
export function withQueryErrorHandling<Args, Result>(
  operationName: string,
  handler: (ctx: QueryCtx, args: Args) => Promise<Result>
) {
  return async (ctx: QueryCtx, args: Args): Promise<Result> => {
    try {
      return await handler(ctx, args);
    } catch (error) {
      // Log the error
      logError(ctx, error as Error, operationName, { args });

      // Re-throw with user-friendly message
      if (error instanceof ConvexError) {
        throw new Error(getUserErrorMessage(error));
      }

      // For unexpected errors, throw generic message
      throw new Error(USER_ERROR_MESSAGES[ErrorType.UNKNOWN]);
    }
  };
}

/**
 * Validation helper with error handling
 */
export function validateRequired<T>(
  value: T | undefined | null,
  fieldName: string
): T {
  if (value === undefined || value === null || value === "") {
    throw new ConvexError(
      `${fieldName} is required`,
      ErrorType.VALIDATION,
      400,
      { field: fieldName }
    );
  }
  return value;
}

/**
 * Safe database operation wrapper
 */
export async function safeDatabaseOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new ConvexError(
      errorMessage,
      ErrorType.DATABASE,
      500,
      { originalError: (error as Error).message }
    );
  }
}

/**
 * Retry mechanism for transient errors
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Log retry attempt
      console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, error);

      // Don't retry on authentication/authorization errors
      if (error instanceof ConvexError) {
        if (
          error.type === ErrorType.AUTHENTICATION ||
          error.type === ErrorType.AUTHORIZATION ||
          error.type === ErrorType.VALIDATION
        ) {
          throw error;
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  // All retries failed
  throw new ConvexError(
    `Operation failed after ${maxRetries} attempts`,
    ErrorType.UNKNOWN,
    500,
    { lastError: lastError?.message }
  );
}

/**
 * Performance monitoring helper
 */
export async function measurePerformance<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await operation();
    const duration = performance.now() - startTime;

    // Log slow operations (> 1 second)
    if (duration > 1000) {
      console.warn(`⚠️ SLOW OPERATION: ${operationName} took ${duration.toFixed(2)}ms`);
    } else {
      console.log(`✓ ${operationName} completed in ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`✗ ${operationName} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
}
