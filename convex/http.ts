import { httpRouter } from "convex/server";
import { betterAuthComponent } from "./auth";
import { createAuth } from "../lib/auth";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

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
