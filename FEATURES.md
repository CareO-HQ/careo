# CareO Care File Forms - Complete Feature List

## Overview

CareO provides a comprehensive digital care file management system with 46 care forms organized across 18 functional categories. This document outlines all implemented and planned forms.

**Status**: 29 forms implemented, 17 in development

---

## Implemented Forms (29)

### Pre-Admission & Admission (4 forms)

#### 1. Pre-Admission Assessment Form
- **Key**: `preAdmission-form`
- **Component**: `PreAdmissionDialog.tsx`
- **Purpose**: Initial resident assessment before admission
- **Status**: ✅ Implemented

#### 2. Infection Prevention Control
- **Key**: `infection-prevention`
- **Component**: `InfectionPreventionDialog.tsx`
- **Purpose**: COVID-19 and infection control protocols
- **Status**: ✅ Implemented

#### 3. Admission Assessment
- **Key**: `admission-form`
- **Component**: `AdmissionDialog.tsx`
- **Purpose**: Comprehensive resident admission documentation
- **Status**: ✅ Implemented

#### 4. Photography Consent
- **Key**: `photography-consent`
- **Component**: `PhotographyConsentDialog.tsx`
- **Purpose**: Photo/video consent for care documentation and marketing
- **Status**: ✅ Implemented

---

### Care Planning & Decision Making (2 forms)

#### 5. Care Plan
- **Key**: `care-plan-form`
- **Component**: `CarePlanDialog.tsx`
- **Purpose**: Individualized care planning with evaluation support
- **Features**: Supports care plan evaluations
- **Status**: ✅ Implemented

#### 6. Best Interest Decision
- **Key**: `best-interest-decision-form`
- **Component**: `BestInterestDecisionDialog.tsx`
- **Purpose**: Mental Capacity Act best interest decision documentation
- **Status**: ✅ Implemented

---

### End of Life Care (1 form)

#### 7. DNACPR Form
- **Key**: `dnacpr`
- **Component**: `DnarcpDialog.tsx`
- **Purpose**: Do Not Attempt Cardiopulmonary Resuscitation documentation
- **Compliance**: NHS DNACPR standards
- **Status**: ✅ Implemented

---

### Emergency Planning (1 form)

#### 8. PEEP (Personal Emergency Evacuation Plan)
- **Key**: `peep`
- **Component**: `PeepDialog.tsx`
- **Purpose**: Fire safety and emergency evacuation planning
- **Status**: ✅ Implemented

---

### Dependency & Activity Management (2 forms)

#### 9. Dependency Assessment
- **Key**: `dependency-assessment`
- **Component**: `DependencyAssessmentDialog.tsx`
- **Purpose**: Care dependency level evaluation
- **Status**: ✅ Implemented

#### 10. This Is My Life
- **Key**: `timl`
- **Component**: `TimlDialog.tsx`
- **Purpose**: Person-centered life story and preferences
- **Status**: ✅ Implemented

---

### Mobility & Fall Risk Management (6 forms)

#### 11. Moving & Handling Assessment
- **Key**: `moving-handling-form`
- **Component**: `MovingHandlingDialog.tsx`
- **Purpose**: Manual handling and mobility assessment
- **Status**: ✅ Implemented

#### 12. Long Term Fall Risk Assessment
- **Key**: `long-term-fall-risk-form`
- **Component**: `LongTermFallRiskDialog.tsx`
- **Purpose**: Ongoing fall risk monitoring
- **Status**: ✅ Implemented

#### 13. Fall Risk Assessment
- **Key**: `fall-risk-assessment`
- **Component**: `FallRiskAssessmentDialog.tsx`
- **Purpose**: Immediate fall risk evaluation
- **Status**: ✅ Implemented

#### 14. Resident Handling Profile
- **Key**: `resident-handling-profile-form`
- **Component**: `ResidentHandlingProfileDialog.tsx`
- **Purpose**: Individual handling requirements and equipment needs
- **Status**: ✅ Implemented

#### 15. Bedrail Consent
- **Key**: `bedrail-consent-form`
- **Component**: `BedrailConsentDialog.tsx`
- **Purpose**: Bedrail usage consent documentation
- **Status**: ✅ Implemented

