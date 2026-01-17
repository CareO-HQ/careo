# Care File Versioning System - Comprehensive Test Suite

## Overview
This document outlines a comprehensive manual testing suite for the care file versioning system in the CareO home management software. These tests should be executed to verify that all versioning functionality works correctly.

## Test Environment Setup
- **URL**: `http://localhost:3000`
- **Prerequisites**:
  - User account with permissions to create and edit care files
  - At least one resident created in the system
  - Access to all 18 care file folders

---

## Test Suite 1: Form Versioning (Files Section)

### Test 1.1: Create Initial Form
**Objective**: Verify that a newly created form appears in the Files section

**Steps**:
1. Navigate to a resident's care file page
2. Open the "Pre-Admission" folder
3. Click on "Pre-Admission Assessment" to create a new form
4. Fill out the form with test data
5. Submit the form

**Expected Result**:
- ✅ Form appears in the Files section
- ✅ Form is marked with "Latest" badge
- ✅ Form displays creation date/time
- ✅ Actions available: View, Edit, Delete, Download
- ✅ Archive section shows "No archived assessments yet"

---

### Test 1.2: Edit Form Creates New Version
**Objective**: Verify that editing a form creates a new version and archives the previous one

**Steps**:
1. From Test 1.1, click the Edit button on the form
2. Modify some field values
3. Submit the updated form

**Expected Result**:
- ✅ New version (v2) appears in Files section with "Latest" badge
- ✅ Previous version (v1) moves to Archive section
- ✅ Archive section shows 1 archived assessment
- ✅ Archive item displays: View, Download, Delete actions
- ✅ Archive item shows original creation date

---

### Test 1.3: Multiple Edits - Latest Only in Files
**Objective**: Verify that only the most recent version appears in Files section after multiple edits

**Steps**:
1. From Test 1.2, edit the form again (creating v3)
2. Edit once more (creating v4)
3. Edit a final time (creating v5)

**Expected Result**:
- ✅ Only v5 appears in Files section
- ✅ Files section has exactly 1 item
- ✅ Archive section shows 4 items (v4, v3, v2, v1)
- ✅ Archive items sorted by date (newest first): v4, v3, v2, v1

---

### Test 1.4: All 23 Form Types Support Versioning
**Objective**: Verify versioning works for all form types

**Forms to Test** (create, edit, verify versioning):
1. Pre-Admission Assessment
2. Admission Assessment
3. Photography Consent
4. DNACPR
5. PEEP Assessment
6. Dependency Assessment
7. This Is My Life (TIML)
8. Skin Integrity Assessment
9. Resident Valuables
10. Resident Handling Profile
11. Pain Assessment
12. Nutritional Assessment
13. Oral Assessment *(Added in fix)*
14. Diet Notification *(Added in fix)*
15. Choking Risk Assessment *(Added in fix)*
16. Cornell Depression Scale *(Added in fix)*
17. Best Interest Decision *(Added in fix)*
18. Infection Prevention *(Added in fix)*
19. Bladder & Bowel Assessment *(Added in fix)*
20. Moving & Handling Assessment *(Added in fix)*
21. Bedrail Consent *(Added in fix)*
22. Bed Rails Risk Assessment *(Added in fix)*
23. Long-term Fall Risk Assessment *(Added in fix)*

**For Each Form**:
- ✅ Create initial version → appears in Files
- ✅ Edit to create v2 → v1 moves to Archive
- ✅ Verify View, Edit, Delete, Download actions work

---

## Test Suite 2: Care Plan Versioning

### Test 2.1: Create Initial Care Plan
**Objective**: Verify care plan creation and display

**Steps**:
1. Navigate to a resident's care file
2. Open a folder that supports care plans (e.g., "DNACPR")
3. Click "Create Care Plan" button
4. Fill out care plan details
5. Submit the care plan

**Expected Result**:
- ✅ Care plan appears in "Care Plans" section
- ✅ Care plan shows creation date and "Latest" badge
- ✅ Actions available: View, Evaluate, Delete, Download
- ✅ "Archived Care Plans" section is empty

---

### Test 2.2: Edit Care Plan Creates Version
**Objective**: Verify care plan versioning works correctly

**Steps**:
1. From Test 2.1, click Edit on the care plan
2. Modify care plan details
3. Submit the updated care plan

**Expected Result**:
- ✅ New version appears in Care Plans section
- ✅ Previous version moves to Archived Care Plans section
- ✅ Only 1 care plan in Care Plans section
- ✅ 1 care plan in Archived Care Plans section

