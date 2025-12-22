/**
 * Script to create superadmin account
 * 
 * This script creates the superadmin account via Better Auth signup API
 * and then marks them as SaaS admin in Convex.
 * 
 * Usage:
 * 1. Set environment variable SUPERADMIN_PASSWORD (optional, defaults to "SuperAdmin123!")
 * 2. Run: npx tsx scripts/create-superadmin.ts
 */

const SUPERADMIN_EMAIL = "jhonsonashik@gmail.com";
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || "SuperAdmin123!";
const SUPERADMIN_NAME = "Super Administrator";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

async function createSuperAdmin() {
  console.log("🚀 Creating superadmin account...");
  console.log(`Email: ${SUPERADMIN_EMAIL}`);
  console.log(`Password: ${SUPERADMIN_PASSWORD}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Step 1: Sign up via Better Auth API
    console.log("Step 1: Creating user account via Better Auth...");
    const signupUrl = `${BASE_URL}/api/auth/sign-up/email`;
    
    const signupResponse = await fetch(signupUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD,
        name: SUPERADMIN_NAME,
      }),
    });

    if (!signupResponse.ok) {
      const errorData = await signupResponse.json().catch(() => ({}));
      
      if (signupResponse.status === 400 && errorData.message?.includes("exists")) {
        console.log("✅ User already exists in Better Auth");
      } else {
        throw new Error(
          `Signup failed: ${signupResponse.status} ${JSON.stringify(errorData)}`
        );
      }
    } else {
      console.log("✅ User account created successfully");
    }

    // Step 2: Wait for Convex hook to create user record
    console.log("\nStep 2: Waiting for Convex to sync user...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 3: The onCreateUser hook will automatically mark this email as SaaS admin
    console.log("Step 3: User will be automatically marked as SaaS admin...");
    console.log("   (The onCreateUser hook checks for jhonsonashik@gmail.com)");
    
    console.log("\n✅ Superadmin account created!\n");
    console.log("📧 Login credentials:");
    console.log(`   Email: ${SUPERADMIN_EMAIL}`);
    console.log(`   Password: ${SUPERADMIN_PASSWORD}`);
    console.log(`\n🔗 Login at: ${BASE_URL}/saas-admin/login`);
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");
    console.log("\n💡 Note: The account is automatically marked as SaaS admin");
    console.log("   when created with email jhonsonashik@gmail.com");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.log("\n💡 Alternative: Sign up manually at /signup with this email,");
    console.log("   then the account will be automatically marked as SaaS admin.");
    process.exit(1);
  }
}

createSuperAdmin().catch(console.error);

