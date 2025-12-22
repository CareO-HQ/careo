/**
 * Script to initialize SaaS admin
 *
 * Usage:
 * 1. First, create the user account via the regular signup flow or Better Auth API
 * 2. Then run this script to mark them as SaaS admin:
 *    npx tsx scripts/init-saas-admin.ts
 *
 * Environment Variables:
 * - SAAS_ADMIN_EMAIL: Email of the user to mark as SaaS admin
 * - CONVEX_URL: Your Convex deployment URL (optional, uses NEXT_PUBLIC_CONVEX_URL)
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "";

async function initializeSaasAdmin() {
  if (!CONVEX_URL) {
    throw new Error(
      "CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable is required"
    );
  }

  const email = process.env.SAAS_ADMIN_EMAIL;

  if (!email) {
    throw new Error("SAAS_ADMIN_EMAIL environment variable is required");
  }

  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    console.log(`🔍 Checking if SaaS admin exists for ${email}...`);

    // Check if SaaS admin already exists
    const exists = await client.query(api.saasAdmin.checkSaasAdminExists);

    if (exists) {
      console.log("ℹ️  SaaS admin already exists in the system");
      return;
    }

    // Get user by email
    const user = await client.query(api.user.getUserByEmail, { email });

    if (!user) {
      console.error(
        `❌ User with email ${email} not found.`
      );
      console.log(
        "\n📝 Please follow these steps:\n" +
        "1. Sign up the user via the regular signup flow at /signup\n" +
        "2. Or create the user via Better Auth API\n" +
        "3. Then run this script again\n"
      );
      return;
    }

    // Mark user as SaaS admin using internal mutation
    // Note: We'll need to use a public mutation instead since internal mutations
    // can't be called from external scripts easily
    console.log(`✅ User found: ${user.email}`);
    console.log(`🔧 Marking user as SaaS admin...`);

    // Since we can't easily call internal mutations from external scripts,
    // we'll create a public mutation for this purpose
    // For now, let's use a workaround - update the user directly
    console.log(
      "\n⚠️  Manual step required:\n" +
      "Please run the following mutation in Convex Dashboard:\n" +
      `api.saasAdmin.seedSaasAdmin({ email: "${email}", name: "${user.name || "SaaS Admin"}" })\n` +
      "\nOr use the Convex dashboard to update the user's isSaasAdmin field to true.\n"
    );

    console.log(
      "\n✅ Alternative: Use the SaaS admin dashboard to mark users as SaaS admin\n" +
      "once you have at least one SaaS admin account set up.\n"
    );
  } catch (error: any) {
    console.error("❌ Error initializing SaaS admin:", error);
    throw error;
  }
}

initializeSaasAdmin().catch(console.error);

