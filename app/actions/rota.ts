"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// 1. Helper to initialize Supabase client bypassing RLS for server-side actions
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

// 2. Audit Trail Logger
export async function logRotaAudit(action: {
  actorId: string;
  actionType: string;
  teamId: string;
  details?: any;
}) {
  try {
    const supabase = getSupabaseClient();
    
    // Fetch actor details
    const { data: userDetails } = await supabase
      .from("users")
      .select("name, role")
      .eq("id", action.actorId)
      .single();

    await supabase.from("rota_audit_logs").insert({
      actor_id: action.actorId,
      actor_name: userDetails?.name || "Unknown Staff",
      actor_role: userDetails?.role || "care_assistant",
      action_type: action.actionType,
      team_id: action.teamId,
      details: action.details || {}
    });
  } catch (error) {
    console.error("Error writing rota audit log:", error);
  }
}

// 3. Update Staff Workforce details (Elevated role flag & Contracted Hours)
export async function updateStaffWorkforceAction(
  actorId: string,
  staffId: string,
  updates: {
    is_manager_approved_nurse?: boolean;
    contracted_weekly_hours?: number;
  }
) {
  try {
    const supabase = getSupabaseClient();

    // Verify actor role
    const { data: actor } = await supabase
      .from("users")
      .select("role, active_team_id")
      .eq("id", actorId)
      .single();

    if (actor?.role !== "manager" && actor?.role !== "owner" && actor?.role !== "saas_admin") {
      throw new Error("Only Managers can edit staff authorization and contracted hours.");
    }

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", staffId);

    if (error) throw error;

    // Log the audit
    if (updates.is_manager_approved_nurse !== undefined) {
      await logRotaAudit({
        actorId,
        actionType: updates.is_manager_approved_nurse ? "manager_approved_nurse_granted" : "manager_approved_nurse_revoked",
        teamId: actor.active_team_id || "",
        details: { target_staff_id: staffId }
      });
    }

    revalidatePath("/dashboard/staff");
    revalidatePath(`/dashboard/staff/${staffId}/overview`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. Shift Templates CRUD
export async function createShiftTemplateAction(actorId: string, teamId: string, data: {
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  hours: number;
  notes?: string;
}) {
  try {
    const supabase = getSupabaseClient();
    const { data: newTemplate, error } = await supabase
      .from("shift_templates")
      .insert({
        team_id: teamId,
        name: data.name,
        start_time: data.start_time,
        end_time: data.end_time,
        break_minutes: data.break_minutes,
        hours: data.hours,
        notes: data.notes,
        created_by: actorId
      })
      .select()
      .single();

    if (error) throw error;

    await logRotaAudit({
      actorId,
      actionType: "shift_template_created",
      teamId,
      details: { template_id: newTemplate.id, name: data.name }
    });

    revalidatePath("/dashboard/rota");
    return { success: true, data: newTemplate };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateShiftTemplateAction(actorId: string, templateId: string, data: {
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  hours: number;
  notes?: string;
}) {
  try {
    const supabase = getSupabaseClient();
    const { data: template } = await supabase
      .from("shift_templates")
      .select("team_id")
      .eq("id", templateId)
      .single();

    const { error } = await supabase
      .from("shift_templates")
      .update({
        name: data.name,
        start_time: data.start_time,
        end_time: data.end_time,
        break_minutes: data.break_minutes,
        hours: data.hours,
        notes: data.notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", templateId);

    if (error) throw error;

    if (template) {
      await logRotaAudit({
        actorId,
        actionType: "shift_template_edited",
        teamId: template.team_id,
        details: { template_id: templateId, name: data.name }
      });
    }

    revalidatePath("/dashboard/rota");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteShiftTemplateAction(actorId: string, templateId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: template } = await supabase
      .from("shift_templates")
      .select("team_id, name")
      .eq("id", templateId)
      .single();

    const { error } = await supabase
      .from("shift_templates")
      .delete()
      .eq("id", templateId);

    if (error) throw error;

    if (template) {
      await logRotaAudit({
        actorId,
        actionType: "shift_template_deleted",
        teamId: template.team_id,
        details: { template_id: templateId, name: template.name }
      });
    }

    revalidatePath("/dashboard/rota");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 5. Staffing Requirements CRUD
export async function configureStaffingRequirementsAction(
  actorId: string,
  teamId: string,
  requirements: Array<{
    shift_template_id: string;
    nurses_required: number;
    care_assistants_required: number;
  }>
) {
  try {
    const supabase = getSupabaseClient();

    // Clear existing rules and insert new ones
    const { error: deleteError } = await supabase
      .from("shift_staffing_requirements")
      .delete()
      .eq("team_id", teamId);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from("shift_staffing_requirements")
      .insert(
        requirements.map(req => ({
          team_id: teamId,
          shift_template_id: req.shift_template_id,
          nurses_required: req.nurses_required,
          care_assistants_required: req.care_assistants_required
        }))
      );

    if (insertError) throw insertError;

    await logRotaAudit({
      actorId,
      actionType: "staffing_rule_changed",
      teamId,
      details: { requirements }
    });

    revalidatePath("/dashboard/rota");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 6. Rota CRUD & Assigning Shifts
export async function createRotaAction(actorId: string, teamId: string, startDate: string, endDate: string) {
  try {
    const supabase = getSupabaseClient();
    
    // Check if rota already exists
    const { data: existing } = await supabase
      .from("rotas")
      .select("id")
      .eq("team_id", teamId)
      .eq("start_date", startDate)
      .maybeSingle();

    if (existing) {
      return { success: true, rotaId: existing.id };
    }

    const { data: newRota, error } = await supabase
      .from("rotas")
      .insert({
        team_id: teamId,
        start_date: startDate,
        end_date: endDate,
        status: "draft",
        created_by: actorId
      })
      .select()
      .single();

    if (error) throw error;

    await logRotaAudit({
      actorId,
      actionType: "rota_created",
      teamId,
      details: { rota_id: newRota.id, start_date: startDate }
    });

    revalidatePath("/dashboard/rota");
    return { success: true, rotaId: newRota.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addManualShiftAction(actorId: string, shiftData: {
  rotaId: string;
  userId: string | null;
  shiftTemplateId: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  hours: number;
  notes?: string;
}) {
  try {
    const supabase = getSupabaseClient();

    // Fetch rota info to get team_id
    const { data: rota } = await supabase
      .from("rotas")
      .select("team_id, start_date")
      .eq("id", shiftData.rotaId)
      .single();

    if (!rota) throw new Error("Rota not found");

    if (shiftData.userId) {
      // Validation 1: Prevent overlapping shifts on the same day for this user
      const { data: overlaps } = await supabase
        .from("rota_shifts")
        .select("id, date, start_time, end_time")
        .eq("rota_id", shiftData.rotaId)
        .eq("user_id", shiftData.userId)
        .eq("date", shiftData.date);

      if (overlaps && overlaps.length > 0) {
        // Simple time-overlap check
        const isOverlapping = overlaps.some(existing => {
          const s1 = existing.start_time;
          const e1 = existing.end_time;
          const s2 = shiftData.start_time;
          const e2 = shiftData.end_time;
          // overlaps if s1 < e2 and s2 < e1
          return s1 < e2 && s2 < e1;
        });

        if (isOverlapping) {
          return { success: false, error: "Overlap Conflict: This staff member is already assigned to a shift during this time on this day." };
        }
      }

      // Validation 2: Annual/Sick Leave Conflicts check
      const { data: leaveConflicts } = await supabase
        .from("leave_requests")
        .select("id, type")
        .eq("user_id", shiftData.userId)
        .eq("status", "approved")
        .lte("start_date", shiftData.date)
        .gte("end_date", shiftData.date);

      if (leaveConflicts && leaveConflicts.length > 0) {
        return { success: false, error: `Leave Conflict: This staff member is on approved ${leaveConflicts[0].type.replace("_", " ")} on this date.` };
      }
    }

    // Insert shift
    const { data: newShift, error } = await supabase
      .from("rota_shifts")
      .insert({
        rota_id: shiftData.rotaId,
        user_id: shiftData.userId,
        shift_template_id: shiftData.shiftTemplateId,
        date: shiftData.date,
        start_time: shiftData.start_time,
        end_time: shiftData.end_time,
        break_minutes: shiftData.break_minutes,
        hours: shiftData.hours,
        notes: shiftData.notes
      })
      .select()
      .single();

    if (error) throw error;

    await logRotaAudit({
      actorId,
      actionType: "shift_added",
      teamId: rota.team_id,
      details: { shift_id: newShift.id, date: shiftData.date, user_id: shiftData.userId }
    });

    revalidatePath("/dashboard/rota");
    return { success: true, data: newShift };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteManualShiftAction(actorId: string, shiftId: string) {
  try {
    const supabase = getSupabaseClient();

    // Fetch shift to audit
    const { data: shift } = await supabase
      .from("rota_shifts")
      .select("*, rotas(team_id)")
      .eq("id", shiftId)
      .single();

    const { error } = await supabase
      .from("rota_shifts")
      .delete()
      .eq("id", shiftId);

    if (error) throw error;

    if (shift) {
      await logRotaAudit({
        actorId,
        actionType: "shift_removed",
        teamId: (shift.rotas as any).team_id,
        details: { shift_id: shiftId, date: shift.date, user_id: shift.user_id }
      });
    }

    revalidatePath("/dashboard/rota");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function publishRotaAction(actorId: string, rotaId: string) {
  try {
    const supabase = getSupabaseClient();

    const { data: rota } = await supabase
      .from("rotas")
      .select("*, rota_shifts(*)")
      .eq("id", rotaId)
      .single();

    if (!rota) throw new Error("Rota not found");

    // Perform Nurse Coverage Gate Validation (US-008 Scenario 4)
    // Fetch staffing requirements for the unit
    const { data: reqs } = await supabase
      .from("shift_staffing_requirements")
      .select("*, shift_templates(name)")
      .eq("team_id", rota.team_id);

    // Fetch shift template IDs and staff roles
    const { data: staffList } = await supabase
      .from("users")
      .select("id, role")
      .eq("active_team_id", rota.team_id);

    const rolesMap = new Map<string, string>();
    staffList?.forEach(s => rolesMap.set(s.id, s.role || "care_assistant"));

    const understaffedShifts: string[] = [];

    // Check each requirement on each day of the week
    for (const req of (reqs || [])) {
      const neededNurses = req.nurses_required;
      // Loop over dates in the rota week
      const currentDate = new Date(rota.start_date);
      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split("T")[0];
        // Filter shifts assigned to this template on this date
        const shifts = rota.rota_shifts.filter(s => s.shift_template_id === req.shift_template_id && s.date === dateStr);
        const assignedNurses = shifts.filter(s => s.user_id && rolesMap.get(s.user_id) === "nurse").length;

        if (assignedNurses < neededNurses) {
          understaffedShifts.push(`${dateStr}: Shift template "${(req.shift_templates as any).name}" needs at least ${neededNurses} Nurse(s) but has ${assignedNurses}.`);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    if (understaffedShifts.length > 0) {
      return {
        success: false,
        validationFailed: true,
        errors: understaffedShifts
      };
    }

    // Validation passes -> publish
    const { error } = await supabase
      .from("rotas")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        published_by: actorId
      })
      .eq("id", rotaId);

    if (error) throw error;

    await logRotaAudit({
      actorId,
      actionType: "rota_published",
      teamId: rota.team_id,
      details: { rota_id: rotaId }
    });

    // Trigger Notification Broadcasts (US-013)
    const affectedStaffIds = Array.from(new Set(rota.rota_shifts.map(s => s.user_id).filter(Boolean)));
    for (const staffId of affectedStaffIds) {
      await supabase.from("notifications").insert({
        organization_id: rota.organization_id || null, // fallback
        care_home_id: rota.care_home_id || null,
        team_id: rota.team_id,
        user_id: staffId,
        type: "rota_published",
        message: `Your rota for the week of ${rota.start_date} has been published. Please review your scheduled shifts.`,
        created_at: new Date().toISOString()
      });
    }

    revalidatePath("/dashboard/rota");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 7. Leave Management Portal (US-011 / US-007)
export async function requestLeaveAction(actorId: string, leaveData: {
  teamId: string;
  startDate: string;
  endDate: string;
  type: "annual_leave" | "sick_leave" | "training";
  notes?: string;
}) {
  try {
    const supabase = getSupabaseClient();

    // Check if duplicate request on same unit/date exists (US-007)
    const { data: existingTeamRequests } = await supabase
      .from("leave_requests")
      .select("id, users(name)")
      .eq("team_id", leaveData.teamId)
      .eq("status", "approved")
      .lte("start_date", leaveData.endDate)
      .gte("end_date", leaveData.startDate);

    let warning: string | null = null;
    if (existingTeamRequests && existingTeamRequests.length > 0) {
      const names = existingTeamRequests.map((r: any) => r.users?.name).join(", ");
      warning = `Warning: Other staff members (${names}) on your unit have already been approved for leave during this period.`;
    }

    // Submit request
    const { data: request, error } = await supabase
      .from("leave_requests")
      .insert({
        user_id: actorId,
        team_id: leaveData.teamId,
        start_date: leaveData.startDate,
        end_date: leaveData.endDate,
        type: leaveData.type,
        notes: leaveData.notes,
        status: "pending"
      })
      .select()
      .single();

    if (error) throw error;

    await logRotaAudit({
      actorId,
      actionType: "leave_requested",
      teamId: leaveData.teamId,
      details: { leave_id: request.id, start_date: leaveData.startDate, end_date: leaveData.endDate }
    });

    revalidatePath("/dashboard/rota");
    return { success: true, warning };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveLeaveAction(actorId: string, leaveId: string, approve: boolean, rejectionReason?: string) {
  try {
    const supabase = getSupabaseClient();

    const { data: request } = await supabase
      .from("leave_requests")
      .select("*, users(annual_leave_balance)")
      .eq("id", leaveId)
      .single();

    if (!request) throw new Error("Leave request not found");

    const status = approve ? "approved" : "rejected";

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status,
        rejection_reason: approve ? null : rejectionReason,
        approved_by: actorId,
        approved_at: new Date().toISOString()
      })
      .eq("id", leaveId);

    if (error) throw error;

    // Deduct from annual leave balance if approved (US-007)
    if (approve && request.type === "annual_leave") {
      const days = Math.round((new Date(request.end_date).getTime() - new Date(request.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const currentBalance = Number((request.users as any).annual_leave_balance || 0);
      const newBalance = Math.max(0, currentBalance - days);

      await supabase
        .from("users")
        .update({ annual_leave_balance: newBalance })
        .eq("id", request.user_id);
    }

    await logRotaAudit({
      actorId,
      actionType: approve ? "leave_approved" : "leave_rejected",
      teamId: request.team_id,
      details: { leave_id: leaveId, target_user_id: request.user_id }
    });

    // Notify user
    await supabase.from("notifications").insert({
      team_id: request.team_id,
      user_id: request.user_id,
      type: "leave_status_update",
      message: `Your request for ${request.type.replace("_", " ")} from ${request.start_date} to ${request.end_date} has been ${status}.${approve ? "" : ` Reason: ${rejectionReason}`}`,
      created_at: new Date().toISOString()
    });

    revalidatePath("/dashboard/rota");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 8. Shift Swaps Portal (US-012)
export async function requestShiftSwapAction(actorId: string, swapData: {
  requestingShiftId: string;
  targetUserId: string | null; // Nullable for open swaps
  targetShiftId: string | null;
}) {
  try {
    const supabase = getSupabaseClient();

    // Fetch requesting shift details to get team ID
    const { data: requestingShift } = await supabase
      .from("rota_shifts")
      .select("*, rotas(team_id)")
      .eq("id", swapData.requestingShiftId)
      .single();

    if (!requestingShift) throw new Error("Requesting shift not found");

    const teamId = (requestingShift.rotas as any).team_id;

    // Submit request
    const { data: swap, error } = await supabase
      .from("shift_swaps")
      .insert({
        requesting_user_id: actorId,
        target_user_id: swapData.targetUserId,
        requesting_shift_id: swapData.requestingShiftId,
        target_shift_id: swapData.targetShiftId,
        status: "pending"
      })
      .select()
      .single();

    if (error) throw error;

    await logRotaAudit({
      actorId,
      actionType: "shift_swapped", // generic audit type
      teamId,
      details: { swap_id: swap.id, requesting_shift_id: swapData.requestingShiftId }
    });

    // Notify colleague (if targeted swap)
    if (swapData.targetUserId) {
      await supabase.from("notifications").insert({
        team_id: teamId,
        user_id: swapData.targetUserId,
        type: "shift_swap_request",
        message: `A colleague has requested a shift swap with you. Please review and respond in your shift swaps portal.`,
        created_at: new Date().toISOString()
      });
    }

    revalidatePath("/dashboard/rota");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveShiftSwapAction(actorId: string, swapId: string, approve: boolean, rejectionReason?: string) {
  try {
    const supabase = getSupabaseClient();

    const { data: swap } = await supabase
      .from("shift_swaps")
      .select(`
        *,
        requesting_shift:requesting_shift_id (*, rotas(team_id)),
        target_shift:target_shift_id (*)
      `)
      .eq("id", swapId)
      .single();

    if (!swap) throw new Error("Shift swap record not found");

    const teamId = (swap.requesting_shift as any).rotas.team_id;

    if (!approve) {
      const { error } = await supabase
        .from("shift_swaps")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          approved_by: actorId,
          approved_at: new Date().toISOString()
        })
        .eq("id", swapId);

      if (error) throw error;

      // Notify requester
      await supabase.from("notifications").insert({
        team_id: teamId,
        user_id: swap.requesting_user_id,
        type: "shift_swap_rejected",
        message: `Your shift swap request has been declined. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
        created_at: new Date().toISOString()
      });

      revalidatePath("/dashboard/rota");
      return { success: true };
    }

    // Validation: Check rest rules (11 hours) & double bookings for BOTH users if we swap
    // Let's validate Requesting User on Target Shift, and Target User on Requesting Shift
    if (swap.target_user_id && swap.target_shift) {
      // 1. Double Booking check for Requesting User on Target Shift Date
      const { data: reqUserOverlaps } = await supabase
        .from("rota_shifts")
        .select("id, start_time, end_time")
        .eq("user_id", swap.requesting_user_id)
        .eq("date", swap.target_shift.date)
        .neq("id", swap.requesting_shift_id); // exclude current shift

      if (reqUserOverlaps && reqUserOverlaps.length > 0) {
        const overlaps = reqUserOverlaps.some(existing => {
          return existing.start_time < swap.target_shift.end_time && swap.target_shift.start_time < existing.end_time;
        });
        if (overlaps) {
          return { success: false, error: "Validation Blocked: Approving this swap would cause a double-booking for the requesting staff member." };
        }
      }

      // 2. Double Booking check for Target User on Requesting Shift Date
      const { data: targetUserOverlaps } = await supabase
        .from("rota_shifts")
        .select("id, start_time, end_time")
        .eq("user_id", swap.target_user_id)
        .eq("date", swap.requesting_shift.date)
        .neq("id", swap.target_shift_id); // exclude target shift

      if (targetUserOverlaps && targetUserOverlaps.length > 0) {
        const overlaps = targetUserOverlaps.some(existing => {
          return existing.start_time < swap.requesting_shift.end_time && swap.requesting_shift.start_time < existing.end_time;
        });
        if (overlaps) {
          return { success: false, error: "Validation Blocked: Approving this swap would cause a double-booking for the target staff member." };
        }
      }

      // 3. Rest rules validation (minimum 11 hours rest between shifts)
      // Check requesting user rest hours relative to target shift
      const hasReqUserRestViolation = await checkHoursRestConflict(supabase, swap.requesting_user_id, swap.target_shift.date, swap.target_shift.start_time, swap.target_shift.end_time, swap.requesting_shift_id);
      if (hasReqUserRestViolation) {
        return { success: false, error: "Validation Blocked: Approving this swap violates the 11-hour rest limit rule for the requesting staff member." };
      }

      // Check target user rest hours relative to requesting shift
      const hasTargetUserRestViolation = await checkHoursRestConflict(supabase, swap.target_user_id, swap.requesting_shift.date, swap.requesting_shift.start_time, swap.requesting_shift.end_time, swap.target_shift_id);
      if (hasTargetUserRestViolation) {
        return { success: false, error: "Validation Blocked: Approving this swap violates the 11-hour rest limit rule for the target staff member." };
      }
    }

    // Apply the swap in database
    // Swap user_id assignments
    if (swap.target_user_id && swap.target_shift) {
      // Swapping two shifts between two users
      const { error: err1 } = await supabase
        .from("rota_shifts")
        .update({ user_id: swap.target_user_id })
        .eq("id", swap.requesting_shift_id);
      
      const { error: err2 } = await supabase
        .from("rota_shifts")
        .update({ user_id: swap.requesting_user_id })
        .eq("id", swap.target_shift_id);

      if (err1 || err2) throw err1 || err2;
    } else {
      // Swapping with open shift (assign user to target_shift, clear requesting_shift)
      // Or simple release
      if (swap.target_shift_id) {
        const { error: err1 } = await supabase
          .from("rota_shifts")
          .update({ user_id: swap.requesting_user_id })
          .eq("id", swap.target_shift_id);
        
        const { error: err2 } = await supabase
          .from("rota_shifts")
          .update({ user_id: null })
          .eq("id", swap.requesting_shift_id);

        if (err1 || err2) throw err1 || err2;
      }
    }

    // Set swap status to approved
    const { error: swapError } = await supabase
      .from("shift_swaps")
      .update({
        status: "approved",
        approved_by: actorId,
        approved_at: new Date().toISOString()
      })
      .eq("id", swapId);

    if (swapError) throw swapError;

    // Send notifications to both users
    await supabase.from("notifications").insert({
      team_id: teamId,
      user_id: swap.requesting_user_id,
      type: "shift_swap_approved",
      message: `Your shift swap request has been approved. Your schedule has been updated.`,
      created_at: new Date().toISOString()
    });

    if (swap.target_user_id) {
      await supabase.from("notifications").insert({
        team_id: teamId,
        user_id: swap.target_user_id,
        type: "shift_swap_approved",
        message: `Your shift swap with a colleague has been approved. Your schedule has been updated.`,
        created_at: new Date().toISOString()
      });
    }

    revalidatePath("/dashboard/rota");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Rest period validator helper
async function checkHoursRestConflict(
  supabase: any,
  userId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeShiftId: string
): Promise<boolean> {
  // Fetch shifts for user within 1 day before/after
  const dateObj = new Date(date);
  const prevDate = new Date(dateObj.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const nextDate = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: neighboringShifts } = await supabase
    .from("rota_shifts")
    .select("id, date, start_time, end_time")
    .eq("user_id", userId)
    .in("date", [prevDate, date, nextDate])
    .neq("id", excludeShiftId);

  if (!neighboringShifts) return false;

  // Target shift absolute datetimes
  const targetStart = new Date(`${date}T${startTime}`);
  let targetEnd = new Date(`${date}T${endTime}`);
  if (targetEnd < targetStart) {
    // Overnight crossover
    targetEnd = new Date(targetEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  for (const shift of neighboringShifts) {
    const shiftStart = new Date(`${shift.date}T${shift.start_time}`);
    let shiftEnd = new Date(`${shift.date}T${shift.end_time}`);
    if (shiftEnd < shiftStart) {
      shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    // If shift is before target shift: check targetStart - shiftEnd
    if (shiftEnd <= targetStart) {
      const diffHrs = (targetStart.getTime() - shiftEnd.getTime()) / (1000 * 60 * 60);
      if (diffHrs < 11) return true;
    }
    // If shift is after target shift: check shiftStart - targetEnd
    if (targetEnd <= shiftStart) {
      const diffHrs = (shiftStart.getTime() - targetEnd.getTime()) / (1000 * 60 * 60);
      if (diffHrs < 11) return true;
    }
  }

  return false;
}