---

### Test 2.3: Multiple Care Plan Edits
**Objective**: Verify multiple versions are handled correctly

**Steps**:
1. Edit the care plan 3 more times (total of 5 versions)

**Expected Result**:
- ✅ Care Plans section shows only v5
- ✅ Archived Care Plans section shows 4 items (v4, v3, v2, v1)
- ✅ All archived versions viewable
- ✅ Version chain maintained (`previousCarePlanId` field)

---

### Test 2.4: Care Plans Per Folder
**Objective**: Verify each folder maintains its own care plan versioning

**Steps**:
1. Create care plan in "DNACPR" folder
2. Create care plan in "PEEP" folder
3. Create care plan in "Dependency" folder
4. Edit each care plan once

**Expected Result**:
- ✅ Each folder shows its own latest care plan
- ✅ Editing in one folder doesn't affect others
- ✅ Archived Care Plans page shows all archived versions across folders
- ✅ Each archived care plan tagged with correct folder

---

## Test Suite 3: Archive Pages

### Test 3.1: Archived Risk Assessments Page
**Objective**: Verify the dedicated archive page displays all archived forms

**Steps**:
1. Navigate to `/dashboard/residents/{residentId}/care-file/archived-risk-assessments`
2. Verify page loads and displays table

**Expected Result**:
- ✅ Page title: "Archived Assessments"
- ✅ Table columns: Assessment Name, Category, Folder, Completed At, Version, Actions
- ✅ All archived forms from ALL folders displayed
- ✅ Sorted by most recent first
- ✅ View action opens form in read-only mode
- ✅ Color-coded category badges displayed correctly

---

### Test 3.2: All 23 Form Types Appear in Archive Page
**Objective**: Verify fix for Bug #1 - all form types now queryable

**Steps**:
1. Create and edit at least one form of EACH of the 23 types
2. Navigate to archived risk assessments page
3. Verify all types appear

**Form Types to Verify on Archive Page**:
- ✅ Pre-Admission Assessment
- ✅ Admission Assessment
- ✅ Photography Consent
- ✅ DNACPR
- ✅ PEEP Assessment
- ✅ Dependency Assessment
- ✅ This Is My Life
- ✅ Skin Integrity Assessment
- ✅ Resident Valuables
- ✅ Resident Handling Profile
- ✅ Pain Assessment
- ✅ Nutritional Assessment
- ✅ **Oral Assessment** *(Previously missing)*
- ✅ **Diet Notification** *(Previously missing)*
- ✅ **Choking Risk Assessment** *(Previously missing)*
- ✅ **Cornell Depression Scale** *(Previously missing)*
- ✅ **Best Interest Decision** *(Previously missing)*
- ✅ **Infection Prevention** *(Previously missing)*
- ✅ **Bladder & Bowel** *(Previously missing)*
- ✅ **Moving & Handling** *(Previously missing)*
- ✅ **Bedrail Consent** *(Previously missing)*
- ✅ **Bed Rails Risk Assessment** *(Previously missing)*
- ✅ **Long-term Fall Risk** *(Previously missing)*

---

### Test 3.3: Archived Care Plans Page
**Objective**: Verify care plan archive page functionality

**Steps**:
1. Navigate to `/dashboard/residents/{residentId}/care-file/archived-care-plans`
2. Verify page loads with archived care plans

**Expected Result**:
- ✅ Page title: "Archived Care Plans"
- ✅ Table columns: Care Plan Name, Folder, Care Plan Number, Written By, Date Written, Archived At, Version, Actions
- ✅ All archived care plans displayed across all folders
- ✅ Sorted by most recent first
- ✅ View action opens care plan dialog
- ✅ Folder badges displayed correctly

---

## Test Suite 4: Deletion Edge Cases

### Test 4.1: Delete Latest Version with Archived Versions
**Objective**: Verify enhanced warning dialog for deleting latest version

**Steps**:
1. Create a form and edit it 3 times (4 total versions)
2. Click Delete on the latest version in Files section
3. Observe the confirmation dialog

**Expected Result**:
- ✅ Dialog shows **orange warning message**: "Warning: You are deleting the latest version."
- ✅ Message explains:
  - "The latest version will be permanently deleted"
  - "The Files section will appear empty"
  - "Previous versions will remain in the Archive section"
  - "You can view archived versions in the Archive section below"
