import { SupabaseClient } from "@supabase/supabase-js";
import { addDays, differenceInHours, format, parseISO, startOfDay } from "date-fns";

export interface GenerationConfig {
  teamId: string;
  startDate: string; // "YYYY-MM-DD" Monday of the week
  endDate: string;   // "YYYY-MM-DD" Sunday of the week
}

export async function generateWeeklyRota(supabase: SupabaseClient, config: GenerationConfig) {
  const { teamId, startDate, endDate } = config;

  // 1. Fetch Shift Templates and Staffing Requirements for the Unit
  const { data: templates, error: templatesError } = await supabase
    .from("shift_templates")
    .select("*")
    .eq("team_id", teamId);

  if (templatesError) throw templatesError;

  const { data: staffingRequirements, error: reqsError } = await supabase
    .from("shift_staffing_requirements")
    .select("*")
    .eq("team_id", teamId);

  if (reqsError) throw reqsError;

  // 2. Fetch Active Staff Assigned to the Unit (Team) via team_staff
  const { data: tsRows, error: tsError } = await supabase
    .from("team_staff")
    .select("user_id")
    .eq("team_id", teamId);

  if (tsError) throw tsError;

  // 2.5 Fetch Temporary Staff assigned to the Unit (Team)
  const { data: tempStaff, error: tempError } = await supabase
    .from("temporary_staff")
    .select("*")
    .eq("team_id", teamId);

  if (tempError) throw tempError;

  const staffIds = tsRows?.map(r => r.user_id) || [];
  let staffList: any[] = [];

  if (staffIds.length > 0) {
    const { data, error: staffError } = await supabase
      .from("users")
      .select("*")
      .in("id", staffIds)
      .eq("is_onboarding_complete", true);

    if (staffError) throw staffError;
    staffList = data || [];
  }

  // Merge temporary staff into scheduling candidates list
  if (tempStaff && tempStaff.length > 0) {
    tempStaff.forEach(ts => {
      staffList.push({
        id: `temp:${ts.name}`,
        name: ts.name,
        role: ts.role,
        contracted_weekly_hours: Number(ts.contracted_weekly_hours || 0),
        is_temporary: true,
        overtime_permitted: true,
        max_weekly_hours: 48,
        availability_rules: [],
        preferred_working_days: []
      });
    });
  }

  if (!staffList || staffList.length === 0) {
    throw new Error("No active staff members assigned to this unit/team.");
  }

  // 3. Fetch approved leaves and absences in range
  const { data: leaves } = await supabase
    .from("leave_requests")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "approved")
    .gte("end_date", startDate)
    .lte("start_date", endDate);

  // 4. Fetch previous week's rota patterns for continuity (Rule 7)
  const prevMonday = format(addDays(parseISO(startDate), -7), "yyyy-MM-dd");
  const { data: prevShifts } = await supabase
    .from("rota_shifts")
    .select("*, rotas(start_date)")
    .eq("rotas.team_id", teamId)
    .eq("rotas.start_date", prevMonday);

  // 5. Build weekly slot requirements
  const slotsToFill: any[] = [];
  let currentDate = parseISO(startDate);
  
  for (let i = 0; i < 7; i++) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    
    for (const req of (staffingRequirements || [])) {
      const template = templates?.find(t => t.id === req.shift_template_id);
      if (!template) continue;

      // Add Nurse slots (RN)
      for (let n = 0; n < req.nurses_required; n++) {
        slotsToFill.push({ date: dateStr, role: "nurse", template, assignedTo: null });
      }
      // Add Care Assistant slots (CA/SCA)
      for (let c = 0; c < req.care_assistants_required; c++) {
        slotsToFill.push({ date: dateStr, role: "care_assistant", template, assignedTo: null });
      }
    }
    currentDate = addDays(currentDate, 1);
  }

  // 6. Track weekly hours allocated per staff member
  const staffHoursMap = new Map<string, number>();
  staffList.forEach(s => staffHoursMap.set(s.id, 0));

  // 7. Core Allocation Loop (Iterating over slotsToFill using the 10 priority rules)
  for (const slot of slotsToFill) {
    // Filter candidates based on slot role (nurse vs care_assistant)
    let candidates = staffList.filter(s => s.role === slot.role);

    // Rule 1 & 2: Exclude staff on approved annual leave or sick leave on this date
    candidates = candidates.filter(c => {
      const hasLeave = leaves?.some(l => 
        l.user_id === c.id && 
        slot.date >= l.start_date && 
        slot.date <= l.end_date
      );
      return !hasLeave;
    });

    // Rule 3: Availability Rules filter
    candidates = candidates.filter(c => {
      return checkAvailabilityRule(c.availability_rules, slot.date, slot.template.start_time);
    });

    // Filter out blocked candidates (score <= -1000)
    const eligibleCandidates = candidates.filter(c => {
      const score = evaluateCandidateScore({
        candidate: c,
        slot,
        currentHours: staffHoursMap.get(c.id) || 0,
        prevShifts,
        slotsToFill
      });
      return score > -1000;
    });

    if (eligibleCandidates.length > 0) {
      // Sort eligible candidates so that least worked hours get assigned first
      eligibleCandidates.sort((a, b) => {
        const aHours = staffHoursMap.get(a.id) || 0;
        const bHours = staffHoursMap.get(b.id) || 0;

        const aTarget = Number(a.contracted_weekly_hours || 0);
        const bTarget = Number(b.contracted_weekly_hours || 0);

        const aUnder = aHours < aTarget;
        const bUnder = bHours < bTarget;

        // 1. Under contracted hours prioritized over over contracted hours
        if (aUnder && !bUnder) return -1;
        if (!aUnder && bUnder) return 1;

        // 2. Least worked hours prioritized
        if (aHours !== bHours) {
          return aHours - bHours;
        }

        // 3. Base score as tie breaker (higher score first)
        const aScore = evaluateCandidateScore({
          candidate: a,
          slot,
          currentHours: aHours,
          prevShifts,
          slotsToFill
        });
        const bScore = evaluateCandidateScore({
          candidate: b,
          slot,
          currentHours: bHours,
          prevShifts,
          slotsToFill
        });

        return bScore - aScore;
      });

      const bestCandidate = eligibleCandidates[0];
      slot.assignedTo = bestCandidate.id;
      const hours = Number(slot.template.hours);
      staffHoursMap.set(bestCandidate.id, (staffHoursMap.get(bestCandidate.id) || 0) + hours);
    }
  }

  return slotsToFill;
}