#### 16. Bed Rails Risk Assessment
- **Key**: `bed-rails-risk-assessment-form`
- **Component**: `BedRailsRiskAssessmentDialog.tsx`
- **Purpose**: Risk assessment for bedrail use
- **Status**: ✅ Implemented

---

### Nutrition & Hydration (4 forms)

#### 17. Nutritional Assessment
- **Key**: `nutritional-assessment-form`
- **Component**: `NutritionalAssessmentDialog.tsx`
- **Purpose**: Comprehensive nutritional status evaluation
- **Status**: ✅ Implemented

#### 18. Oral Assessment
- **Key**: `oral-assessment-form`
- **Component**: `OralAssessmentDialog.tsx`
- **Purpose**: Oral health and dental care assessment
- **Status**: ✅ Implemented

#### 19. Diet Notification
- **Key**: `diet-notification-form`
- **Component**: `DietNotificationDialog.tsx`
- **Purpose**: Dietary requirements and modifications
- **Status**: ✅ Implemented

#### 20. Choking Risk Assessment
- **Key**: `choking-risk-assessment-form`
- **Component**: `ChokingRiskAssessmentDialog.tsx`
- **Purpose**: Swallowing safety and choking risk evaluation
- **Status**: ✅ Implemented

---

### Continence Management (1 form)

#### 21. Bladder & Bowel Continence Assessment
- **Key**: `blader-bowel-form`
- **Component**: `ContinenceDialog.tsx`
- **Purpose**: Continence assessment and management planning
- **Status**: ✅ Implemented

---

### Skin & Wound Care (2 forms)

#### 22. Skin Integrity / Tissue Viability Assessment
- **Key**: `skin-integrity-form`
- **Component**: `SkinIntegrityDialog.tsx`
- **Purpose**: Skin condition monitoring and pressure ulcer prevention
- **Status**: ✅ Implemented

#### 23. Braden Risk Assessment
- **Key**: `braden-risk-assessment-form`
- **Component**: `BradenRiskAssessmentDialog.tsx`
- **Purpose**: Pressure ulcer risk scoring using Braden Scale
- **Compliance**: Clinical standard assessment tool
- **Status**: ✅ Implemented

---

### Medication & Pain Management (1 form)

#### 24. Pain Assessment
- **Key**: `pain-assessment-form`
- **Component**: `PainAssessmentDialog.tsx`
- **Purpose**: Pain level evaluation and management
- **Status**: ✅ Implemented

---

### Psychological & Mental Health (1 form)

#### 25. Cornell Scale for Depression in Dementia
- **Key**: `cornell-depression-scale-form`
- **Component**: `CornellDepressionScaleDialog.tsx`
- **Purpose**: Depression screening for residents with dementia
- **Compliance**: Validated clinical assessment tool
- **Status**: ✅ Implemented

---

### Personal Property & Valuables (1 form)

#### 26. Resident Valuables and Personal Property
- **Key**: `resident-valuables-form`
- **Component**: `ResidentValuables.tsx`
- **Purpose**: Documentation of personal belongings and valuables
- **Status**: ✅ Implemented

---

### Safety & Restraints (2 forms)

#### 27. Restraints Consent & Risk Assessment
- **Key**: `v2-restraints-risk`
- **Component**: `RestraintsConsentDialog.tsx`
- **Purpose**: Physical restraint assessment and consent
- **Compliance**: Mental Capacity Act compliance
- **Status**: ✅ Implemented

#### 28. Smoking Risk Assessment
- **Key**: `smoking-risk-assessment`
- **Component**: `SmokingRiskAssessmentDialog.tsx`
- **Purpose**: Fire safety assessment for smoking residents
- **Status**: ✅ Implemented

---

### Specimen & Lab Records (1 form)

#### 29. Specimen Record Log
- **Key**: `v2-specimen-log`
- **Component**: `SpecimenRecordLogDialog.tsx`
- **Purpose**: Laboratory specimen tracking and documentation
- **Status**: ✅ Implemented

---

## Coming Soon Forms (17)

