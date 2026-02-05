# Moving and Handling Assessment Setup Guide

This guide covers the setup and configuration for the Moving and Handling Assessment feature, including form submission, data storage, and PDF generation.

## Overview

The Moving and Handling Assessment feature consists of:
- A multi-step form dialog for collecting assessment data
- Next.js server actions for storing assessments in the Supabase database
- PDF generation API for creating downloadable assessment reports
- PDF download functionality

## Files Created/Modified

### Backend (Supabase)
- Database table: `moving_handling_assessments` - Stores assessment data in PostgreSQL
- Server actions: Functions in `app/actions/` or API routes for CRUD operations

### API Endpoints
- `app/api/pdf/moving-handling/route.ts` - PDF generation endpoint

### Frontend Components
- `components/residents/carefile/dialogs/MovingHandlingDialog.tsx` - Updated to use Supabase server actions
- `schemas/residents/care-file/movingHandlingSchema.ts` - Form validation schema (already existed)

### Dependencies
- `package.json` - Added Puppeteer for PDF generation

## Available Functions

### Server Actions / API Routes
- `submitMovingHandlingAssessment` - Create new assessment
- `updateMovingHandlingAssessment` - Update existing assessment (for drafts)
- `deleteMovingHandlingAssessment` - Delete an assessment

### Data Fetching
- `getMovingHandlingAssessment` - Get single assessment by ID (via Supabase query)
- `getMovingHandlingAssessmentsByResident` - Get all assessments for a resident (via Supabase query)
- `hasMovingHandlingAssessment` - Check if resident has any assessments (via Supabase query)
- `getPDFUrl` - Get download URL for assessment PDF (from Supabase Storage)

### Background Processing
- PDF generation runs via Next.js API routes after form submission
- PDF file ID is stored in the assessment record in Supabase

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

The Puppeteer dependency has been added to package.json for PDF generation.

### 2. Environment Variables

Add these environment variables to your `.env.local` file:

```env
# PDF Generation (optional)
PDF_API_URL=https://your-domain.com
PDF_API_TOKEN=your-optional-bearer-token
```

- `PDF_API_URL`: The base URL of your application for PDF generation
- `PDF_API_TOKEN`: Optional bearer token for authentication

### 3. Database Schema

The `moving_handling_assessments` table should be created in Supabase PostgreSQL. Ensure your database migrations are up to date:

```bash
# Run Supabase migrations if using Supabase CLI
supabase db push

# Or apply migrations manually via Supabase Dashboard
```

### 4. PDF Generation Setup

#### Option A: Use Puppeteer (Recommended)
The API endpoint is already configured to use Puppeteer. For production deployment, ensure your hosting platform supports Puppeteer:

**Vercel:**
```json
// package.json
{
  "devDependencies": {
    "@types/node": "^20"
  }
}
```

**Railway/Docker:**
```dockerfile
# Add to Dockerfile if using custom container
RUN apt-get update && apt-get install -y \
    chromium-browser \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

#### Option B: Alternative PDF Libraries
If Puppeteer doesn't work in your environment, you can replace the `generatePDFFromHTML` function with:
- jsPDF (client-side)
- react-pdf (React-based)
- External services (PDFShift, HTMLPDFapi, etc.)

## Usage Examples

### Frontend Usage

```tsx
import { createClient } from "@/lib/supabase/client";
import { submitMovingHandlingAssessment } from "@/app/actions/moving-handling";

// Submit new assessment
const handleSubmit = async (data: MovingHandlingData) => {
  await submitMovingHandlingAssessment(data);
};

// Get assessments for a resident
const supabase = createClient();
const { data: assessments } = await supabase
  .from("moving_handling_assessments")
  .select("*")
  .eq("resident_id", residentId);

// Get PDF download URL from Supabase Storage
const { data: pdfData } = await supabase.storage
  .from("assessments")
  .createSignedUrl(`moving-handling/${assessmentId}.pdf`, 3600);
```

### API Usage

```javascript
// Generate PDF directly
const response = await fetch('/api/pdf/moving-handling', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ assessmentId: 'assessment_id_here' })
});

const pdfBlob = await response.blob();
```

## Data Structure

### Assessment Fields

The moving handling assessment includes:

**Section 1: Resident Information**
- residentName, dateOfBirth, bedroomNumber
- weight, height, historyOfFalls

**Section 2: Mobility Assessment**
- independentMobility, canWeightBear
- limbUpperRight/Left, limbLowerRight/Left
- equipmentUsed, needsRiskStaff

**Section 3-6: Risk Factors**
- Various risk states (ALWAYS/SOMETIMES/NEVER)
- Comments for each risk factor

**Section 7: Assessment Completion**
- completedBy, jobRole, signature, completionDate

### Risk State Options
- `ALWAYS` - High risk
- `SOMETIMES` - Medium risk  
- `NEVER` - Low/No risk

### Weight Bearing Capacity Options
- `FULLY` - Can bear full weight
- `PARTIALLY` - Limited weight bearing
- `WITH-AID` - Requires assistance
- `NO-WEIGHTBEARING` - Cannot bear weight

### Limb Mobility Options
- `FULLY` - Full mobility
- `PARTIALLY` - Limited mobility
- `NONE` - No mobility

## PDF Features

The generated PDF includes:
- Professional styling with color-coded risk levels
- Complete assessment data in organized sections
- Resident information and assessment metadata
- Signature and completion details
- Print-optimized layout

### PDF Styling
- High risk (ALWAYS): Red background
- Medium risk (SOMETIMES): Yellow background
- Low risk (NEVER): Green background

## Troubleshooting

### PDF Generation Issues

1. **Puppeteer fails to launch:**
   - Check if Chrome/Chromium is available in your environment
   - Add additional Puppeteer args for your deployment platform

2. **Memory issues:**
   - Increase memory allocation for your deployment
   - Consider using a PDF generation service instead

3. **Timeout errors:**
   - Increase timeout in Puppeteer configuration
   - Optimize HTML complexity

### Database Issues

1. **Schema mismatch:**
   - Ensure Supabase migrations are applied
   - Check all field types match the PostgreSQL schema
   - Verify RLS policies are correctly configured

2. **Permission errors:**
   - Verify user authentication in server actions
   - Check RLS policies for team/organization permissions
   - Ensure user has proper role and active organization/team set

## Security Considerations

- All mutations verify user authentication
- Resident data access is validated
- PDF generation respects data privacy
- Optional bearer token authentication for PDF API

## Performance Notes

- PDF generation runs in background after form submission
- Large assessments may take a few seconds to generate PDFs
- Consider implementing loading states for PDF downloads
- Background PDF generation prevents form submission delays

## Future Enhancements

Potential improvements:
- Bulk PDF generation for multiple assessments
- Assessment comparison features
- Risk scoring algorithms
- Integration with care planning systems
- Mobile-optimized PDF layouts
