import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

// Helper to create Supabase client
function createSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.delete(name);
        },
      },
    }
  );

  return { supabase, response };
}

// GET - Get or create current audit session
export async function GET(request: NextRequest) {
  try {
    const { supabase } = createSupabaseClient(request);

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, active_team_id, active_care_home_id, name, role")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if user has manager role
    if (!["manager", "admin", "owner"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const auditId = searchParams.get("auditId");

    // If auditId provided, fetch that specific audit
    if (auditId) {
      const { data: audit, error: auditError } = await supabase
        .from("manager_audits")
        .select("*")
        .eq("id", auditId)
        .eq("organization_id", profile.organization_id)
        .single();

      if (auditError) {
        return NextResponse.json({ error: "Audit not found" }, { status: 404 });
      }

      // Fetch all entries for this audit with resident details
      const { data: entries, error: entriesError } = await supabase
        .from("modified_diet_audit_entries")
        .select(`
          *,
          residents:resident_id (
            id,
            first_name,
            last_name,
            room_number
          )
        `)
        .eq("audit_id", auditId)
        .order("created_at", { ascending: true });

      if (entriesError) {
        console.error("Error fetching entries:", entriesError);
        return NextResponse.json({ error: entriesError.message }, { status: 500 });
      }

      return NextResponse.json({ audit, entries: entries || [] }, { status: 200 });
    }

    // Otherwise, get the most recent in-progress audit for this team
    const { data: existingAudit } = await supabase
      .from("manager_audits")
      .select("*")
      .eq("audit_type_id", "19")
      .eq("organization_id", profile.organization_id)
      .eq("team_id", profile.active_team_id)
      .eq("status", "in-progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existingAudit) {
      // Fetch entries for existing audit
      const { data: entries } = await supabase
        .from("modified_diet_audit_entries")
        .select(`
          *,
          residents:resident_id (
            id,
            first_name,
            last_name,
            room_number
          )
        `)
        .eq("audit_id", existingAudit.id)
        .order("created_at", { ascending: true });

      return NextResponse.json({ audit: existingAudit, entries: entries || [] }, { status: 200 });
    }

    // Create new audit if none exists
    const { data: newAudit, error: createError } = await supabase
      .from("manager_audits")
      .insert({
        audit_type_id: "19",
        audit_type_name: "Modified Diet Audit",
        organization_id: profile.organization_id,
        care_home_id: profile.active_care_home_id,
        team_id: profile.active_team_id,
        auditor_id: user.id,
        auditor_name: profile.name || user.email || "Unknown",
        status: "in-progress",
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating audit:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ audit: newAudit, entries: [] }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Add or update resident entry in audit
export async function POST(request: NextRequest) {
  try {
    const { supabase } = createSupabaseClient(request);

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check permissions
    if (!["manager", "admin", "owner"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const {
      auditId,
      residentId,
      saltAssessmentDate,
      saltReportAvailable,
      recommendationsConsistent,
      carePlanReflectsSalt,
      kitchenHasRecommendations,
      marsKardexConsistent,
      comments,
    } = body;

    // Validate required fields
    if (!auditId || !residentId) {
      return NextResponse.json(
        { error: "Missing required fields: auditId and residentId" },
        { status: 400 }
      );
    }

    // Verify audit exists and belongs to user's organization
    const { data: audit, error: auditError } = await supabase
      .from("manager_audits")
      .select("id, organization_id")
      .eq("id", auditId)
      .eq("organization_id", profile.organization_id)
      .single();

    if (auditError || !audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    // Verify resident exists and belongs to organization
    const { data: resident, error: residentError } = await supabase
      .from("residents")
      .select("id")
      .eq("id", residentId)
      .eq("organization_id", profile.organization_id)
      .single();

    if (residentError || !resident) {
      return NextResponse.json({ error: "Resident not found" }, { status: 404 });
    }

    // Check if entry already exists
    const { data: existingEntry } = await supabase
      .from("modified_diet_audit_entries")
      .select("id")
      .eq("audit_id", auditId)
      .eq("resident_id", residentId)
      .single();

    if (existingEntry) {
      // Update existing entry
      const { data: updatedEntry, error: updateError } = await supabase
        .from("modified_diet_audit_entries")
        .update({
          salt_assessment_date: saltAssessmentDate || null,
          salt_report_available: saltReportAvailable || null,
          recommendations_consistent: recommendationsConsistent || null,
          care_plan_reflects_salt: carePlanReflectsSalt || null,
          kitchen_has_recommendations: kitchenHasRecommendations || null,
          mars_kardex_consistent: marsKardexConsistent || null,
          comments: comments || null,
        })
        .eq("id", existingEntry.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating entry:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ entry: updatedEntry }, { status: 200 });
    }

    // Create new entry
    const { data: newEntry, error: createError } = await supabase
      .from("modified_diet_audit_entries")
      .insert({
        audit_id: auditId,
        resident_id: residentId,
        organization_id: profile.organization_id,
        salt_assessment_date: saltAssessmentDate || null,
        salt_report_available: saltReportAvailable || null,
        recommendations_consistent: recommendationsConsistent || null,
        care_plan_reflects_salt: carePlanReflectsSalt || null,
        kitchen_has_recommendations: kitchenHasRecommendations || null,
        mars_kardex_consistent: marsKardexConsistent || null,
        comments: comments || null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating entry:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ entry: newEntry }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove resident entry from audit
export async function DELETE(request: NextRequest) {
  try {
    const { supabase } = createSupabaseClient(request);

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.organization_id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check permissions
    if (!["manager", "admin", "owner"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("entryId");

    if (!entryId) {
      return NextResponse.json({ error: "Missing entryId" }, { status: 400 });
    }

    // Delete entry (RLS will ensure it belongs to user's organization)
    const { error: deleteError } = await supabase
      .from("modified_diet_audit_entries")
      .delete()
      .eq("id", entryId)
      .eq("organization_id", profile.organization_id);

    if (deleteError) {
      console.error("Error deleting entry:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
