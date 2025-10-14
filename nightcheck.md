Night Check System - Database Schema Planning Report
Executive Summary
The Night Check system allows nurses to configure resident-specific monitoring items from 6 categories: Night Checks, Positioning, Pad Change, Bed Rails Equipment Check, Environmental Checks, and Night Note. Each resident can have a unique combination of these checks with custom frequencies and configurations.
Current System Analysis
How the Add Night Checks System Works:
Configuration Phase (One-time setup per resident):
Nurses select which check items apply to a specific resident
Each item type may require additional configuration:
Night Check: Frequency (15min, 30min, 1hr, 2hrs)
Positioning: Frequency (15min, 30min, 1hr, 2hrs)
Pad Change: Frequency (2hrs, 3hrs, 4hrs, 5hrs, 6hrs)
Bed Rails Equipment Check: Equipment items (bed rails, oxygen, air bed, call bell, monitor, mobility aids) - NO frequency
Environmental Check: Environmental items (window, curtains, door, temperature) - NO frequency
Night Note: No configuration needed
Custom items can be added to equipment and environmental lists
Recording Phase (Ongoing, multiple times per shift):
Configured items appear as buttons in "Night Check Recording" area
Nurses click buttons to open recording dialogs
Each recording creates a timestamped entry with observations
Schema Design Options
Option 1: Single Unified Schema (RECOMMENDED)
Advantages:
✅ Single source of truth
✅ Easy to query all night check configurations for a resident
✅ Flexible for future check type additions
✅ Simpler foreign key relationships
✅ Easier audit trail
✅ Better for dashboard/reporting queries
Disadvantages:
⚠️ Some fields may be null depending on check type
⚠️ Requires type checking in queries
Schema Design:
// Configuration table - stores WHAT checks a resident needs
nightCheckConfigurations: defineTable({
  residentId: v.id("residents"),
  teamId: v.string(),
  organizationId: v.string(),
  
  checkType: v.union(
    v.literal("night_check"),
    v.literal("positioning"),
    v.literal("pad_change"),
    v.literal("bed_rails"),
    v.literal("environmental"),
    v.literal("night_note")
  ),
  
  // Frequency fields (nullable for types that don't need it)
  frequencyMinutes: v.optional(v.number()), // 15, 30, 60, 120, 180, 240, 300, 360
  
  // Equipment/Environmental items (nullable for types that don't need it)
  selectedItems: v.optional(v.array(v.string())), // ["bed_rails", "oxygen"] or ["window", "door"]
  
  // Metadata
  isActive: v.boolean(), // Can deactivate without deleting
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedBy: v.optional(v.id("users")),
  updatedAt: v.optional(v.number()),
})
  .index("by_resident", ["residentId"])
  .index("by_resident_active", ["residentId", "isActive"])
  .index("by_check_type", ["checkType"])
  .index("by_team", ["teamId"])
  .index("by_organization", ["organizationId"]),