- ✅ Cancel button available
- ✅ Delete button still functional

---

### Test 4.2: Proceed with Latest Version Deletion
**Objective**: Verify behavior after deleting latest version with archived versions

**Steps**:
1. From Test 4.1, click "Delete" to proceed
2. Observe Files and Archive sections

**Expected Result**:
- ✅ Latest version deleted successfully
- ✅ Files section shows: "No PDF files available"
- ✅ Archive section still shows 3 archived versions (v3, v2, v1)
- ✅ Archived versions remain viewable and downloadable
- ✅ User can access older versions from Archive

**KNOWN LIMITATION**:
- ⚠️ v3 remains in Archive section (not automatically promoted to Files)
- User must be aware of this behavior per warning message

---

### Test 4.3: Delete Archived Version (Non-Latest)
**Objective**: Verify deleting an archived version doesn't affect latest

**Steps**:
1. Create form with 4 versions (v1, v2, v3, v4)
2. From Archive section, delete v2
3. Observe Files and Archive sections

**Expected Result**:
- ✅ v2 deleted from Archive section
- ✅ v4 remains in Files section (unaffected)
- ✅ v3 and v1 remain in Archive section
- ✅ No warning message shown (standard delete dialog)

---

### Test 4.4: Delete Only Version (No Archives)
**Objective**: Verify deleting when there's only one version

**Steps**:
1. Create a form (only v1 exists)
2. Click Delete on v1

**Expected Result**:
- ✅ Standard delete dialog (no warning about archived versions)
- ✅ Form deleted successfully
- ✅ Files section empty
- ✅ Archive section empty

---

### Test 4.5: Delete All Versions
**Objective**: Verify deleting all versions clears everything

**Steps**:
1. Create form with 3 versions
2. Delete the latest version (v3)
3. Delete v2 from Archive
4. Delete v1 from Archive

**Expected Result**:
- ✅ All versions deleted
- ✅ Files section shows "No PDF files available"
- ✅ Archive section shows "No archived assessments yet"

---

## Test Suite 5: Integration Tests

### Test 5.1: Folder Archive Section
**Objective**: Verify Archive section within folder sheet

**Steps**:
1. Open any folder with multiple form types
2. Create and edit forms to generate archived versions
3. Scroll to "Archive" section in folder sheet

**Expected Result**:
- ✅ Archive section shows all archived forms for current folder only
- ✅ Forms from other folders not displayed
- ✅ Archive items filtered by `folderKey`
- ✅ Loading state shown while queries pending
- ✅ Empty state if no archived items

---

### Test 5.2: Real-Time Updates
**Objective**: Verify UI updates immediately after versioning operations

**Steps**:
1. Create a form
2. Immediately edit it
3. Observe UI updates

**Expected Result**:
- ✅ New version appears in Files section without page reload
- ✅ Previous version moves to Archive without manual refresh
- ✅ Queries re-execute automatically via Convex reactivity

---

### Test 5.3: Multiple Users Editing Same Form
**Objective**: Verify concurrent edit handling

**Steps**:
1. User A creates form v1
2. User B edits to create v2
3. User A edits (from their cached v1) to create v3
4. Both users refresh

**Expected Result**:
- ✅ Latest version by `_creationTime` appears in Files (likely v3)
- ✅ Both v2 and v1 in Archive
- ✅ No data loss
- ✅ Versions sorted correctly by timestamp

---

### Test 5.4: PDF Generation for Versions
**Objective**: Verify PDF generation works for all versions

**Steps**:
1. Create form v1, wait for PDF generation
2. Edit to create v2, wait for PDF generation
3. Download PDF from v2 (Files section)
4. Download PDF from v1 (Archive section)

**Expected Result**:
- ✅ v2 PDF contains updated data
- ✅ v1 PDF contains original data
- ✅ PDFs distinct and correctly versioned
- ✅ "PDF will be ready shortly" message during generation
- ✅ Download button disabled during generation

---

## Test Suite 6: Data Integrity

### Test 6.1: Form Data Preservation
**Objective**: Verify archived forms retain original data

**Steps**:
1. Create form with specific test values (e.g., Name: "Test A", Score: 5)
2. Edit form to different values (Name: "Test B", Score: 10)
3. View archived v1

**Expected Result**:
- ✅ Archived v1 shows original values (Name: "Test A", Score: 5)
- ✅ Latest v2 shows updated values (Name: "Test B", Score: 10)
- ✅ No data corruption
- ✅ All fields preserved exactly