### Admission Section (2 forms)

#### 30. Capacity and Consent
- **Key**: `v2-capacity-consent`
- **Category**: V2 Admission
- **Purpose**: Mental capacity assessment and consent documentation
- **Status**: 🚧 Coming Soon

#### 31. Night Observation Consent
- **Key**: `v2-night-obs-consent`
- **Category**: V2 Admission
- **Purpose**: Consent for overnight monitoring and observation
- **Status**: 🚧 Coming Soon

---

### Safe Environment / Risk Management (1 form)

#### 32. General Risk Assessment
- **Key**: `v2-general-risk`
- **Category**: Maintaining a Safe Environment
- **Purpose**: Comprehensive environmental and personal risk assessment
- **Status**: 🚧 Coming Soon

---

### Social & Life Story (2 forms)

#### 33. Social Assessment
- **Key**: `v2-social-assessment`
- **Category**: This Is My Life
- **Purpose**: Social relationships and community connections
- **Status**: 🚧 Coming Soon

#### 34. Life Story Workbook
- **Key**: `v2-life-story`
- **Category**: This Is My Life
- **Purpose**: Detailed biographical and life history documentation
- **Status**: 🚧 Coming Soon

---

### Medication (1 form)

#### 35. Abbey Pain Tool
- **Key**: `v2-abbey-pain`
- **Category**: Medication
- **Purpose**: Pain assessment for residents with advanced dementia
- **Notes**: Alternative to standard pain assessment for non-verbal residents
- **Status**: 🚧 Coming Soon

---

### Nutrition & Hydration (2 forms)

#### 36. MUST Assessment
- **Key**: `v2-must-assessment`
- **Category**: Nutrition and Hydration
- **Purpose**: Malnutrition Universal Screening Tool
- **Compliance**: BAPEN clinical standard
- **Status**: 🚧 Coming Soon

#### 37. Weight Chart
- **Key**: `v2-weight-chart`
- **Category**: Nutrition and Hydration
- **Purpose**: Weight monitoring and trend tracking
- **Status**: 🚧 Coming Soon

---

### Personal Hygiene & Dressing (2 forms)

#### 38. Body Map (Hygiene Monthly Reassessment)
- **Key**: `v2-body-map-hygiene`
- **Category**: Personal Hygiene and Dressing
- **Purpose**: Visual documentation of skin condition during hygiene care
- **Status**: 🚧 Coming Soon

#### 39. Skin Integrity / Dermatology Assessment
- **Key**: `v2-skin-dermatology`
- **Category**: Personal Hygiene and Dressing
- **Purpose**: Detailed dermatological assessment and skin conditions
- **Status**: 🚧 Coming Soon

---

### Skin Integrity / Tissue Viability (2 forms)

#### 40. Body Map (Skin)
- **Key**: `v2-body-map-skin`
- **Category**: Skin Integrity / Tissue Viability
- **Purpose**: Visual documentation of wounds, bruises, and skin abnormalities
- **Status**: 🚧 Coming Soon

#### 41. Wound Assessment
- **Key**: `v2-wound-assessment`
- **Category**: Skin Integrity / Tissue Viability
- **Purpose**: Detailed wound measurement and healing progress tracking
- **Status**: 🚧 Coming Soon

---

### Confidential Records (1 form)

#### 42. Confidential Documents Upload
- **Key**: `v2-confidential-upload`
- **Type**: Document Upload
- **Category**: Confidential Records
- **Purpose**: Secure storage for sensitive resident documents
- **Status**: 🚧 Coming Soon

---

### Safeguarding & DoLS (3 forms)

#### 43. Safeguarding Risk Assessment
- **Key**: `v2-safe-risk`
- **Category**: Safeguarding & DoLS
- **Purpose**: Assessment of safeguarding concerns and vulnerabilities
- **Status**: 🚧 Coming Soon

#### 44. Safeguarding Body Map
- **Key**: `v2-safe-body-map`
- **Category**: Safeguarding & DoLS
- **Purpose**: Visual documentation for safeguarding investigations
- **Status**: 🚧 Coming Soon