// Recording table - stores ACTUAL recordings made by nurses
nightCheckRecordings: defineTable({
  configurationId: v.id("nightCheckConfigurations"), // Links to config
  residentId: v.id("residents"), // Denormalized for faster queries
  teamId: v.string(),
  organizationId: v.string(),
  
  checkType: v.union(
    v.literal("night_check"),
    v.literal("positioning"),
    v.literal("pad_change"),
    v.literal("bed_rails"),
    v.literal("environmental"),
    v.literal("night_note")
  ),
  
  recordDate: v.string(), // "YYYY-MM-DD"
  recordTime: v.string(), // "HH:mm"
  recordDateTime: v.number(), // Unix timestamp for sorting
  
  // Type-specific data (stored as flexible object)
  checkData: v.any(), // JSON object with check-specific fields
  
  // Common fields
  notes: v.optional(v.string()),
  recordedBy: v.id("users"),
  recordedByName: v.string(),
  
  // Metadata
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_resident", ["residentId"])
  .index("by_resident_date", ["residentId", "recordDate"])
  .index("by_configuration", ["configurationId"])
  .index("by_check_type", ["checkType"])
  .index("by_date_time", ["recordDateTime"])
  .index("by_recorded_by", ["recordedBy"])
  .index("by_team_date", ["teamId", "recordDate"])
  .index("by_organization_date", ["organizationId", "recordDate"]),
Example Data Structure:
// Configuration examples
{
  residentId: "xyz123",
  checkType: "night_check",
  frequencyMinutes: 30,
  selectedItems: null,
  isActive: true
}

{
  residentId: "xyz123",
  checkType: "bed_rails",
  frequencyMinutes: null,
  selectedItems: ["bed_rails", "oxygen", "call_bell"],
  isActive: true
}

// Recording examples
{
  configurationId: "config123",
  residentId: "xyz123",
  checkType: "night_check",
  recordDate: "2025-10-14",
  recordTime: "02:30",
  checkData: {
    position: "left_side",
    breathing: "normal",
    skinCondition: "normal",
    comfortLevel: "comfortable",
    observations: "Sleeping peacefully"
  },
  recordedBy: "nurse456",
  recordedByName: "Sarah Johnson"
}

{
  configurationId: "config124",
  residentId: "xyz123",
  checkType: "bed_rails",
  recordDate: "2025-10-14",
  recordTime: "03:00",
  checkData: {
    equipmentChecked: ["bed_rails", "oxygen"],
    bedRailsSecure: true,
    oxygenWorking: true,
    issues: []
  },
  recordedBy: "nurse456",
  recordedByName: "Sarah Johnson"
}
Option 2: Separate Tables Per Check Type
Advantages:
✅ Type-safe schemas for each check type
✅ No nullable fields
✅ Easier to validate specific check requirements
Disadvantages:
❌ 6 configuration tables + 6 recording tables = 12 tables
❌ Complex queries to get all resident checks
❌ Harder to add new check types
❌ More boilerplate code
❌ Difficult to generate unified reports
NOT RECOMMENDED - Too much duplication and maintenance overhead.
Option 3: Hybrid Approach
Advantages:
✅ Shared configuration table
✅ Type-specific recording tables for complex checks
✅ Balance between flexibility and type safety
Disadvantages:
⚠️ Mixed approach can be confusing
⚠️ Still requires multiple recording tables
Schema Design:
// Shared configuration (same as Option 1)
nightCheckConfigurations: defineTable({...})

// Shared simple recordings (for night_note, environmental, etc.)
nightCheckRecordings: defineTable({...})

// Type-specific complex recordings
nightCheckDetailedRecordings: defineTable({
  recordingId: v.id("nightCheckRecordings"),
  checkType: v.literal("night_check"),
  
  // Night check specific fields
  position: v.union(v.literal("left_side"), v.literal("right_side"), ...),
  breathing: v.union(v.literal("normal"), v.literal("shallow"), ...),
  skinCondition: v.union(v.literal("normal"), v.literal("dry"), ...),
  // ... more fields
})

padChangeDetailedRecordings: defineTable({...})
bedRailsDetailedRecordings: defineTable({...})
Recommended Approach: Option 1 (Single Unified Schema)
Rationale:
Simplicity: Two tables instead of 12+
Flexibility: Easy to add new check types without schema changes
Query Performance: Single query to get all resident configurations
Reporting: Unified reports across all check types
Audit Trail: Single audit log for all changes
UK Healthcare Compliance: Easier to implement audit requirements
Implementation Details:
nightCheckConfigurations Table
Stores which checks are enabled for each resident
Configuration is resident-specific and persistent
Soft deletion with isActive flag for audit trail
Frequency stored in minutes for consistency
Items stored as string array for flexibility
nightCheckRecordings Table
Stores actual recordings made during shifts
Links back to configuration via configurationId
Denormalizes residentId for faster queries
Uses flexible checkData JSON field for type-specific data
Indexed by date for shift handover reports
Type-Specific checkData Structures:
// Night Check
{
  position: "left_side",
  breathing: "normal",
  skinCondition: "normal",
  comfortLevel: "comfortable",
  continenceCheck: true,
  padChanged: false,
  repositioned: true,
  coversAdjusted: false,
  medicationGiven: false,
  observations: "optional notes"
}

// Positioning
{
  newPosition: "right_side",
  repositioningCompleted: true,
  observations: "optional notes"
}

// Pad Change
{
  continenceCheckPerformed: true,
  padChanged: true,
  skinCondition: "normal",
  observations: "optional notes"
}

// Bed Rails Equipment Check
{
  equipmentChecked: ["bed_rails", "oxygen", "call_bell"],
  bedRailsSecure: true,
  oxygenFunctioning: true,
  callBellWithinReach: true,
  issues: [],
  observations: "optional notes"
}

// Environmental Check
{
  itemsChecked: ["window", "curtains", "door", "temperature"],
  windowSecure: true,
  curtainsClosed: true,
  doorClosed: false,
  temperatureOk: true,
  observations: "optional notes"
}

// Night Note
{
  note: "general observation text",
  noteType: "behavioral" // or "medical", "social", etc.
}
Additional Considerations:
1. Custom Items Storage
Store custom equipment/environmental items in the configuration:
selectedItems: [
  "bed_rails", // predefined
  "oxygen", // predefined
  "custom:IV_stand" // custom item with prefix
]
2. Notification System (Future)
Link frequency to automated notifications:
Create nightCheckNotifications table
Generate scheduled notifications based on frequencyMinutes
Track acknowledgment and completion
3. Audit Trail
Leverage existing residentAuditLog or create specific:
nightCheckAuditLog: defineTable({
  configurationId: v.optional(v.id("nightCheckConfigurations")),
  recordingId: v.optional(v.id("nightCheckRecordings")),
  action: v.union(
    v.literal("config_created"),
    v.literal("config_updated"),
    v.literal("config_deactivated"),
    v.literal("recording_created"),
    v.literal("recording_updated")
  ),
  changes: v.any(), // before/after values
  userId: v.id("users"),
  timestamp: v.number()
})
4. Handover Integration
Include night check data in existing handoverReports:
// Add to residentHandovers object:
nightChecksSummary: {
  totalChecksCompleted: 12,
  missedChecks: 2,
  checksByType: {
    night_check: 8,
    positioning: 4,
    pad_change: 3,
    bed_rails: 2,
    environmental: 1
  },
  issues: ["Oxygen equipment alarm at 3am"]
}
Migration Strategy
Phase 1: Create nightCheckConfigurations table
Phase 2: Migrate existing data (if any) from frontend state
Phase 3: Create nightCheckRecordings table
Phase 4: Build recording forms with type-specific validation
Phase 5: Integrate with handover reports
Phase 6: Add notification system
Compliance Notes
CQC Requirements: Audit trail maintained via metadata fields
Data Retention: Follow existing resident data retention policies
GDPR: Resident data linked via residentId for easy deletion
NHS Standards: Timestamp and user tracking on all records
Summary
Use Option 1 (Single Unified Schema) with two core tables:
nightCheckConfigurations - What checks each resident needs
nightCheckRecordings - Actual recordings of checks performed
This approach provides the best balance of flexibility, simplicity, and maintainability while meeting UK healthcare compliance requirements.