---

### Test 6.2: Timestamp Accuracy
**Objective**: Verify timestamps are correct

**Steps**:
1. Note system time
2. Create form
3. Wait 5 minutes
4. Edit form
5. Check timestamps

**Expected Result**:
- ✅ v1 timestamp matches creation time
- ✅ v2 timestamp matches edit time
- ✅ Archive sorting reflects actual chronological order
- ✅ Timestamps displayed in correct timezone (UK)

---

### Test 6.3: Version Chain for Care Plans
**Objective**: Verify `previousCarePlanId` chain is correct

**Steps**:
1. Create care plan v1 (inspect database if possible)
2. Edit to create v2
3. Edit to create v3
4. Verify database records

**Expected Result**:
- ✅ v1: `previousCarePlanId` = null
- ✅ v2: `previousCarePlanId` = v1's ID
- ✅ v3: `previousCarePlanId` = v2's ID
- ✅ Chain unbroken

---

## Test Suite 7: UI/UX Tests

### Test 7.1: Loading States
**Objective**: Verify loading indicators work correctly

**Steps**:
1. Navigate to folder sheet
2. Observe loading states for:
   - Files section
   - Archive section
   - Archive pages

**Expected Result**:
- ✅ Spinner shown during query execution
- ✅ "Loading form data..." message displayed
- ✅ No flash of empty content
- ✅ Smooth transition to loaded state

---

### Test 7.2: Empty States
**Objective**: Verify empty state messages are helpful

**Steps**:
1. Open folder with no forms
2. Check Files section
3. Check Archive section
4. Visit archive pages with no data

**Expected Result**:
- ✅ Files: "No PDF files available. Complete and submit forms to generate PDFs, or upload custom files."
- ✅ Archive: "No archived assessments yet. Edit and submit forms to archive previous versions."
- ✅ Archive page: "No archived assessments found. When an assessment is updated, the previous version will appear here."

---

### Test 7.3: Action Button Availability
**Objective**: Verify correct actions available in each context

**Steps**:
1. Check Files section item
2. Check Archive section item
3. Check archived risk assessments page item

**Expected Result**:

| Location | View | Edit | Delete | Download | Evaluate |
|----------|------|------|--------|----------|----------|
| Files Section (Form) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Files Section (Care Plan) | ✅ | ❌ | ✅ | ✅ | ✅ |
| Archive Section (Form) | ✅ | ❌ | ✅ | ✅ | ❌ |
| Archive Section (Care Plan) | ✅ | ❌ | ✅ | ✅ | ❌ |
| Archive Page (Form) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Archive Page (Care Plan) | ✅ | ❌ | ❌ | ❌ | ❌ |

---

### Test 7.4: Category and Folder Badges
**Objective**: Verify badges display correctly

**Steps**:
1. View archived risk assessments page
2. Check category badge colors

**Expected Result**:
- ✅ Pre-Admission: Blue
- ✅ Admission: Green
- ✅ Consent: Purple
- ✅ Medical: Red
- ✅ Emergency: Orange
- ✅ Care Assessment: Cyan
- ✅ Personal: Pink
- ✅ Clinical: Indigo
- ✅ Property: Amber
- ✅ Handling: Teal
- ✅ **Medication: Rose** *(New)*
- ✅ **Nutrition: Lime** *(New)*
- ✅ **Psychological: Violet** *(New)*
- ✅ **Capacity: Fuchsia** *(New)*
- ✅ **Infection Control: Sky** *(New)*
- ✅ **Continence: Emerald** *(New)*
- ✅ **Moving & Handling: Teal** *(New)*
- ✅ **Risk Assessment: Red** *(New)*
- ✅ **Fall Risk: Orange** *(New)*

---

## Test Suite 8: Performance Tests

### Test 8.1: Large Number of Versions
**Objective**: Verify system handles many versions

**Steps**:
1. Create a form
2. Edit it 50 times (51 total versions)
3. Check Files and Archive sections
4. Navigate to archive page

**Expected Result**:
- ✅ Files section shows only v51
- ✅ Archive section shows 50 items
- ✅ Archive page loads all versions
- ✅ No performance degradation
- ✅ Sorting remains correct

---

### Test 8.2: Multiple Residents with Many Forms
**Objective**: Verify queries filter by resident correctly

**Steps**:
1. Create 5 residents
2. For each resident, create and edit 10 different forms (2-3 times each)
3. Navigate to Resident 1's archive page
4. Navigate to Resident 2's archive page

