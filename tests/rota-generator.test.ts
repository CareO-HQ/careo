import assert from "assert";
import { generateWeeklyRota } from "../lib/rota-generator";

// Helper to create mocked Supabase Client
function createMockSupabase(mockData: {
  templates?: any[];
  requirements?: any[];
  teamStaff?: any[];
  users?: any[];
  leaves?: any[];
  prevShifts?: any[];
}) {
  return {
    from: (tableName: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        gte: () => chain,
        lte: () => chain,
        then: (onfulfilled: any) => {
          let resultData: any = [];
          if (tableName === "shift_templates") {
            resultData = mockData.templates || [];
          } else if (tableName === "shift_staffing_requirements") {
            resultData = mockData.requirements || [];
          } else if (tableName === "team_staff") {
            resultData = mockData.teamStaff || [];
          } else if (tableName === "users") {
            resultData = mockData.users || [];
          } else if (tableName === "leave_requests") {
            resultData = mockData.leaves || [];
          } else if (tableName === "rota_shifts") {
            resultData = mockData.prevShifts || [];
          }
          return Promise.resolve({ data: resultData, error: null }).then(onfulfilled);
        }
      };
      return chain;
    }
  } as any;
}

async function runTests() {
  console.log("🧪 Running Rota Auto-Scheduler Logic Tests...\n");

  // -------------------------------------------------------------
  // Test Case 1: Exclude temporary and agency staff, assign only permanent staff
  // -------------------------------------------------------------
  {
    console.log("👉 Test 1: Exclude temporary and agency staff...");
    
    const templates = [
      { id: "t1", name: "Day Shift", start_time: "08:00:00", end_time: "16:00:00", hours: 8 }
    ];
    const requirements = [
      { shift_template_id: "t1", nurses_required: 1, care_assistants_required: 0 }
    ];
    const teamStaff = [
      { user_id: "user-perm-nurse" },
      { user_id: "user-agency-nurse" }
    ];
    const users = [
      { id: "user-perm-nurse", name: "Permanent Nurse", role: "nurse", contracted_weekly_hours: 40, is_onboarding_complete: true },
      { id: "user-agency-nurse", name: "Agency Nurse", role: "agency_nurse", contracted_weekly_hours: 40, is_onboarding_complete: true }
    ];

    const supabaseMock = createMockSupabase({ templates, requirements, teamStaff, users });
    
    const result = await generateWeeklyRota(supabaseMock, {
      teamId: "team-1",
      startDate: "2026-06-29", // Monday
      endDate: "2026-07-05"    // Sunday
    });

    // Check that only "user-perm-nurse" is assigned
    const assignments = result.filter(r => r.assignedTo);
    assert.strictEqual(assignments.length, 5, "Should assign 5 shifts (40 hours) to meet contract exactly");
    assignments.forEach(shift => {
      assert.strictEqual(shift.assignedTo, "user-perm-nurse", "Only permanent nurse must be assigned");
      assert.notStrictEqual(shift.assignedTo, "user-agency-nurse", "Agency nurse must never be assigned");
    });

    console.log("✅ Test 1 Passed!");
  }

  // -------------------------------------------------------------
  // Test Case 2: Contracted hours overflow limit (go over by 1 shift just once)
  // -------------------------------------------------------------
  {
    console.log("\n👉 Test 2: Contracted hours overflow limit (go over by at most 1 shift)...");

    const templates = [
      { id: "t1", name: "Long Shift", start_time: "08:00:00", end_time: "20:00:00", hours: 12 }
    ];
    const requirements = [
      { shift_template_id: "t1", nurses_required: 1, care_assistants_required: 0 }
    ];
    const teamStaff = [
      { user_id: "user-nurse" }
    ];
    const users = [
      { id: "user-nurse", name: "Permanent Nurse", role: "nurse", contracted_weekly_hours: 40, is_onboarding_complete: true }
    ];

    const supabaseMock = createMockSupabase({ templates, requirements, teamStaff, users });

    const result = await generateWeeklyRota(supabaseMock, {
      teamId: "team-1",
      startDate: "2026-06-29",
      endDate: "2026-07-05"
    });

    // User is contracted for 40 hours.
    // Daily shifts are 12 hours.
    // Days: Monday (12h), Tuesday (24h), Wednesday (36h), Thursday (48h).
    // After Thursday, hours are 48 >= 40, so they must be blocked for Friday, Saturday, Sunday.
    // Total shifts assigned must be exactly 4 (48 hours).
    const assignedShifts = result.filter(r => r.assignedTo === "user-nurse");
    assert.strictEqual(assignedShifts.length, 4, "Should be assigned exactly 4 shifts (48 hours)");
    
    const unassignedShifts = result.filter(r => !r.assignedTo);
    assert.strictEqual(unassignedShifts.length, 3, "Friday, Saturday, Sunday shifts must remain unassigned");

    console.log("✅ Test 2 Passed!");
  }

  // -------------------------------------------------------------
  // Test Case 3: Back-to-back contiguous shifts (no 11-hour rest violation block)
  // -------------------------------------------------------------
  {
    console.log("\n👉 Test 3: Back-to-back shifts (contiguous non-overlapping)...");

    const templates = [
      { id: "t-day", name: "Day Shift", start_time: "08:00:00", end_time: "16:00:00", hours: 8 },
      { id: "t-night", name: "Night Shift", start_time: "16:00:00", end_time: "24:00:00", hours: 8 }
    ];
    // Requirement: 1 day shift and 1 night shift per day
    const requirements = [
      { shift_template_id: "t-day", nurses_required: 1, care_assistants_required: 0 },
      { shift_template_id: "t-night", nurses_required: 1, care_assistants_required: 0 }
    ];
    const teamStaff = [
      { user_id: "user-nurse" }
    ];
    const users = [
      { id: "user-nurse", name: "Nurse", role: "nurse", contracted_weekly_hours: 40, is_onboarding_complete: true }
    ];

    const supabaseMock = createMockSupabase({ templates, requirements, teamStaff, users });

    const result = await generateWeeklyRota(supabaseMock, {
      teamId: "team-1",
      startDate: "2026-06-29",
      endDate: "2026-07-05"
    });

    // With 40 contracted hours, the nurse can take up to 5 shifts of 8 hours.
    // On Monday, there are 2 shifts: Day (8h) and Night (8h). They are back-to-back (ends at 16:00, starts at 16:00).
    // The scheduler should allow assigning both shifts on Monday to the same nurse.
    // If the 11-hour rest check was active, the night shift would be blocked.
    // Let's verify both are assigned to user-nurse on the first day.
    const mondayShifts = result.filter(r => r.date === "2026-06-29" && r.assignedTo === "user-nurse");
    assert.strictEqual(mondayShifts.length, 2, "Should assign both day and night shifts on Monday to the nurse");

    console.log("✅ Test 3 Passed!");
  }

  // -------------------------------------------------------------
  // Test Case 4: Preventing overlapping (simultaneous) shifts
  // -------------------------------------------------------------
  {
    console.log("\n👉 Test 4: Prevent simultaneous double booking...");

    const templates = [
      { id: "t1", name: "Day Shift A", start_time: "08:00:00", end_time: "16:00:00", hours: 8 },
      { id: "t2", name: "Day Shift B", start_time: "08:00:00", end_time: "16:00:00", hours: 8 }
    ];
    // Two templates running at the exact same time
    const requirements = [
      { shift_template_id: "t1", nurses_required: 1, care_assistants_required: 0 },
      { shift_template_id: "t2", nurses_required: 1, care_assistants_required: 0 }
    ];
    const teamStaff = [
      { user_id: "user-nurse" }
    ];
    const users = [
      { id: "user-nurse", name: "Nurse", role: "nurse", contracted_weekly_hours: 40, is_onboarding_complete: true }
    ];

    const supabaseMock = createMockSupabase({ templates, requirements, teamStaff, users });

    const result = await generateWeeklyRota(supabaseMock, {
      teamId: "team-1",
      startDate: "2026-06-29",
      endDate: "2026-07-05"
    });

    // Verify that on Monday (or any day), the nurse is never assigned to both Shift A and Shift B simultaneously.
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dateStr = new Date(new Date("2026-06-29").getTime() + dayOffset * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dayAssignments = result.filter(r => r.date === dateStr && r.assignedTo === "user-nurse");
      assert(dayAssignments.length <= 1, `Nurse should not be assigned to overlapping shifts on ${dateStr}`);
    }

    console.log("✅ Test 4 Passed!");
  }

  // -------------------------------------------------------------
  // Test Case 5: Assign shifts according to staff preferences
  // -------------------------------------------------------------
  {
    console.log("\n👉 Test 5: Assign shifts according to preferences...");

    const templates = [
      { id: "t-day", name: "Day Shift", start_time: "08:00:00", end_time: "16:00:00", hours: 8 },
      { id: "t-night", name: "Night Shift", start_time: "16:00:00", end_time: "24:00:00", hours: 8 },
      { id: "t-evening", name: "Evening Shift", start_time: "12:00:00", end_time: "20:00:00", hours: 8 }
    ];
    // 1 Day Shift, 1 Night Shift, and 1 Evening Shift per day
    const requirements = [
      { shift_template_id: "t-day", nurses_required: 1, care_assistants_required: 0 },
      { shift_template_id: "t-night", nurses_required: 1, care_assistants_required: 0 },
      { shift_template_id: "t-evening", nurses_required: 1, care_assistants_required: 0 }
    ];
    const teamStaff = [
      { user_id: "user-nurse-a" },
      { user_id: "user-nurse-b" }
    ];
    const users = [
      { id: "user-nurse-a", name: "Nurse A", role: "nurse", contracted_weekly_hours: 40, preferred_shift_id: "t-day", is_onboarding_complete: true },
      { id: "user-nurse-b", name: "Nurse B", role: "nurse", contracted_weekly_hours: 40, preferred_shift_id: "t-night", is_onboarding_complete: true }
    ];

    const supabaseMock = createMockSupabase({ templates, requirements, teamStaff, users });

    const result = await generateWeeklyRota(supabaseMock, {
      teamId: "team-1",
      startDate: "2026-06-29",
      endDate: "2026-07-05"
    });

    // Nurse A is assigned to Day shifts (t-day), Nurse B to Night shifts (t-night).
    // Verify that Day shifts are only assigned to Nurse A, and Night shifts only to Nurse B.
    const dayAssignments = result.filter(r => r.template.id === "t-day");
    const nightAssignments = result.filter(r => r.template.id === "t-night");
    const eveningAssignments = result.filter(r => r.template.id === "t-evening");

    // 5 day shifts and 5 night shifts should be allocated (to meet 40 hours limit per nurse).
    assert.strictEqual(dayAssignments.filter(r => r.assignedTo === "user-nurse-a").length, 5, "Nurse A should get 5 Day shifts");
    assert.strictEqual(dayAssignments.filter(r => r.assignedTo === "user-nurse-b").length, 0, "Nurse B should get 0 Day shifts");

    assert.strictEqual(nightAssignments.filter(r => r.assignedTo === "user-nurse-b").length, 5, "Nurse B should get 5 Night shifts");
    assert.strictEqual(nightAssignments.filter(r => r.assignedTo === "user-nurse-a").length, 0, "Nurse A should get 0 Night shifts");

    // Evening shifts must remain completely unassigned since both nurses have other strict preferences
    assert.strictEqual(eveningAssignments.filter(r => r.assignedTo !== null).length, 0, "Evening shifts must remain unassigned");

    console.log("✅ Test 5 Passed!");
  }

  console.log("\n✨ All tests completed successfully! 🎉");
}

runTests().catch(err => {
  console.error("\n❌ Test Suite Failed:");
  console.error(err);
  process.exit(1);
});