function checkAvailabilityRule(rules: any, dateStr: string, startTime: string): boolean {
  // Parsing weekly availability json
  if (!rules || !Array.isArray(rules) || rules.length === 0) return true; // Default available
  
  const weekdayName = format(parseISO(dateStr), "EEEE").toLowerCase(); // 'monday'
  const rule = rules.find((r: any) => r.day?.toLowerCase() === weekdayName);
  
  if (rule) {
    // If explicitly marked unavailable
    if (rule.unavailable) return false;
  }
  return true; 
}

function evaluateCandidateScore(params: any): number {
  const { candidate, slot, currentHours, prevShifts, slotsToFill } = params;
  let score = 0;

  // Rule 10: Double booking & Rest rule check (Absolute blockers)
  const hasRestViolation = checkRestPeriodViolation(candidate.id, slot, slotsToFill);
  if (hasRestViolation) return -9999;

  // Rule 5: Contracted hours scoring
  const target = Number(candidate.contracted_weekly_hours || 0);
  if (currentHours < target) {
    score += 100; // High priority to get staff to their contracted hours
  } else {
    // Over contracted hours - check overtime permission
    if (!candidate.overtime_permitted) return -9999; // Blocker
    const maxHours = Number(candidate.max_weekly_hours || 48);
    if (currentHours + Number(slot.template.hours) > maxHours) return -9999; // Exceeds cap
    score -= 50; // Deprioritize overtime assignment
  }

  // Rule 7: Continuity
  const workedLastWeek = prevShifts?.some((ps: any) => ps.user_id === candidate.id && ps.shift_template_id === slot.template.id);
  if (workedLastWeek) score += 20;

  // Rule 8: Preferred Working Days
  const weekdayName = format(parseISO(slot.date), "EEEE"); // 'Monday'
  if (candidate.preferred_working_days?.includes(weekdayName)) score += 10;

  // Rule 9: Consecutive Shift Limits (Max 6 consecutive days)
  const hasConsecutiveViolation = checkConsecutiveShiftLimit(candidate.id, slot.date, slotsToFill);
  if (hasConsecutiveViolation) return -9999;

  return score;
}

function checkRestPeriodViolation(userId: string, targetSlot: any, currentAssignments: any[]): boolean {
  // Ensure at least 11 hours between target slot start/end and any other shift assigned to this user in current weekly schedule
  const assignedShifts = currentAssignments.filter(s => s.assignedTo === userId);
  
  const targetStart = new Date(`${targetSlot.date}T${targetSlot.template.start_time}`);
  let targetEnd = new Date(`${targetSlot.date}T${targetSlot.template.end_time}`);
  if (targetEnd < targetStart) {
    targetEnd = new Date(targetEnd.getTime() + 24 * 60 * 60 * 1000); // crossover
  }

  for (const shift of assignedShifts) {
    const shiftStart = new Date(`${shift.date}T${shift.template.start_time}`);
    let shiftEnd = new Date(`${shift.date}T${shift.template.end_time}`);
    if (shiftEnd < shiftStart) {
      shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    // Overlap
    if (targetStart < shiftEnd && shiftStart < targetEnd) return true;

    // Check rest hour distance (11 hours)
    if (shiftEnd <= targetStart) {
      const diffHrs = (targetStart.getTime() - shiftEnd.getTime()) / (1000 * 60 * 60);
      if (diffHrs < 11) return true;
    }
    if (targetEnd <= shiftStart) {
      const diffHrs = (shiftStart.getTime() - targetEnd.getTime()) / (1000 * 60 * 60);
      if (diffHrs < 11) return true;
    }
  }

  return false;
}

function checkConsecutiveShiftLimit(userId: string, dateStr: string, currentAssignments: any[]): boolean {
  // Max 6 consecutive work days limit check
  const assignedDates = new Set(
    currentAssignments
      .filter(s => s.assignedTo === userId)
      .map(s => s.date)
  );
  assignedDates.add(dateStr); // temporary add

  const sortedDates = Array.from(assignedDates).sort();
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  let prevTime = 0;

  for (const date of sortedDates) {
    const time = new Date(date).getTime();
    if (prevTime === 0) {
      currentConsecutive = 1;
    } else {
      const diffDays = (time - prevTime) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        currentConsecutive++;
      } else if (diffDays > 1) {
        currentConsecutive = 1;
      }
    }
    prevTime = time;
    if (currentConsecutive > maxConsecutive) {
      maxConsecutive = currentConsecutive;
    }
  }

  return maxConsecutive > 6;
}
