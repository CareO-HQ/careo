import { httpRouter } from "convex/server";
import { betterAuthComponent } from "./auth";
import { createAuth } from "../lib/auth";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { createCorsHeaders, isOriginAllowed } from "./httpHelpers";

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
