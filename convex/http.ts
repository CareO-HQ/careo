import { httpRouter } from "convex/server";
import { betterAuthComponent } from "./auth";
import { createAuth } from "./authConfig";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { createCorsHeaders, isOriginAllowed } from "./httpHelpers";
import { components } from "./_generated/api";
import { canInviteMembers, getAllowedRolesToInvite, type UserRole } from "./lib/permissions";

const http = httpRouter();

// Create a CORS-wrapped HTTP router
const corsMiddleware = (handler: (ctx: any, request: Request) => Promise<Response>) => {
  return async (ctx: any, request: Request) => {
    const origin = request.headers.get("origin");

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: createCorsHeaders(origin),
      });
    }

    // Execute the actual handler
    const response = await handler(ctx, request);

    // Add CORS headers to response
    const corsHeaders = createCorsHeaders(origin);
    const headers = new Headers(response.headers);

    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
};

// Wrap the Better Auth component's handler with CORS
const originalRegisterRoutes = betterAuthComponent.registerRoutes;

betterAuthComponent.registerRoutes = function(router: any, authCreator: any) {
  // Create a wrapped router that adds CORS to all responses
  const wrappedRouter = {
    ...router,
    route: (config: any) => {
      const originalHandler = config.handler;
      config.handler = httpAction(corsMiddleware(originalHandler));
      return router.route(config);
    },
  };

  // Register routes with the wrapped router
  return originalRegisterRoutes.call(this, wrappedRouter, authCreator);
};

betterAuthComponent.registerRoutes(http, createAuth);

// Custom invitation endpoint that allows managers to invite members
http.route({
  path: "/api/custom/invite-member",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    
    try {
      const body = await request.json();
      const { email, role } = body;

      if (!email || !role) {
        return new Response(
          JSON.stringify({ error: "Email and role are required" }),
          { 
            status: 400, 
            headers: { ...createCorsHeaders(origin), "Content-Type": "application/json" } 
          }
        );
      }

      // Get current session
      const session = await ctx.runQuery(components.betterAuth.lib.getCurrentSession);
      if (!session || !session.userId) {
        return new Response(
          JSON.stringify({ error: "Not authenticated" }),
          { 
            status: 401, 
            headers: { ...createCorsHeaders(origin), "Content-Type": "application/json" } 
          }
        );
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
        return new Response(
          JSON.stringify({ error: "Member record not found" }),
          { 
            status: 404, 
            headers: { ...createCorsHeaders(origin), "Content-Type": "application/json" } 
          }
        );
      }

      // Check permissions using our custom logic
      const userRole = currentMember.role as UserRole;
      if (!canInviteMembers(userRole)) {
        return new Response(
          JSON.stringify({ error: "You don't have permission to invite members" }),
          { 
            status: 403, 
            headers: { ...createCorsHeaders(origin), "Content-Type": "application/json" } 
          }
        );
      }

      // Check if they can invite this specific role
      const allowedRoles = getAllowedRolesToInvite(userRole);
      if (!allowedRoles.includes(role as UserRole)) {
        return new Response(
          JSON.stringify({ error: `You can only invite: ${allowedRoles.join(", ")}` }),
          { 
            status: 403, 
            headers: { ...createCorsHeaders(origin), "Content-Type": "application/json" } 
          }
        );
      }

      // Check if user already invited
      const existingInvitation = await ctx.runQuery(components.betterAuth.lib.findOne, {
        model: "invitation",
        where: [
          { field: "email", value: email },
          { field: "organizationId", value: currentMember.organizationId }
        ]
      });

      if (existingInvitation) {
        return new Response(
          JSON.stringify({ error: "USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION" }),
          { 
            status: 400, 
            headers: { ...createCorsHeaders(origin), "Content-Type": "application/json" } 
          }
        );
      }

      // Temporarily update the manager's role to "admin" so better-auth allows the invitation
      const originalRole = currentMember.role;
      if (userRole === "manager") {
        await ctx.runMutation(components.betterAuth.lib.updateOne, {
          input: {
            model: "member",
            where: [{ field: "id", value: currentMember.id }],
            update: { role: "admin" }
          }
        });
      }

      try {
        // Forward the request to better-auth's invite endpoint
        // This will handle creating the invitation and sending the email
        const inviteResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/organization/invite-member`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cookie": request.headers.get("cookie") || "",
          },
          body: JSON.stringify({ email, role }),
        });

        const result = await inviteResponse.json();

        return new Response(
          JSON.stringify(result),
          { 
            status: inviteResponse.status, 
            headers: { ...createCorsHeaders(origin), "Content-Type": "application/json" } 
          }
        );
      } finally {
        // Restore the original role
        if (userRole === "manager") {
          await ctx.runMutation(components.betterAuth.lib.updateOne, {
            input: {
              model: "member",
              where: [{ field: "id", value: currentMember.id }],
              update: { role: originalRole }
            }
          });
        }
      }
    } catch (error) {
      console.error("Error in custom invite endpoint:", error);
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : "Failed to send invitation" 
        }),
        { 
          status: 500, 
          headers: { ...createCorsHeaders(origin), "Content-Type": "application/json" } 
        }
      );
    }
  }),
});

// Admin endpoint to delete all action plans
// DANGER: This will delete ALL action plans and related notifications!
// Call via Convex dashboard Functions tab or curl:
// curl -X POST https://your-convex-url.convex.cloud/deleteAllActionPlans \
//   -H "Content-Type: application/json" \
//   -d '{"adminPassword": "YOUR_PASSWORD", "confirmationToken": "DELETE_ALL_ACTION_PLANS_CONFIRMED"}'
http.route({
  path: "/deleteAllActionPlans",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    // Safety check - require admin password from environment
    const adminPassword = body.adminPassword;
    if (!process.env.ADMIN_PASSWORD || adminPassword !== process.env.ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing admin password. Set ADMIN_PASSWORD in environment." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const confirmationToken = body.confirmationToken;

    try {
      const results = await ctx.runMutation(internal.adminUtils.deleteAllActionPlans, {
        confirmationToken,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "All action plans and related notifications deleted",
          results,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Safer endpoint to delete only old completed action plans
http.route({
  path: "/deleteOldActionPlans",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    const adminPassword = body.adminPassword;
    if (!process.env.ADMIN_PASSWORD || adminPassword !== process.env.ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing admin password" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const daysOld = body.daysOld || 90;

    try {
      const results = await ctx.runMutation(internal.adminUtils.deleteOldCompletedActionPlans, {
        daysOld,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Deleted completed action plans older than ${daysOld} days`,
          results,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
