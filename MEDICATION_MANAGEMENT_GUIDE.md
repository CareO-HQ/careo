# Comprehensive Active Medication Management System

## Overview

This document describes the comprehensive active medication management system that provides 100% control over all aspects of medication management, including stock tracking, receiving, discontinuation, and complete audit trails.

## Features

### 1. **Active Medications Management Tab**

A new "Active Medications" tab has been added to the medication page (`/dashboard/residents/[id]/medication`) that provides:

- **Comprehensive Medication Overview**
  - View all active medications in a searchable, sortable data table
  - Real-time stock status indicators (Out of Stock, Low Stock, In Stock)
  - Quick statistics dashboard showing:
    - Total active medications
    - Out of stock count
    - Low stock warnings (≤10 units)
    - Controlled drugs count

- **Full CRUD Operations**
  - Edit any medication details via the existing EditMedicationDialog
  - Update all fields: name, strength, dosage, frequency, times, prescriber, etc.
  - Visual indicators for controlled drugs (CD Schedule 2-5)
  - Type badges (Scheduled, PRN, Topical, Supplement)

### 2. **Stock Management System**

#### **Receive Stock**
- Record new medication stock received from pharmacies/suppliers
- Track:
  - Quantity received
  - Batch/lot numbers
  - Expiry dates
  - Supplier name
  - Prescription reference
  - Receipt notes
  - Who received the stock and when
- Automatic stock count updates
- Real-time preview of new stock levels

#### **Adjust Stock**
- Manual stock adjustments for various scenarios:
  - Manual correction
  - Damaged medication
  - Expired medication
  - Lost/missing stock
  - Returned to pharmacy
  - Other reasons
- Choose increase or decrease direction
- Provide required reason and optional notes
- Automatic audit trail creation
- Prevents negative stock counts

#### **Stock History**
- Complete audit trail of all stock movements
- Shows both receipts and adjustments
- Details include:
  - Date and time of transaction
  - Transaction type (receipt/adjustment)
  - Description of what happened
  - Stock before/after counts
  - Quantity changed
  - Who performed the action
  - Additional notes
- Sortable by date
- Visual indicators for different transaction types

### 3. **Medication Discontinuation Workflow**

#### **Discontinue Medication Dialog**
- Comprehensive discontinuation process with safeguards:
  - Warning about immediate effect on future administrations
  - Medication details review
  - Required discontinuation reason selection:
    - Treatment Complete
    - Side Effects / Adverse Reaction
    - Medication Ineffective
    - Prescriber Instruction
    - Resident / Family Request
    - Transferred to Hospital
    - Resident Deceased
    - Medication Review / Deprescribing
    - Duplicate Therapy
    - Drug Interaction Risk
    - Other
  - Additional notes field for prescriber authorization details
  - Double confirmation dialog to prevent accidental discontinuation

#### **Discontinuation Tracking**
- Records:
  - Discontinuation timestamp
  - Who discontinued the medication
  - Reason for discontinuation
  - Additional clinical notes
  - Complete administration history preserved

- Discontinued medications:
  - Move to "Discontinued" tab
  - Stop future scheduled administrations
  - Remain viewable for audit purposes
  - Cannot be re-activated (must create new medication)

### 4. **Visual Indicators & Status Badges**

#### Stock Status Badges:
- **Out of Stock** (Red) - Count = 0
- **Low Stock** (Orange) - Count ≤ 10
- **In Stock** (Green) - Count > 10
- **Not Tracked** (Gray) - No count set

#### Medication Type Badges:
- **Scheduled** (Blue)
- **PRN (As Needed)** (Purple)
- **Topical** (Teal)
- **Supplement** (Amber)

#### Controlled Drug Badges:
- Red badges showing "CD Schedule 2/3/4/5"

## Database Schema

### New Tables Created

#### `medication_stock_receipts`
Tracks all medication stock received from pharmacies/suppliers.