#### 45. DoLS Application Form
- **Key**: `v2-dols-app`
- **Category**: Safeguarding & DoLS
- **Purpose**: Deprivation of Liberty Safeguards application
- **Compliance**: Mental Capacity Act / Liberty Protection Safeguards
- **Status**: 🚧 Coming Soon

---

### Key Worker Reporting (1 form)

#### 46. Monthly Care Assistant Report
- **Key**: `v2-assist-report`
- **Category**: Key Worker Diary
- **Purpose**: Monthly care staff reporting and observations
- **Status**: 🚧 Coming Soon

---

## Technical Implementation

### Form Architecture

**Configuration**: `/config.ts` (Lines 221-540)
- V1 Configuration: 17 folders (legacy structure)
- V2 Configuration: 18 folders (current structure)

**Dialog Components**: `/components/residents/carefile/dialogs/`
- 29 implemented dialog components
- Central renderer: `CareFileDialogRenderer.tsx`

**Validation Schemas**: `/schemas/residents/care-file/`
- Zod validation for all implemented forms
- Type-safe form validation

**Routing**:
- V1 Route: `/dashboard/residents/[id]/care-file/[folderKey]`
- V2 Route: `/dashboard/residents/[id]/care-file-v2/[folderKey]`

### Database Integration

**Table Mapping**: All 29 implemented forms have corresponding Supabase tables
- Automatic form-to-table mapping via `TABLE_MAP`
- Real-time data synchronization with Convex
- Audit trail for all form submissions

### Coming Soon Handling

When users attempt to access coming soon forms:
```typescript
if (v2Form?.isComingSoon) {
    toast.info("Coming Soon", {
        description: "This form is currently being developed."
    });
    return;
}
```

---

## Form Categories (V2 Structure)

1. **V2 Pre-Admission** - Initial assessments before resident admission
2. **V2 Admission** - Admission documentation and consents
3. **V2 Safe Environment** - Environmental and safety risk assessments
4. **V2 Dependency** - Care dependency evaluations
5. **V2 My Life** - Person-centered care and life story
6. **V2 Medication** - Pain and medication management
7. **V2 Mobility** - Movement, handling, and fall prevention
8. **V2 Nutrition Hydration** - Nutrition, diet, and swallowing assessments
9. **V2 Incontinence** - Bladder and bowel management
10. **V2 Hygiene** - Personal care and hygiene assessments
11. **V2 Skin Integrity** - Pressure ulcer prevention and wound care
12. **V2 Additional CP** - Additional care planning documentation
13. **V2 Psychological** - Mental health and emotional wellbeing
14. **V2 Valuables** - Personal property management
15. **V2 Specimens** - Laboratory specimen tracking
16. **V2 Confidential** - Secure document storage
17. **V2 Safeguarding** - Safeguarding and DoLS applications
18. **V2 Key Worker** - Staff reporting and observations

---

## Compliance Standards

### UK Healthcare Regulations
- **CQC Compliance**: All forms designed to meet Care Quality Commission standards
- **NHS Standards**: DNACPR, specimen tracking, and clinical assessments
- **Mental Capacity Act**: Consent, capacity, DoLS, and best interest forms
- **NICE Guidelines**: Braden Scale, MUST assessment, Cornell Scale

### Data Protection
- **GDPR Compliant**: Secure form data storage and processing
- **Audit Trails**: Complete change tracking for all form submissions
- **Access Control**: Role-based permissions for form access

### Clinical Validation
- **Standardized Tools**: Braden Scale, Cornell Scale, MUST, Abbey Pain Tool
- **Evidence-Based**: Forms based on clinical best practices
- **Regular Review**: Forms support periodic reassessment requirements

---

## Summary Statistics

- **Total Forms**: 46
- **Implemented**: 29 (63%)
- **In Development**: 17 (37%)
- **Form Categories**: 18
- **Dialog Components**: 29
- **Validation Schemas**: 30+
- **Database Tables**: 29

---

**Last Updated**: March 9, 2026
**Configuration File**: `config.ts`
**Component Location**: `components/residents/carefile/dialogs/`
**Schema Location**: `schemas/residents/care-file/`
