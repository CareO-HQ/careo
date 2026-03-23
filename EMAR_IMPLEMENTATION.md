# eMAR (Electronic Medication Administration Record) Implementation

## Overview
This document describes the implementation of the eMAR system for CareO Home Management Software. The system replaces the previous "All Medication" tab with a comprehensive electronic MAR solution that meets UK healthcare standards.

## Features Implemented

### 1. Database Schema (`supabase/migrations/20260323000000_create_emar_system.sql`)

**Tables Created:**
- `emar_sheets`: Monthly MAR sheet containers
  - Tracks active and archived sheets
  - Separate sheets for Medication MAR and PRN MAR
  - One sheet per resident per month per type

- `emar_administrations`: Individual administration records
  - Records medication administration details
  - Supports both scheduled and PRN medications
  - Includes digital signatures and witness information
  - Tracks reason, outcome, and dose for PRN medications

- `emar_signatures`: Digital signature storage
  - Stores reusable staff signatures
  - Supports both drawn and typed signatures

**Functions:**
- `archive_previous_month_emar_sheets()`: Archives sheets from previous months
- `get_or_create_emar_sheet()`: Creates or retrieves current month's MAR sheet

**Security:**
- Row Level Security (RLS) enabled on all tables
- Organization-based access control
- User-specific signature policies

### 2. Core Components

#### EmarSheet (`components/medication/emar/EmarSheet.tsx`)
- Main container component with month navigation
- Separate tabs for Medication MAR and PRN MAR
- Month selection with previous/next navigation
- Automatic sheet creation for current month
- Read-only mode for archived months
- PDF export integration

#### MedicationMarSheet (`components/medication/emar/MedicationMarSheet.tsx`)
- Monthly calendar grid for scheduled medications
- Displays medication name, dose, route, and scheduled times
- Calendar cells show administration status:
  - ✓ = Given
  - R = Refused
  - O = Omitted
  - N = Not Required
- Color-coded status indicators
- Administration key legend
- Click-to-record functionality

#### PrnMarSheet (`components/medication/emar/PrnMarSheet.tsx`)
- Monthly calendar grid for PRN medications
- Displays medication name, indication, and max daily dose
- Calendar cells show number of doses administered per day
- Click-to-record functionality for multiple administrations
- View and manage all PRN administrations for a day

### 3. Administration Modals

#### MedicationAdministrationModal (`components/medication/emar/MedicationAdministrationModal.tsx`)
- Records scheduled medication administration
- Status selection: Given, Refused, Omitted, Not Required
- Witness selection (required for "given" status)
- Digital signature capture
- Notes field for additional information
- Edit existing records

#### PrnAdministrationModal (`components/medication/emar/PrnAdministrationModal.tsx`)
- Records PRN medication administration
- Captures:
  - Reason for administration
  - Dose administered
  - Outcome/effectiveness
  - Additional notes
- Digital signature required
- View previous administrations for the day
- Add multiple administrations per day
- Delete administration records

### 4. Digital Signature System

#### SignaturePad (`components/medication/emar/SignaturePad.tsx`)
- Two signature modes:
  1. **Type Mode**: User types their full name (styled as signature)
  2. **Draw Mode**: Canvas-based signature drawing
- Touch and mouse support
- Clear/reset functionality
- Signature preview
- Stores signature as data URL or text

### 5. PDF Export System

#### EmarPdfExport (`components/medication/emar/EmarPdfExport.tsx`)
- Generates printable UK-format MAR sheets
- Separate exports for Medication MAR and PRN MAR
- Includes:
  - Resident information header
  - Monthly calendar grid
  - Medication details
  - Administration records
  - Status key/legend
  - Generation timestamp
- Landscape A4 format
- Print-optimized styling
- Opens in new window for printing

### 6. Integration with Existing System

**Changes to medication page** (`app/(dashboard)/dashboard/residents/[id]/(pages)/medication/page.tsx`):
- Replaced "All Medications" tab with "eMAR" tab
- Added EmarSheet component import
- Passes resident, organization, and care home information
- Maintains existing "Today's Medications", "Discontinued", "Kardex", and "History" tabs

## Design Consistency

The eMAR system maintains design consistency with the existing Kardex/Cardex tab:
- Similar header styling (gray-700 background for table headers)
- Consistent color scheme:
  - Gray-50/Gray-100 for alternating rows
  - Green for successful/given status
  - Orange for refused
  - Blue for not required
  - Gray for omitted
- Typography matches existing medication components
- Border and spacing follows established patterns
- Badge styling for controlled drugs (CD)

## Data Flow

### Creating a MAR Sheet
1. User navigates to eMAR tab
2. System calls `get_or_create_emar_sheet()` function
3. Function checks for existing active sheet for current month
4. Creates new sheet if needed
5. Returns sheet ID