```sql
CREATE TABLE medication_stock_receipts (
  id UUID PRIMARY KEY,
  medication_id UUID NOT NULL,
  resident_id UUID NOT NULL,
  quantity_received INTEGER NOT NULL,
  batch_number TEXT,
  expiry_date DATE,
  supplier_name TEXT,
  prescription_reference TEXT,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  received_by UUID NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  organization_id UUID NOT NULL,
  care_home_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `medication_stock_adjustments`
Tracks manual stock adjustments (corrections, damages, losses, etc.).

```sql
CREATE TABLE medication_stock_adjustments (
  id UUID PRIMARY KEY,
  medication_id UUID NOT NULL,
  resident_id UUID NOT NULL,
  adjustment_type TEXT NOT NULL, -- 'manual_correction', 'damaged', 'expired', 'lost', 'returned_to_pharmacy', 'other'
  quantity_change INTEGER NOT NULL, -- Can be positive or negative
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  adjusted_by UUID NOT NULL,
  adjusted_at TIMESTAMPTZ NOT NULL,
  organization_id UUID NOT NULL,
  care_home_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `medication_stock_history` (View)
Unified view combining receipts and adjustments for easy querying.

### Enhanced Medications Table

New fields added to `medications` table:

```sql
ALTER TABLE medications
ADD COLUMN discontinued_at TIMESTAMPTZ,
ADD COLUMN discontinued_by UUID,
ADD COLUMN discontinuation_reason TEXT,
ADD COLUMN discontinuation_notes TEXT;
```

## Database Functions

### `receive_medication_stock()`
Server-side function to receive stock and create audit record.

**Parameters:**
- `p_medication_id` - UUID of medication
- `p_resident_id` - UUID of resident
- `p_quantity_received` - Integer quantity received
- `p_batch_number` - Optional batch number
- `p_expiry_date` - Optional expiry date
- `p_supplier_name` - Optional supplier name
- `p_prescription_reference` - Optional prescription reference
- `p_received_by` - UUID of user receiving stock
- `p_notes` - Optional notes
- `p_organization_id` - Organization ID
- `p_care_home_id` - Care home ID

**Returns:** JSON with success status and stock details

### `adjust_medication_stock()`
Server-side function to adjust stock and create audit record.

**Parameters:**
- `p_medication_id` - UUID of medication
- `p_resident_id` - UUID of resident
- `p_adjustment_type` - Type of adjustment
- `p_quantity_change` - Integer (positive or negative)
- `p_reason` - Required reason text
- `p_notes` - Optional notes
- `p_adjusted_by` - UUID of user adjusting stock
- `p_organization_id` - Organization ID
- `p_care_home_id` - Care home ID

**Returns:** JSON with success status and stock details

## Component Architecture

### New Components

#### `ActiveMedicationsTable.tsx`
Main component for active medications management.
- Location: `/components/medication/management/ActiveMedicationsTable.tsx`
- Features: Data table, search, stats cards, action menus
- Uses TanStack React Table for sorting/filtering

#### `ReceiveStockDialog.tsx`
Dialog for receiving new medication stock.
- Location: `/components/medication/management/ReceiveStockDialog.tsx`
- Features: Form validation, batch tracking, real-time preview
- Uses React Hook Form + Zod validation

#### `AdjustStockDialog.tsx`
Dialog for manual stock adjustments.
- Location: `/components/medication/management/AdjustStockDialog.tsx`
- Features: Increase/decrease direction, reason tracking, preview
- Prevents negative stock counts

#### `DiscontinueMedicationDialog.tsx`
Dialog for discontinuing medications with safeguards.
- Location: `/components/medication/management/DiscontinueMedicationDialog.tsx`
- Features: Reason selection, double confirmation, prescriber notes
- Two-step process (form → confirmation)

#### `StockHistoryDialog.tsx`
Dialog showing complete stock movement history.
- Location: `/components/medication/management/StockHistoryDialog.tsx`
- Features: Transaction list, user names, sortable, scrollable
- Shows receipts and adjustments in chronological order

## User Workflow

### Receiving New Medication Stock

1. Navigate to resident's medication page
2. Click "Active Medications" tab
3. Click actions menu (⋮) for desired medication
4. Select "Receive Stock"
5. Fill in receipt details:
   - Quantity received (required)
   - Batch number (optional)
   - Expiry date (optional)
   - Supplier name (optional)
   - Prescription reference (optional)
   - Notes (optional)
6. Review preview of new stock level
7. Click "Receive Stock"
8. System updates count and creates audit record

### Adjusting Stock

1. Navigate to resident's medication page
2. Click "Active Medications" tab
3. Click actions menu (⋮) for desired medication
4. Select "Adjust Stock"
5. Choose direction (Increase/Decrease)
6. Enter quantity to adjust
7. Select adjustment type
8. Provide reason (required)
9. Add notes (optional)
10. Review preview of new stock level
11. Click "Adjust Stock"
12. System updates count and creates audit record

### Discontinuing a Medication

1. Navigate to resident's medication page
2. Click "Active Medications" tab
3. Click actions menu (⋮) for desired medication
4. Select "Discontinue" (red option)
5. Review warning and medication details
6. Select discontinuation reason (required)
7. Add prescriber authorization details in notes
8. Click "Discontinue Medication"
9. Confirm in second dialog
10. Medication moves to "Discontinued" tab
11. Future administrations stopped immediately

### Viewing Stock History

1. Navigate to resident's medication page
2. Click "Active Medications" tab
3. Click actions menu (⋮) for desired medication
4. Select "View Stock History"
5. Review complete transaction log
6. See who performed each action and when
7. Scroll through chronological history

## Security & Compliance

### Row-Level Security (RLS)
- All new tables have RLS enabled
- Users can only access data in their organization
- Automatic filtering by `organization_id`

### Audit Trail
- Every stock movement recorded with:
  - User who performed action
  - Timestamp
  - Stock before/after
  - Reason/description
  - Additional notes
- Immutable records (no deletion)
- Complete history preserved

### Data Integrity
- Stock counts cannot go negative
- Required fields enforced at database level
- Discontinuation requires reason
- Double confirmation for destructive actions

## Migration

### Running the Migration

```bash
# The migration will be automatically detected by Supabase
# File: supabase/migrations/20260323100000_medication_stock_management.sql

# To apply manually:
psql $DATABASE_URL -f supabase/migrations/20260323100000_medication_stock_management.sql
```

### Migration Contents
1. Adds discontinuation fields to medications table
2. Creates medication_stock_receipts table
3. Creates medication_stock_adjustments table
4. Creates medication_stock_history view
5. Sets up RLS policies
6. Creates database functions
7. Adds indexes for performance

### Post-Migration Steps
1. Verify all tables created successfully
2. Test RLS policies work correctly
3. Populate initial stock counts if needed
4. Train staff on new workflows

## Testing Checklist

### Stock Receipt Testing
- [ ] Can receive stock with all optional fields
- [ ] Can receive stock with minimal data
- [ ] Stock count updates correctly
- [ ] Receipt record created in database
- [ ] User name displayed in history
- [ ] Toast notification shows correct counts

### Stock Adjustment Testing
- [ ] Can increase stock
- [ ] Can decrease stock
- [ ] Cannot go negative (floors at 0)
- [ ] All adjustment types selectable
- [ ] Reason required
- [ ] Adjustment record created
- [ ] Preview shows correct calculation

### Discontinuation Testing
- [ ] Warning displayed correctly
- [ ] All reasons selectable
- [ ] Notes field works
- [ ] Double confirmation required
- [ ] Status updates to discontinued
- [ ] Medication moves to Discontinued tab
- [ ] Future intakes stop generating
- [ ] History preserved

### Stock History Testing
- [ ] Shows both receipts and adjustments
- [ ] Sorted by date (newest first)
- [ ] User names resolve correctly
- [ ] Visual badges display correctly
- [ ] Scroll works for long lists
- [ ] Empty state shows when no history

### UI/UX Testing
- [ ] Search medications works
- [ ] Sort columns works
- [ ] Stock badges show correct colors
- [ ] Stats cards update on changes
- [ ] Controlled drug badges visible
- [ ] Mobile responsive
- [ ] Dialogs close properly
- [ ] Form validation works

## Future Enhancements

### Suggested Features
1. **Low Stock Alerts**
   - Automatic notifications when stock ≤ threshold
   - Configurable threshold per medication
   - Email/SMS alerts to pharmacy

2. **Expiry Date Tracking**
   - Alerts for medications approaching expiry
   - Automatic removal of expired stock
   - FEFO (First Expired, First Out) logic

3. **Batch-Level Stock Management**
   - Track stock by individual batches
   - Recall capability by batch number
   - More granular expiry management

4. **Pharmacy Integration**
   - Automatic prescription orders
   - Electronic communication with pharmacies
   - Stock level synchronization

5. **Reporting & Analytics**
   - Stock usage patterns
   - Wastage reports
   - Cost analysis
   - Controlled drug register

6. **Barcode Scanning**
   - Quick stock receipt via barcode
   - Reduce manual entry errors
   - Faster workflow

## Support & Troubleshooting

### Common Issues

**Stock count not updating:**
- Check browser console for errors
- Verify user has correct permissions
- Ensure organization_id is set correctly

**Cannot see stock history:**
- Verify RLS policies are enabled
- Check user is in correct organization
- Ensure medication_id is valid

**Discontinuation not working:**
- Verify user has permission to update medications
- Check required fields are filled
- Look for validation errors in form

### Getting Help
- Check CLAUDE.md for project overview
- Review migration SQL for schema details
- Test with sample data first
- Contact system administrator for permissions issues

## Changelog

### Version 1.0.0 (2026-03-23)
- Initial release of comprehensive medication management
- Added Active Medications tab
- Implemented stock receiving workflow
- Implemented stock adjustment workflow
- Implemented medication discontinuation workflow
- Created stock history view
- Added database functions for stock management
- Implemented complete audit trail
- Added visual stock status indicators
- Created documentation

---

**Last Updated:** March 23, 2026
**Status:** Production Ready (after migration)
**Migration File:** `20260323100000_medication_stock_management.sql`
