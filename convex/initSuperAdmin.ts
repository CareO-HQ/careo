import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { components } from "./_generated/api";

/**
 * Initialize Super Admin Account
 * 
 * This action creates the initial superadmin account automatically.
 * It should be called once when the project is first deployed.
 * 
 * Email: jhonsonashik@gmail.com
 * Password: Set via environment variable SUPERADMIN_PASSWORD or defaults to "SuperAdmin123!"
 */
export const initializeSuperAdmin = internalAction({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    email: v.string(),
  }),
  handler: async (ctx): Promise<{
    success: boolean;
    message: string;
    email: string;
  }> => {
    const superAdminEmail = "jhonsonashik@gmail.com";
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD || "SuperAdmin123!";
    const superAdminName = "Super Administrator";

    // Check if this specific email is already a SaaS admin
    const existingUser = await ctx.runQuery(
      internal.saasAdmin.getUserByEmailForInit,
      { email: superAdminEmail }
    );

    if (existingUser?.isSaasAdmin) {
      return {
        success: true,
        message: `Superadmin ${superAdminEmail} already exists`,
        email: superAdminEmail,
      };
    }

    // If user exists but is not SaaS admin, mark them as one
    if (existingUser && !existingUser.isSaasAdmin) {
      const result: {
        success: boolean;
        message: string;
        userId?: string;
      } = await ctx.runMutation(
        internal.saasAdmin.seedSaasAdminInternal,
        {
          email: superAdminEmail,
          name: superAdminName,
        }
      );

      return {
        success: result.success,
        message: result.success
          ? `Existing user ${superAdminEmail} marked as superadmin. Password: ${superAdminPassword}`
          : result.message,
        email: superAdminEmail,
      };
    }

    // Create user account via Better Auth API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const signupUrl = `${baseUrl}/api/auth/sign-up/email`;

    try {
      // Sign up the user via Better Auth API
      const signupResponse = await fetch(signupUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: superAdminEmail,
          password: superAdminPassword,
          name: superAdminName,
        }),
      });

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json().catch(() => ({}));
        
        // If user already exists, try to mark them as SaaS admin
        if (signupResponse.status === 400 || errorData.message?.includes("exists")) {
          console.log("User already exists, marking as SaaS admin...");
          
          // Find the user and mark as SaaS admin
          const result: {
            success: boolean;
            message: string;
            userId?: string;
          } = await ctx.runMutation(
            internal.saasAdmin.seedSaasAdminInternal,
            {
              email: superAdminEmail,
              name: superAdminName,
            }
          );

          return {
            success: result.success,
            message: result.success
              ? `Superadmin ${superAdminEmail} initialized successfully. Password: ${superAdminPassword}`
              : result.message,
            email: superAdminEmail,
          };
        }

        throw new Error(
          `Failed to create user: ${signupResponse.status} ${JSON.stringify(errorData)}`
        );
      }

      // Wait a bit for the user to be created in Convex
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mark user as SaaS admin
      const result: {
        success: boolean;
        message: string;
        userId?: string;
      } = await ctx.runMutation(
        internal.saasAdmin.seedSaasAdminInternal,
        {
          email: superAdminEmail,
          name: superAdminName,
        }
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      return {
        success: true,
        message: `Superadmin ${superAdminEmail} created successfully. Password: ${superAdminPassword}`,
        email: superAdminEmail,
      };
    } catch (error: any) {
      console.error("Error initializing superadmin:", error);
      return {
        success: false,
        message: `Failed to initialize superadmin: ${error.message}`,
        email: superAdminEmail,
      };
    }
  },
});

