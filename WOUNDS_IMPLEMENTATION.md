# Wounds Management System Implementation

## Overview
A comprehensive wounds management system has been implemented for the CareO application, similar to the existing incidents management system.

## What Was Created

### 1. Database Schema
**File**: `supabase/migrations/20260304000000_create_wounds_table.sql`

Two new tables have been created:

#### `wounds` table
Tracks all wounds for residents with the following fields:
- **Basic Info**: wound_name, location, wound_type, stage, status
- **Assessment Details**: length_cm, width_cm, depth_cm, wound_bed_description, exudate_type, exudate_amount, surrounding_skin_condition, odor, pain_level
- **Treatment**: treatment_plan, dressing_type, dressing_frequency, notes
- **Tracking**: date_identified, last_reviewed_date, last_reviewed_by, expected_next_review
- **Documentation**: image_urls (array)
- **Audit**: created_by, created_at, updated_at, organization_id

#### `wound_assessments` table
Tracks historical assessments and wound progression over time:
- Assessment date, time, assessed_by
- Measurements (length, width, depth)
- Wound condition details
- Treatment applied
- Progress notes
- Images from each assessment

Both tables include:
- Proper indexes for performance
- RLS (Row Level Security) policies
- Foreign key constraints
- Updated_at triggers

### 2. Wounds Management Page
**File**: `app/(dashboard)/dashboard/residents/[id]/(pages)/wounds/page.tsx`

Features:
- **Table Display** with columns:
  - Wound (name)
  - Location
  - Type
  - Stage
  - Status (with color-coded badges)
  - Last Reviewed (date and reviewer)
  - Actions

- **Statistics Cards**:
  - Total Wounds
  - Active Wounds
  - Healing Wounds
  - Healed Wounds

- **Filtering & Search**:
  - Search by wound name, location, type
  - Filter by status (active, healing, healed, deteriorating, infected)
  - Filter by wound type
  - Sort by date (newest/oldest first)

- **Pagination**: 10 items per page

- **View Dialog**: Detailed wound information display

- **Status Indicators**: Color-coded badges with icons:
  - Active: Red
  - Healing: Yellow with trending up icon
  - Healed: Green
  - Deteriorating: Orange with trending down icon
  - Infected: Purple

### 3. Clinical Page Integration
**Updated File**: `app/(dashboard)/dashboard/residents/[id]/(pages)/clinical/page.tsx`

Added a new "Wounds" card that:
- Displays up to 3 most recent wounds
- Shows wound name, location, type, stage, status
- Shows last reviewed date
- Has a "View All" button linking to the full wounds page
- Matches the design pattern of other clinical cards

## How to Use

### Step 1: Apply Database Migration
Run the migration to create the wounds tables in your Supabase database:

```bash
# Using Supabase CLI
npx supabase db push

# OR apply the migration file directly in your Supabase dashboard
# Navigate to: SQL Editor → New Query
# Then paste the contents of: supabase/migrations/20260304000000_create_wounds_table.sql
```

### Step 2: Access Wounds Management
Navigate to:
```
http://localhost:3000/dashboard/residents/[resident-id]/clinical
```

You'll see the new "Wounds" section on the clinical page.

Click "View All" or navigate directly to:
```
http://localhost:3000/dashboard/residents/[resident-id]/wounds
```

### Step 3: Add Wounds (To Be Implemented)
The "Add Wound" button currently navigates to a form page that needs to be created:
```
/dashboard/residents/[resident-id]/wounds/new
```

You can implement this form page to create new wounds.

## Next Steps (Optional Enhancements)

### 1. Create Wound Form
Create a form component for adding/editing wounds:
- File: `app/(dashboard)/dashboard/residents/[id]/(pages)/wounds/new/page.tsx`
- File: `app/(dashboard)/dashboard/residents/[id]/(pages)/wounds/[woundId]/edit/page.tsx`

### 2. Wound Assessment Form
Create a form for recording wound assessments:
- File: `app/(dashboard)/dashboard/residents/[id]/(pages)/wounds/[woundId]/assess/page.tsx`

### 3. Image Upload
Integrate image upload functionality for wound documentation using the existing file upload system.

### 4. Wound Care Plans
Link wounds to care plans for comprehensive wound management.

### 5. Reports & Analytics
- Wound healing progress reports
- Statistics dashboard
- Export wound data to PDF/CSV

### 6. Notifications
- Alerts for wounds requiring review
- Notifications for deteriorating wounds
- Reminders for dressing changes

## Database Schema Details

### Wound Stages (for Pressure Ulcers)
- Stage 1
- Stage 2
- Stage 3
- Stage 4
- Unstageable
- Deep Tissue Injury

### Wound Types
- Pressure ulcer
- Surgical
- Traumatic
- Diabetic
- Arterial
- Venous

### Wound Status
- active
- healing
- healed
- deteriorating
- infected

### Exudate Types
- None
- Serous
- Sanguineous
- Serosanguineous
- Purulent

### Exudate Amounts
- None
- Minimal
- Moderate
- Heavy

## Security & Permissions
All wounds data is protected by Row Level Security (RLS):
- **View**: All users within the organization
- **Create/Update**: Nurse, Manager, Owner, SaaS Admin roles
- **Delete**: Manager, Owner, SaaS Admin roles only

## Testing
After applying the migration, test by:
1. Visiting a resident's clinical page
2. Checking that the Wounds section appears
3. Clicking "View All" to see the wounds management page
4. Verifying that the table, filters, and search work correctly

## Files Modified/Created

### Created:
1. `supabase/migrations/20260304000000_create_wounds_table.sql` - Database schema
2. `app/(dashboard)/dashboard/residents/[id]/(pages)/wounds/page.tsx` - Main wounds page
3. `app/(dashboard)/dashboard/residents/[id]/(pages)/wounds/components/` - Components folder (empty, ready for forms)

### Modified:
1. `app/(dashboard)/dashboard/residents/[id]/(pages)/clinical/page.tsx` - Added wounds section

---

**Implementation Date**: March 4, 2026
**Status**: ✅ Core functionality complete, forms need to be implemented