### Recording Administration
1. User clicks calendar cell
2. Modal opens with medication details
3. User selects status and provides required information
4. User provides digital signature
5. System validates required fields
6. Record saved to `emar_administrations` table
7. Calendar cell updates to show status

### Monthly Archiving
- Sheets from previous months are automatically marked as archived
- Archived sheets are read-only
- Users can navigate to previous months to view historical data
- `archive_previous_month_emar_sheets()` function handles archiving

## Security & Compliance

### Audit Trail
- All administrations record:
  - Who administered (administered_by)
  - When administered (administered_at)
  - Digital signature
  - Witness information (for controlled drugs)
  - Status changes
- Complete medication history maintained

### Access Control
- Organization-level RLS policies
- Care home isolation
- User can only view/edit within their organization
- Signatures tied to user accounts

### Data Validation
- Required fields enforced
- Witness required for "given" status
- Signature required for all administrations
- Notes required for refusal/omission

## UK Healthcare Compliance

### MAR Sheet Standards
- Follows traditional UK paper MAR chart format
- Monthly cycle (resets on 1st of month)
- Separate sheets for scheduled and PRN medications
- Administration key included
- Staff signature system
- Witness requirements for high-risk medications

### Clinical Requirements
- Controlled drug (CD) warnings
- Dose, route, and time clearly displayed
- Prescriber information included
- Maximum dose information for PRN
- Reason and outcome tracking for PRN
- Notes field for clinical observations

## Future Enhancements

Potential improvements for future releases:

1. **Automatic Archiving Cron Job**
   - Scheduled job to archive previous months
   - Runs on 1st of each month
   - Email notifications to staff

2. **Advanced Reporting**
   - Medication compliance reports
   - PRN usage analytics
   - Missed dose tracking
   - Refusal pattern analysis

3. **Mobile Optimization**
   - Touch-friendly calendar interface
   - Optimized for tablets
   - Offline support

4. **Integration Enhancements**
   - NHS Spine integration
   - Pharmacy system integration
   - GP system integration

5. **Additional Features**
   - Medication stock alerts
   - Expiry date tracking
   - Allergy checking
   - Drug interaction warnings

## Testing Recommendations

### Manual Testing Checklist
- [ ] Create MAR sheet for current month
- [ ] Record medication administration (all statuses)
- [ ] Record PRN administration
- [ ] Add digital signature (both types)
- [ ] Select witness
- [ ] View previous months (read-only check)
- [ ] Navigate between months
- [ ] Export PDF (both types)
- [ ] Print MAR sheets
- [ ] Delete PRN administration
- [ ] Edit existing administration
- [ ] Test with controlled drugs
- [ ] Test with multiple time slots
- [ ] Test PRN multiple doses per day

### Automated Testing Considerations
- RLS policy testing
- Signature validation
- Month transition handling
- Archive function testing
- PDF generation
- Modal form validation

## Technical Notes

### Dependencies Added
- No new external dependencies required
- Uses existing shadcn/ui components
- Uses existing date-fns for date handling
- Canvas API for signature drawing
- Supabase RPC functions

### Performance Considerations
- Calendar grid optimized for monthly view
- Minimal re-renders using React hooks
- Efficient queries with indexes
- PDF generation uses print-optimized CSS

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Touch events for mobile/tablet
- Canvas API support required
- Print API support required

## Migration Instructions

### Database Migration
```bash
# Apply the migration
supabase migration up

# Or if using direct SQL
psql -d your_database -f supabase/migrations/20260323000000_create_emar_system.sql
```

### Rollout Strategy
1. Apply database migration in development
2. Test thoroughly with sample data
3. Train staff on new eMAR system
4. Deploy to staging environment
5. User acceptance testing
6. Deploy to production
7. Monitor for issues

### Data Migration
- No data migration needed (new feature)
- Existing medication data remains unchanged
- Old medication_intakes table not affected
- Both systems can coexist during transition

## Support & Documentation

### User Training
- Staff should be trained on:
  - Accessing eMAR sheets
  - Recording administrations
  - Using digital signatures
  - Understanding status codes
  - Printing MAR sheets
  - PRN documentation requirements

### Administrator Guide
- Setting up RLS policies
- Managing user permissions
- Running archive function
- Troubleshooting common issues
- Backup and recovery procedures

## Compliance Checklist

- [x] Follows UK MAR chart format
- [x] Digital signatures implemented
- [x] Audit trail maintained
- [x] Controlled drug warnings
- [x] Witness requirements
- [x] Monthly cycle implemented
- [x] Read-only archived months
- [x] PDF export for records
- [x] Printable format
- [x] PRN reason/outcome tracking

## Contact & Support

For issues or questions regarding the eMAR implementation:
- Review this documentation
- Check database logs for errors
- Verify RLS policies are correctly applied
- Ensure Supabase functions are created
- Test with different user roles

---

**Implementation Date:** March 23, 2026
**Version:** 1.0
**Status:** Ready for Testing
