"use server";

import { createClient } from "@supabase/supabase-js";
import resend from "@/lib/resend";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env configuration for server actions");
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// 0. Fetch agency request by activation token (server-side, bypasses RLS)
// Used by /onboarding/agency before the user is authenticated.
export async function getAgencyRequestByToken(token: string) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("agency_requests")
      .select(`
        *,
        agency_staff:agency_staff_id (*),
        organizations:organization_id (name),
        care_homes:care_home_id (name),
        teams:team_id (name)
      `)
      .eq("activation_token", token)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || "Failed to fetch request" };
  }
}

// 1. Approve Agency Request

export async function approveAgencyRequest(
  requestId: string,
  profileVerified: boolean,
  profileVerifiedBy: string,
  inductionGiven: boolean,
  inductionGivenBy: string | null
) {
  try {
    const supabase = getSupabaseClient();
    
    // Update request status to 'approved' and save verification details
    const { error: updateError } = await supabase
      .from("agency_requests")
      .update({
        status: "approved",
        profile_verified: profileVerified,
        profile_verified_by: profileVerifiedBy,
        induction_given: inductionGiven,
        induction_given_by: inductionGivenBy,
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (updateError) throw updateError;

    // Fetch the request to get the staff ID
    const { data: request, error: fetchError } = await supabase
      .from("agency_requests")
      .select("agency_staff_id")
      .eq("id", requestId)
      .single();

    if (fetchError) throw fetchError;

    // Also update the worker's status to 'approved'
    const { error: staffError } = await supabase
      .from("agency_staff")
      .update({
        status: "approved",
        updated_at: new Date().toISOString()
      })
      .eq("id", request.agency_staff_id);

    if (staffError) throw staffError;

    return { success: true };
  } catch (error: any) {
    console.error("Error approving agency request:", error);
    return { success: false, error: error.message || "Failed to approve request" };
  }
}

// 2. Invite Agency Staff (Sends email via Resend and generates onboarding token)
export async function inviteAgencyStaff(args: {
  requestId: string;
  email: string;
  role: string;
  careHomeName: string;
  inviterName: string;
}) {
  const { requestId, email, role, careHomeName, inviterName } = args;
  
  try {
    const supabase = getSupabaseClient();
    const token = crypto.randomUUID();

    // Update activation details on the request
    const { error: updateError } = await supabase
      .from("agency_requests")
      .update({
        activation_token: token,
        activation_sent: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (updateError) throw updateError;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/onboarding/agency?token=${token}&email=${email}`;

    // Send email using Resend
    const result = await resend.emails.send({
      from: "CareO <care@careo.uk>",
      to: [email],
      subject: `Activate your temp assignment at ${careHomeName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #0f766e;">Hello,</h2>
          <p>You have been assigned as an agency <strong>${role.replace("_", " ")}</strong> to <strong>${careHomeName}</strong> by <strong>${inviterName}</strong>.</p>
          <p>Please click the button below to activate your account and start your shift:</p>
          <div style="margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #0d9488; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Activate & Log In</a>
          </div>
          <p>If the button above does not work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #0d9488;">${inviteLink}</p>
          <hr style="margin-top: 40px; border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666;">This onboarding link is secure and unique to you.</p>
        </div>
      `
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return { success: false, error: result.error.message, inviteLink }; // fallback with link for local debugging
    }

    return { success: true, inviteLink };
  } catch (error: any) {
    console.error("Error sending onboarding invitation:", error);
    return { success: false, error: error.message || "Failed to send invitation" };
  }
}

// 3. Offboard Agency Staff
export async function offboardAgencyStaff(args: {
  userId: string | null; // Auth ID in CareO (if active)
  requestId: string;
  staffId: string;
}) {
  const { userId, requestId, staffId } = args;

  try {
    const supabase = getSupabaseClient();
    const timestamp = new Date().toISOString();

    // Update request record
    const { error: requestError } = await supabase
      .from("agency_requests")
      .update({
        status: "offboarded",
        offboarded_at: timestamp,
        updated_at: timestamp
      })
      .eq("id", requestId);

    if (requestError) throw requestError;

    // Reset agency staff availability status to 'available'
    const { error: staffError } = await supabase
      .from("agency_staff")
      .update({
        status: "available",
        updated_at: timestamp
      })
      .eq("id", staffId);

    if (staffError) throw staffError;

    // If worker actually onboarded and has a public.users account in CareO
    if (userId) {
      // 1. Reset organization/carehome/team IDs to NULL in public.users
      const { error: userError } = await supabase
        .from("users")
        .update({
          active_organization_id: null,
          active_care_home_id: null,
          active_team_id: null,
          updated_at: timestamp
        })
        .eq("id", userId);

      if (userError) throw userError;

      // 2. Remove assignments from public.team_staff
      const { error: teamStaffError } = await supabase
        .from("team_staff")
        .delete()
        .eq("user_id", userId);

      if (teamStaffError) throw teamStaffError;

      // 3. Clear auth user metadata active IDs
      // Fetch current app metadata
      const { data: authUser, error: authGetError } = await supabase.auth.admin.getUserById(userId);
      if (!authGetError && authUser?.user) {
        const currentMeta = authUser.user.app_metadata || {};
        const updatedMeta = {
          ...currentMeta,
          active_organization_id: null,
          active_care_home_id: null,
          active_team_id: null
        };
        await supabase.auth.admin.updateUserById(userId, {
          app_metadata: updatedMeta
        });
      }

      // 4. Force-logout all active sessions for this user immediately
      await supabase.auth.admin.signOut(userId, "global");
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error offboarding agency staff:", error);
    return { success: false, error: error.message || "Failed to offboard staff member" };
  }
}

// 4. Regenerate Agency Link Code
export async function regenerateAgencyLinkCode(careHomeId: string) {
  try {
    const supabase = getSupabaseClient();
    
    // Generate unique 5-char alphanumeric code
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      attempts++;
      code = "";
      for (let i = 0; i < 5; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if it's unique
      const { data, error } = await supabase
        .from("care_homes")
        .select("id")
        .eq("agency_link_code", code)
        .maybeSingle();
        
      if (!error && !data) {
        isUnique = true;
      }
    }
    
    if (!isUnique) {
      throw new Error("Failed to generate a unique code after multiple attempts");
    }
    
    // Update the care_homes table
    const { error: updateError } = await supabase
      .from("care_homes")
      .update({
        agency_link_code: code,
        updated_at: new Date().toISOString()
      })
      .eq("id", careHomeId);
      
    if (updateError) throw updateError;
    
    return { success: true, code };
  } catch (error: any) {
    console.error("Error regenerating agency link code:", error);
    return { success: false, error: error.message || "Failed to regenerate link code" };
  }
}