**Expected Result**:
- ✅ Each resident's archive page shows only their archived forms
- ✅ No data leakage between residents
- ✅ Query performance acceptable (<2s load time)

---

## Test Suite 9: Error Handling

### Test 9.1: Network Failure During Edit
**Objective**: Verify graceful handling of network issues

**Steps**:
1. Create form v1
2. Start editing to create v2
3. Disconnect network before submit
4. Submit form

**Expected Result**:
- ✅ Error message displayed
- ✅ Form data preserved in browser
- ✅ User can retry after reconnection
- ✅ No duplicate versions created

---

### Test 9.2: Deleting Non-Existent Version
**Objective**: Verify error handling for deleted records

**Steps**:
1. Open folder in two browser tabs
2. In Tab 1, delete a form
3. In Tab 2, attempt to delete the same form

**Expected Result**:
- ✅ Tab 2 shows error message
- ✅ UI updates to reflect deletion
- ✅ No crash or console errors

---

## Test Suite 10: Regression Tests

### Test 10.1: Pre-Fix Behavior for Missing Forms
**Objective**: Verify forms previously missing from archive page now appear

**Test Data**: Before the fix, these 11 forms were NOT on archive page:
1. Oral Assessment
2. Diet Notification
3. Choking Risk Assessment
4. Cornell Depression Scale
5. Best Interest Decision
6. Infection Prevention
7. Bladder & Bowel
8. Moving & Handling
9. Bedrail Consent
10. Bed Rails Risk Assessment
11. Long-term Fall Risk

**Steps**:
1. Create and edit each of the 11 forms above
2. Navigate to archived risk assessments page
3. Search/filter for each form type

**Expected Result**:
- ✅ ALL 11 forms now appear on archive page
- ✅ No "404" or missing query errors
- ✅ Forms display correct folder and category

---

### Test 10.2: Delete Warning Previously Not Shown
**Objective**: Verify new delete warning appears

**Steps**:
1. Create form with 3 versions
2. Attempt to delete latest version
3. Observe dialog

**Expected Result**:
- ✅ Orange warning message displayed (new behavior)
- ✅ Detailed explanation provided (new behavior)
- ✅ User can proceed with awareness
- ✅ No silent data loss

---

## Test Reporting Template

For each test, record:
- **Test ID**: (e.g., Test 1.1)
- **Date**:
- **Tester**:
- **Result**: ✅ Pass / ❌ Fail / ⚠️ Partial
- **Notes**: (any issues, observations, or deviations)
- **Screenshot**: (if failure)

---

## Summary Checklist

After completing all tests, verify:
- [ ] All 23 form types support versioning
- [ ] All 23 form types appear on archived risk assessments page
- [ ] Care plans version correctly per folder
- [ ] Archive pages display all versions across all folders
- [ ] Delete warning appears when deleting latest version with archived versions
- [ ] Files section shows only latest version
- [ ] Archive sections show all previous versions
- [ ] PDF generation works for all versions
- [ ] Real-time UI updates work
- [ ] No data loss occurs in any scenario
- [ ] Performance acceptable with many versions
- [ ] Error handling graceful

---

## Known Limitations (Documented)

1. **Latest Version Deletion**: When deleting the latest version, the previous version is NOT automatically promoted to the Files section. It remains in the Archive section. Users are warned about this via the enhanced delete dialog.

2. **No Restore Function**: Once deleted, forms cannot be restored. This is by design but may be enhanced in future.

3. **No Version Comparison**: UI does not currently show visual diffs between versions.

4. **Implicit Archiving**: Versioning relies on `_creationTime` sorting rather than explicit `isArchived` flag. This works correctly in normal operations but could be vulnerable to system time issues.

---

## Test Execution Summary

**Total Tests**: 50+ individual test cases across 10 test suites

**Critical Tests** (must pass for production):
- Test 1.4: All 23 form types versioning
- Test 3.2: All 23 types on archive page
- Test 4.1: Delete warning for latest version
- Test 6.1: Form data preservation
- Test 8.2: Multi-resident data isolation

**Recommended Test Frequency**:
- Before each release: Full suite
- After bug fixes: Relevant test suites + regression tests
- Weekly: Smoke tests (Suites 1, 2, 3)

---

**Document Version**: 1.0
**Last Updated**: January 6, 2026
**Prepared By**: QA Testing - Care File Versioning Enhancement
