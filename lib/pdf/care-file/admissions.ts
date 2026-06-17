import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { drawHeader, addSectionTitle, addField, ensureSpace, GenerateCareFilePDFOptions, PDFContext, formatValue } from "./helpers";

export const generateAdmissionsPDF = async (options: GenerateCareFilePDFOptions) => {
    const { formName, data, resident, orgLogoUrl, careHomeName } = options;
    const upperFormName = formName.toUpperCase();

    const isDependencyAssessment = upperFormName.includes("DEPENDENCY ASSESSMENT");
    const isFallRiskAssessment = upperFormName.includes("FALL RISK ASSESSMENT");
    const isSpecimenLog = upperFormName.includes("SPECIMEN RECORD LOG") || formName.includes("v2-specimen-log");
    const isKeyWorkerDiaryPdf = upperFormName.includes("KEY WORKER DIARY");
    const isProgressNotesPdf = formName === "Progress Notes";

    const doc = new jsPDF({
        orientation:
            isDependencyAssessment ||
            isFallRiskAssessment ||
            isSpecimenLog ||
            isKeyWorkerDiaryPdf ||
            isProgressNotesPdf
                ? "landscape"
                : "portrait",
    });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    const loadOrgLogoForPdf = async (url: string) => {
        const { loadOrgLogoForPdf: loadLogo } = await import("./helpers");
        return loadLogo(url);
    };

    const resolvedOrgLogo = orgLogoUrl ? await loadOrgLogoForPdf(orgLogoUrl) : null;

    const ctx: PDFContext = {
        doc,
        formName,
        data,
        resident,
        orgLogoUrl,
        careHomeName,
        pageWidth,
        margin,
        resolvedOrgLogo
    };

    let yPos = 30;
    await drawHeader(ctx);

    const cpWidth = (pageWidth - margin * 2) / 2 - 5;
    const cpCol2 = margin + (pageWidth - margin * 2) / 2;
    const col2 = cpCol2; // alias for compatibility
    const assessmentDataForSpecialized = data.assessment_details || data.assessmentDetails || data.assessment_data || data;

    // --- Pre-Admission Assessment Form Specialized Layout ---
    if (upperFormName.includes("PRE-ADMISSION ASSESSMENT FORM")) {
        const assessmentData = assessmentDataForSpecialized;

        const drawPreAdmissionHeader = async () => {
            await drawHeader(ctx);
        };

        const ensurePreAdmissionSpace = async (heightNeeded: number, currentY: number) => {
            return ensureSpace(ctx, heightNeeded, currentY);
        };

        // 1. Administrative Details
        yPos = await addSectionTitle(ctx, "ADMINISTRATIVE DETAILS", yPos);
        yPos = await ensurePreAdmissionSpace(40, yPos);
        const rowAdminY = yPos;
        let yAdmin1 = await addField(ctx, "Care Home Name", assessmentData.careHomeName || data.care_home_name || careHomeName || "N/A", margin, rowAdminY, cpWidth, true);
        yAdmin1 = await addField(ctx, "Assessing Worker", assessmentData.userName || "N/A", margin, yAdmin1 + 1, cpWidth, true);

        let yAdmin2 = await addField(ctx, "NHS Number", assessmentData.nhsHealthCareNumber || data.nhs_number || "N/A", cpCol2, rowAdminY, cpWidth, true);
        yAdmin2 = await addField(ctx, "Job Role", assessmentData.jobRole || "N/A", cpCol2, yAdmin2 + 1, cpWidth, true);

        yPos = Math.max(yAdmin1, yAdmin2);
        const aDate = assessmentData.date || data.date;
        yPos = await addField(ctx, "Assessment Date", aDate ? format(new Date(aDate), "dd/MM/yyyy") : "N/A", margin, yPos + 1, cpWidth);
        yPos = await addField(ctx, "Signature", assessmentData.signature || "N/A", margin, yPos + 1, cpWidth);

        // 2. Resident Information
        yPos = await addSectionTitle(ctx, "RESIDENT INFORMATION", yPos + 2);
        yPos = await ensurePreAdmissionSpace(40, yPos);
        const rowResY = yPos;
        let yRes1 = await addField(ctx, "Full Name", `${assessmentData.firstName || ""} ${assessmentData.lastName || ""}`.trim() || (resident ? `${resident.first_name} ${resident.last_name}` : "N/A"), margin, rowResY, cpWidth, true);
        const dobVal = assessmentData.dateOfBirth || (resident ? resident.date_of_birth : "");
        yRes1 = await addField(ctx, "Date of Birth", dobVal ? format(new Date(dobVal), "dd/MM/yyyy") : "N/A", margin, yRes1 + 1, cpWidth, true);
        yRes1 = await addField(ctx, "Gender", assessmentData.gender || "N/A", margin, yRes1 + 1, cpWidth, true);
        yRes1 = await addField(ctx, "Religion", assessmentData.religion || "N/A", margin, yRes1 + 1, cpWidth, true);

        let yRes2 = await addField(ctx, "Current Address", assessmentData.address || "N/A", cpCol2, rowResY, cpWidth, true);
        yRes2 = await addField(ctx, "Phone Number", assessmentData.phoneNumber || "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yRes2 = await addField(ctx, "Ethnicity", assessmentData.ethnicity || "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yPos = Math.max(yRes1, yRes2);

        // 3. Next of Kin
        yPos = await addSectionTitle(ctx, "NEXT OF KIN", yPos + 2);
        yPos = await ensurePreAdmissionSpace(25, yPos);
        const rowKinY = yPos;
        let yKin1 = await addField(ctx, "Name", `${assessmentData.kinFirstName || ""} ${assessmentData.kinLastName || ""}`.trim() || "N/A", margin, rowKinY, cpWidth, true);
        yKin1 = await addField(ctx, "Relationship", assessmentData.kinRelationship || "N/A", margin, yKin1 + 1, cpWidth, true);

        const yKin2 = await addField(ctx, "Phone Number", assessmentData.kinPhoneNumber || "N/A", cpCol2, rowKinY, cpWidth, true);
        yPos = Math.max(yKin1, yKin2);

        // 4. Professional Contacts
        yPos = await addSectionTitle(ctx, "PROFESSIONAL CONTACTS", yPos + 2);
        yPos = await ensurePreAdmissionSpace(40, yPos);
        const rowProfY = yPos;
        let yProf1 = await addField(ctx, "Care Manager", `${assessmentData.careManagerName || "N/A"} (${assessmentData.careManagerPhoneNumber || "N/A"})`, margin, rowProfY, cpWidth, true);
        yProf1 = await addField(ctx, "General Practitioner", `${assessmentData.generalPractitionerName || "N/A"} (${assessmentData.generalPractitionerPhoneNumber || "N/A"})`, margin, yProf1 + 1, cpWidth, true);

        let yProf2 = await addField(ctx, "District Nurse", `${assessmentData.districtNurseName || "N/A"} (${assessmentData.districtNursePhoneNumber || "N/A"})`, cpCol2, rowProfY, cpWidth, true);
        yProf2 = await addField(ctx, "Provider Healthcare Info", `${assessmentData.providerHealthcareInfoName || "N/A"} - ${assessmentData.providerHealthcareInfoDesignation || "N/A"}`, cpCol2, yProf2 + 1, cpWidth, true);
        yPos = Math.max(yProf1, yProf2);

        // 5. Medical Assessment
        yPos = await addSectionTitle(ctx, "MEDICAL ASSESSMENT", yPos + 2);
        yPos = await addField(ctx, "Known Allergies", assessmentData.allergies || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Medical History & Diagnoses", assessmentData.medicalHistory || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Medications Prescribed", assessmentData.medicationPrescribed || "N/A", margin, yPos, pageWidth - margin * 2);

        // 6. Activities of Daily Living
        yPos = await addSectionTitle(ctx, "ACTIVITIES OF DAILY LIVING", yPos + 2);
        const adlFields = [
            { label: "Consent, Capacity & Rights", value: assessmentData.consentCapacityRights },
            { label: "Medication", value: assessmentData.medication },
            { label: "Mobility", value: assessmentData.mobility },
            { label: "Nutrition", value: assessmentData.nutrition },
            { label: "Continence", value: assessmentData.continence },
            { label: "Hygiene & Dressing", value: assessmentData.hygieneDressing },
            { label: "Skin Integrity", value: assessmentData.skin },
            { label: "Cognition", value: assessmentData.cognition },
            { label: "Infection Control", value: assessmentData.infection },
            { label: "Breathing", value: assessmentData.breathing },
            { label: "Altered State of Consciousness", value: assessmentData.alteredStateOfConsciousness }
        ];

        for (const adl of adlFields) {
            yPos = await addField(ctx, adl.label, adl.value || "N/A", margin, yPos, pageWidth - margin * 2);
        }

        // 7. Legal & End of Life
        yPos = await addSectionTitle(ctx, "LEGAL & END OF LIFE", yPos + 2);
        yPos = await ensurePreAdmissionSpace(25, yPos);
        const rowLegalY = yPos;
        let yLegal1 = await addField(ctx, "DNACPR", assessmentData.dnacpr, margin, rowLegalY, cpWidth, true);
        yLegal1 = await addField(ctx, "Capacity Assessment", assessmentData.capacity, margin, yLegal1 + 1, cpWidth, true);

        let yLegal2 = await addField(ctx, "Advanced Decision", assessmentData.advancedDecision, cpCol2, rowLegalY, cpWidth, true);
        yLegal2 = await addField(ctx, "Advanced Care Plan", assessmentData.advancedCarePlan, cpCol2, yLegal2 + 1, cpWidth, true);
        yPos = Math.max(yLegal1, yLegal2);
        yPos = await addField(ctx, "Palliative Care Comments", assessmentData.comments || "N/A", margin, yPos, pageWidth - margin * 2);

        // 8. Resident Preferences
        yPos = await addSectionTitle(ctx, "RESIDENT PREFERENCES", yPos + 2);
        yPos = await addField(ctx, "Preferred Name", assessmentData.preferedName || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Room Preferences", assessmentData.roomPreferences || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Food Preferences", assessmentData.foodPreferences || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Admission Contact", assessmentData.admissionContact || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Family Concerns", assessmentData.familyConcerns || "N/A", margin, yPos, pageWidth - margin * 2);

        // 9. Other Information
        yPos = await addSectionTitle(ctx, "OTHER RELEVANT INFORMATION", yPos + 2);
        yPos = await addField(ctx, "Other Healthcare Professionals Involved", assessmentData.otherHealthCareProfessional || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Equipment Required", assessmentData.equipment || "N/A", margin, yPos, pageWidth - margin * 2);

        // 10. Financial & Additional
        yPos = await addSectionTitle(ctx, "FINANCIAL & FINAL DETAILS", yPos + 2);
        yPos = await addField(ctx, "Does anyone attend to finances?", assessmentData.attendFinances, margin, yPos, pageWidth - margin * 2);
        if (assessmentData.attendFinances) {
             yPos = await addField(ctx, "Finance Contact Name", assessmentData.financesName || "N/A", margin, yPos, pageWidth - margin * 2);
             yPos = await addField(ctx, "Finance Contact Number", assessmentData.financesContactNumber || "N/A", margin, yPos, pageWidth - margin * 2);
             yPos = await addField(ctx, "Finance Contact Address", assessmentData.financesAddress || "N/A", margin, yPos, pageWidth - margin * 2);
        }
        yPos = await addField(ctx, "Additional Considerations", assessmentData.additionalConsiderations || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "ASSESSMENT OUTCOME", assessmentData.outcome || "N/A", margin, yPos, pageWidth - margin * 2);
        const pDate = assessmentData.plannedAdmissionDate;
        yPos = await addField(ctx, "PLANNED ADMISSION DATE", pDate ? format(new Date(pDate), "dd/MM/yyyy") : "N/A", margin, yPos, pageWidth - margin * 2);

        doc.save(`Pre-Admission-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Photographic Consent Form Specialized Layout ---
    if (upperFormName.includes("PHOTOGRAPHIC CONSENT") || upperFormName.includes("PHOTOGRAPHY CONSENT")) {
        const assessmentData = assessmentDataForSpecialized;

        const drawPhotoHeader = async () => {
            await drawHeader(ctx);
        };

        const ensurePhotoSpace = async (heightNeeded: number, currentY: number) => {
            return ensureSpace(ctx, heightNeeded, currentY);
        };

        // 1. Resident Information
        yPos = await addSectionTitle(ctx, "RESIDENT INFORMATION", yPos);
        yPos = await ensurePhotoSpace(40, yPos);
        const rowResY = yPos;
        let yRes1 = await addField(ctx, "Resident Name", assessmentData.residentName || (resident ? `${resident.first_name} ${resident.last_name}` : "N/A"), margin, rowResY, cpWidth, true);
        const dobVal = assessmentData.dateOfBirth || (resident ? resident.date_of_birth : "");
        yRes1 = await addField(ctx, "Date of Birth", dobVal ? format(new Date(dobVal), "dd/MM/yyyy") : "N/A", margin, yRes1 + 1, cpWidth, true);

        const yRes2 = await addField(ctx, "Bedroom Number", assessmentData.bedroomNumber || (resident ? resident.room_number : "N/A"), cpCol2, rowResY, cpWidth, true);
        yPos = Math.max(yRes1, yRes2);

        // 2. Consent Permissions
        yPos = await addSectionTitle(ctx, "PHOTOGRAPHY AND IMAGE USE CONSENT", yPos + 2);
        
        const consents = [
            { 
                label: "Healthcare Records", 
                value: assessmentData.healthcareRecords,
                description: "Photography for medical documentation, wound care monitoring, and healthcare record purposes."
            },
            { 
                label: "Internal Social Activities", 
                value: assessmentData.socialActivitiesInternal,
                description: "Photography during internal activities, celebrations, and events for internal facility use only."
            },
            { 
                label: "External Social Activities & Marketing", 
                value: assessmentData.socialActivitiesExternal,
                description: "Photography for marketing materials, website, social media, newsletters, and promotional activities."
            }
        ];

        for (const consent of consents) {
            yPos = await addField(ctx, consent.label, consent.value ? "CONSENT GIVEN" : "CONSENT NOT GIVEN", margin, yPos, pageWidth - margin * 2);
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(107, 114, 128);
            const splitDesc = doc.splitTextToSize(consent.description, pageWidth - margin * 2);
            doc.text(splitDesc, margin, yPos);
            yPos += (splitDesc.length * 4) + 4;
        }

        // 3. Resident / Representative Signature
        yPos = await addSectionTitle(ctx, "SIGNATURES & AUTHORIZATION", yPos + 2);
        yPos = await ensurePhotoSpace(40, yPos);
        const rowSignY = yPos;
        
        const ySign1 = await addField(ctx, "Resident Signature", assessmentData.residentSignature || "N/A", margin, rowSignY, cpWidth, true);
        
        let ySign2 = await addField(ctx, "Representative Name", assessmentData.representativeName || "N/A", cpCol2, rowSignY, cpWidth, true);
        ySign2 = await addField(ctx, "Relationship to Resident", assessmentData.representativeRelationship || "N/A", cpCol2, ySign2 + 1, cpWidth, true);
        ySign2 = await addField(ctx, "Representative Signature", assessmentData.representativeSignature || "N/A", cpCol2, ySign2 + 1, cpWidth, true);
        ySign2 = await addField(ctx, "Date (Representative)", assessmentData.representativeDate ? format(new Date(assessmentData.representativeDate), "dd/MM/yyyy") : "N/A", cpCol2, ySign2 + 1, cpWidth, true);
        
        yPos = Math.max(ySign1, ySign2);

        // 4. Staff Verification
        yPos = await addSectionTitle(ctx, "STAFF VERIFICATION", yPos + 2);
        yPos = await ensurePhotoSpace(30, yPos);
        const rowStaffY = yPos;
        
        let yStaff1 = await addField(ctx, "Staff Name", assessmentData.nameStaff || "N/A", margin, rowStaffY, cpWidth, true);
        yStaff1 = await addField(ctx, "Staff Signature", assessmentData.staffSignature || "N/A", margin, yStaff1 + 1, cpWidth, true);
        
        const yStaff2 = await addField(ctx, "Date Completed", assessmentData.date ? format(new Date(assessmentData.date), "dd/MM/yyyy") : "N/A", cpCol2, rowStaffY, cpWidth, true);
        
        yPos = Math.max(yStaff1, yStaff2);

        doc.save(`Photographic-Consent-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Admission Assessment Specialized Layout ---
    if (upperFormName.includes("ADMISSION ASSESSMENT")) {
        const assessmentData = assessmentDataForSpecialized;

        const drawAdmissionHeader = async () => {
            await drawHeader(ctx);
        };

        const ensureAdmissionSpace = async (heightNeeded: number, currentY: number) => {
            return ensureSpace(ctx, heightNeeded, currentY);
        };

        // 1. Basic Information
        yPos = await addSectionTitle(ctx, "BASIC INFORMATION", yPos);
        yPos = await ensureAdmissionSpace(40, yPos);
        const rowBasicY = yPos;
        const fName = assessmentData.firstName || data.first_name || resident?.first_name || "";
        const lName = assessmentData.lastName || data.last_name || resident?.last_name || "";
        let yBasic1 = await addField(ctx, "Full Name", `${fName} ${lName}`.trim(), margin, rowBasicY, cpWidth, true);
        const dobValue = assessmentData.dateOfBirth || data.date_of_birth || resident?.date_of_birth;
        yBasic1 = await addField(ctx, "Date of Birth", dobValue ? format(new Date(dobValue), "dd/MM/yyyy") : "N/A", margin, yBasic1, cpWidth, true);
        yBasic1 = await addField(ctx, "Bedroom Number", assessmentData.bedroomNumber || resident?.room_number || "N/A", margin, yBasic1, cpWidth, true);
        yBasic1 = await addField(ctx, "NHS Number", assessmentData.NHSNumber || resident?.nhs_health_number || "N/A", margin, yBasic1, cpWidth, true);

        let yBasic2 = await addField(ctx, "Admitted From", assessmentData.admittedFrom || "N/A", cpCol2, rowBasicY, cpWidth, true);
        yBasic2 = await addField(ctx, "Gender", assessmentData.gender || "N/A", cpCol2, yBasic2, cpWidth, true);
        yBasic2 = await addField(ctx, "Religion", assessmentData.religion || "N/A", cpCol2, yBasic2, cpWidth, true);
        yBasic2 = await addField(ctx, "Telephone Number", assessmentData.telephoneNumber || "N/A", cpCol2, yBasic2, cpWidth, true);
        yPos = Math.max(yBasic1, yBasic2);
        yPos = await addField(ctx, "Ethnicity", assessmentData.ethnicity || "N/A", margin, yPos, pageWidth - margin * 2);

        // 2. Next of Kin
        yPos = await addSectionTitle(ctx, "NEXT OF KIN", yPos + 2);
        yPos = await ensureAdmissionSpace(30, yPos);
        const rowKinY = yPos;
        let yKin1 = await addField(ctx, "Name", `${assessmentData.kinFirstName || ""} ${assessmentData.kinLastName || ""}`.trim(), margin, rowKinY, cpWidth, true);
        yKin1 = await addField(ctx, "Relationship", assessmentData.kinRelationship || "N/A", margin, yKin1, cpWidth, true);
        yKin1 = await addField(ctx, "Email", assessmentData.kinEmail || "N/A", margin, yKin1, cpWidth, true);

        let yKin2 = await addField(ctx, "Telephone Number", assessmentData.kinTelephoneNumber || "N/A", cpCol2, rowKinY, cpWidth, true);
        yKin2 = await addField(ctx, "Address", assessmentData.kinAddress || "N/A", cpCol2, yKin2, cpWidth, true);
        yPos = Math.max(yKin1, yKin2);

        // 3. Emergency Contacts
        yPos = await addSectionTitle(ctx, "EMERGENCY CONTACTS", yPos + 2);
        yPos = await ensureAdmissionSpace(25, yPos);
        const rowEmY = yPos;
        let yEm1 = await addField(ctx, "Name", assessmentData.emergencyContactName || "N/A", margin, rowEmY, cpWidth, true);
        yEm1 = await addField(ctx, "Relationship", assessmentData.emergencyContactRelationship || "N/A", margin, yEm1, cpWidth, true);

        let yEm2 = await addField(ctx, "Phone", assessmentData.emergencyContactTelephoneNumber || "N/A", cpCol2, rowEmY, cpWidth, true);
        yEm2 = await addField(ctx, "Alt. Phone", assessmentData.emergencyContactPhoneNumber || "N/A", cpCol2, yEm2, cpWidth, true);
        yPos = Math.max(yEm1, yEm2);

        // 4. Professional Contacts
        yPos = await addSectionTitle(ctx, "PROFESSIONAL CONTACTS", yPos + 2);
        yPos = await ensureAdmissionSpace(50, yPos);
        const rowProfY = yPos;
        let yProf1 = await addField(ctx, "Care Manager Name", assessmentData.careManagerName || "N/A", margin, rowProfY, cpWidth, true);
        yProf1 = await addField(ctx, "Care Manager Role", assessmentData.careManagerJobRole || "N/A", margin, yProf1, cpWidth, true);
        yProf1 = await addField(ctx, "Care Manager Email", assessmentData.careManagerEmail || "N/A", margin, yProf1, cpWidth, true);
        yProf1 = await addField(ctx, "Care Manager Addr", assessmentData.careManagerAddress || "N/A", margin, yProf1, cpWidth, true);

        let yProf2 = await addField(ctx, "Care Manager Phone", assessmentData.careManagerTelephoneNumber || "N/A", cpCol2, rowProfY, cpWidth, true);
        yProf2 = await addField(ctx, "Care Manager Alt. Phone", assessmentData.careManagerPhoneNumber || "N/A", cpCol2, yProf2, cpWidth, true);
        yProf2 = await addField(ctx, "GP Name", assessmentData.GPName || "N/A", cpCol2, yProf2, cpWidth, true);
        yProf2 = await addField(ctx, "GP Phone", assessmentData.GPPhoneNumber || "N/A", cpCol2, yProf2, cpWidth, true);
        yProf2 = await addField(ctx, "GP Address", assessmentData.GPAddress || "N/A", cpCol2, yProf2, cpWidth, true);
        yPos = Math.max(yProf1, yProf2);

        // 5. Medical Information
        yPos = await addSectionTitle(ctx, "MEDICAL INFORMATION", yPos + 2);
        yPos = await addField(ctx, "Allergies", assessmentData.allergies || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Full Medical History", assessmentData.medicalHistory || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Prescribed Medications", assessmentData.prescribedMedications || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Consent & Capacity", assessmentData.consentCapacityRights || "N/A", margin, yPos, pageWidth - margin * 2);

        // 6. Integrated Care Assessments
        yPos = await addSectionTitle(ctx, "INTEGRATED CARE ASSESSMENTS", yPos + 2);
        yPos = await addField(ctx, "Skin Integrity Equipment Required", assessmentData.skinIntegrityEquipment || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Are there any wounds present?", assessmentData.skinIntegrityWounds || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await addField(ctx, "Sleep/Psych/Emotional Independent", assessmentData.sleepPsychologicalIndependent ? "Independent" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Normal Bedtime Routine", assessmentData.bedtimeRoutine || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Psychological & Emotional Needs", assessmentData.psychologicalNeeds || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await addField(ctx, "Current Infection", assessmentData.currentInfection || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Antibiotics Prescribed", assessmentData.antibioticsPrescribed ? "Yes" : "No", margin, yPos, pageWidth - margin * 2);
        
        yPos = await addField(ctx, "Breathing Independent", assessmentData.breathingIndependent ? "Independent" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Respiratory Support Details", assessmentData.prescribedBreathing || "N/A", margin, yPos, pageWidth - margin * 2);

        yPos = await ensureAdmissionSpace(30, yPos);
        const rowMobY = yPos;
        let yMob1 = await addField(ctx, "Independent Mobility", assessmentData.mobilityIndependent ? "Yes" : "No", margin, rowMobY, cpWidth, true);
        yMob1 = await addField(ctx, "Assistance Required", assessmentData.assistanceRequired || "N/A", margin, yMob1, cpWidth, true);
        let yMob2 = await addField(ctx, "Mobility Equipment", assessmentData.equipmentRequired || "N/A", cpCol2, rowMobY, cpWidth, true);
        yMob2 = await addField(ctx, "Altered Consciousness", assessmentData.alteredConsciousness || "N/A", cpCol2, yMob2, cpWidth, true);
        yPos = Math.max(yMob1, yMob2);

        // 7. Nutrition, Diet & Hydration
        yPos = await addSectionTitle(ctx, "NUTRITION, DIET & HYDRATION", yPos + 2);
        yPos = await ensureAdmissionSpace(35, yPos);
        const rowNutY = yPos;
        let yNut1 = await addField(ctx, "Weight (kg)", assessmentData.weight || "N/A", margin, rowNutY, cpWidth, true);
        yNut1 = await addField(ctx, "Height (cm)", assessmentData.height || "N/A", margin, yNut1, cpWidth, true);
        yNut1 = await addField(ctx, "IDDSI Food Level", assessmentData.iddsiFood || "N/A", margin, yNut1, cpWidth, true);
        yNut1 = await addField(ctx, "IDDSI Fluid Level", assessmentData.iddsiFluid || "N/A", margin, yNut1, cpWidth, true);

        let yNut2 = await addField(ctx, "Diet Type / Preferences", assessmentData.dietType || "N/A", cpCol2, rowNutY, cpWidth, true);
        yNut2 = await addField(ctx, "Nutritional Supplements", assessmentData.nutritionalSupplements || "N/A", cpCol2, yNut2, cpWidth, true);
        yNut2 = await addField(ctx, "Nutritional Assistance", assessmentData.nutritionalAssistanceRequired || "N/A", cpCol2, yNut2, cpWidth, true);
        yNut2 = await addField(ctx, "Choking Risk", assessmentData.chokingRisk ? "Yes" : "No", cpCol2, yNut2, cpWidth, true);
        yPos = Math.max(yNut1, yNut2);

        // 8. Continence & Personal Hygiene
        yPos = await addSectionTitle(ctx, "CONTINENCE & PERSONAL HYGIENE", yPos + 2);
        yPos = await addField(ctx, "Continence Independent", assessmentData.continenceIndependent ? "Independent" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Continence Needs", assessmentData.continence || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Hygiene Independent", assessmentData.hygieneIndependent ? "Independent" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Personal Hygiene & Grooming", assessmentData.hygiene || "N/A", margin, yPos, pageWidth - margin * 2);

        // 9. Cognitive & Behavioural Assessment
        yPos = await addSectionTitle(ctx, "COGNITIVE & BEHAVIOURAL ASSESSMENT", yPos + 2);
        yPos = await addField(ctx, "Communication Independent", assessmentData.communicationIndependent ? "Independent" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Communication Needs", assessmentData.communication || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Behaviour Independent", assessmentData.behaviourIndependent ? "No challenging behaviour" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Behavioural Needs", assessmentData.behaviour || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Cognition Independent", assessmentData.cognitionIndependent ? "Fully orientated" : "Assistance Required", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Cognitive Needs", assessmentData.cognition || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Additional Comments", assessmentData.additionalComments || "N/A", margin, yPos, pageWidth - margin * 2);

        // 10. Assessment Completion
        yPos = await addSectionTitle(ctx, "ASSESSMENT COMPLETION", yPos + 2);
        yPos = await ensureAdmissionSpace(25, yPos);
        const rowCompY = yPos;
        let yComp1 = await addField(ctx, "Completed By", assessmentData.completedBy || "N/A", margin, rowCompY, cpWidth, true);
        yComp1 = await addField(ctx, "Job Role", assessmentData.jobRole || "N/A", margin, yComp1, cpWidth, true);

        const aDate = assessmentData.assessmentDate || data.assessment_date;
        let yComp2 = await addField(ctx, "Date of Completion", aDate ? format(new Date(aDate), "PPP") : "N/A", cpCol2, rowCompY, cpWidth, true);
        yComp2 = await addField(ctx, "Signature", assessmentData.signature || "N/A", cpCol2, yComp2, cpWidth, true);
        yPos = Math.max(yComp1, yComp2) + 10;

        doc.save(`Admission-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Personal Profile Specialized Layout ---
    if (upperFormName.includes("PERSONAL PROFILE")) {
        const assessmentData = assessmentDataForSpecialized as Record<string, unknown>;
        const fullWidth = pageWidth - margin * 2;

        const formatPersonalProfileDate = (value: unknown): string => {
            if (value === null || value === undefined || value === "") return "N/A";
            const dateObj = value instanceof Date ? value : new Date(value as string | number);
            if (Number.isNaN(dateObj.getTime())) return "N/A";
            return format(dateObj, "dd/MM/yyyy");
        };

        const normalizePersonalProfileValue = (value: unknown): string => {
            if (typeof value === "boolean") return value ? "Yes" : "No";
            if (value === null || value === undefined) return "N/A";
            if (typeof value === "string") return value.trim() ? value : "N/A";
            if (typeof value === "number") return String(value);
            if (value instanceof Date) return formatPersonalProfileDate(value);
            return formatValue(value);
        };

        const readPersonalProfileField = (
            key: string,
            type: "text" | "date" | "checkbox" = "text"
        ): string => {
            const rawValue = assessmentData[key];

            if (type === "checkbox") {
                return normalizePersonalProfileValue(rawValue ?? false);
            }

            if (type === "date") {
                return formatPersonalProfileDate(rawValue);
            }

            return normalizePersonalProfileValue(rawValue);
        };

        const personalProfileSections: Array<{
            title: string;
            fields: Array<{ label: string; key: string; type?: "text" | "date" | "checkbox" }>;
        }> = [
                {
                    title: "Resident Details",
                    fields: [
                        { label: "First Name", key: "firstName" },
                        { label: "Last Name", key: "lastName" },
                        { label: "Date of Birth", key: "dateOfBirth", type: "date" },
                        { label: "Preferred Name", key: "desiredName" }
                    ]
                },
                {
                    title: "Consent",
                    fields: [
                        { label: "Information Sharing Consent", key: "informationSharingConsent", type: "checkbox" }
                    ]
                },
                {
                    title: "Life Story",
                    fields: [
                        { label: "Birth and Growth", key: "birthAndGrowth" },
                        { label: "Parents Details", key: "parentsDetails" },
                        { label: "Siblings Details", key: "siblingsDetails" },
                        { label: "Religion / Spirituality", key: "religionSpirituality" },
                        { label: "School / Childhood", key: "schoolChildhood" },
                        { label: "Friends / Neighbours", key: "friendsNeighbours" },
                        { label: "Partner / Family Details", key: "partnerFamilyDetails" },
                        { label: "Work History", key: "workHistory" }
                    ]
                },
                {
                    title: "Personal, Health and Well-being",
                    fields: [
                        { label: "Personality", key: "personality" },
                        { label: "Hobbies / Interests", key: "hobbiesInterests" },
                        { label: "Likes", key: "likes" },
                        { label: "Dislikes", key: "dislikes" },
                        { label: "Happiest Memory", key: "happiestMemory" },
                        { label: "Enjoy Talking About", key: "enjoyTalkingAbout" },
                        { label: "Traumatic Events", key: "traumaticEvents" },
                        { label: "Usual Routine", key: "usualRoutine" },
                        { label: "Mental Health Problems", key: "mentalHealthProblems" },
                        { label: "Illness Recovery", key: "illnessRecovery" },
                        { label: "Physical Health Problems", key: "physicalHealthProblems" },
                        { label: "Feelings About Care", key: "feelingsAboutCare" },
                        { label: "Staff Difficulties", key: "staffDifficulties" },
                        { label: "Additional Comments", key: "additionalComments" }
                    ]
                },
                {
                    title: "Family / Representative",
                    fields: [
                        { label: "Family Representative Name", key: "familyRepName" },
                        { label: "Family Representative Date", key: "familyRepDate", type: "date" },
                        { label: "Family Representative Signature", key: "familyRepSignature" }
                    ]
                },
                {
                    title: "Completed By (Staff)",
                    fields: [
                        { label: "Completed By Name", key: "completedByName" },
                        { label: "Completed By Designation", key: "completedByDesignation" },
                        { label: "Completed By Date", key: "completedByDate", type: "date" },
                        { label: "Completed By Signature", key: "completedBySignature" },
                        { label: "Assessment Date", key: "assessmentDate", type: "date" }
                    ]
                }
            ];

        for (const section of personalProfileSections) {
            yPos = await addSectionTitle(ctx, section.title, yPos);
            for (const field of section.fields) {
                yPos = await addField(
                    ctx,
                    field.label,
                    readPersonalProfileField(field.key, field.type ?? "text"),
                    margin,
                    yPos,
                    fullWidth
                );
            }
        }

        doc.save(`Personal-Profile-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- PEEP (Personal Emergency Evacuation Plan) Specialized Layout ---
    if (upperFormName.includes("PEEP")) {
        const assessmentData = assessmentDataForSpecialized;

        const drawPEEPHeader = async () => {
            await drawHeader(ctx);
        };

        const ensurePEEPSpace = async (heightNeeded: number, currentY: number) => {
            return ensureSpace(ctx, heightNeeded, currentY);
        };

        const addPEEPSectionAField = (label: string, value: unknown, x: number, y: number, width: number) => {
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(107, 114, 128);
            doc.text(label.toUpperCase(), x, y);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(17, 24, 39);
            const splitValue = doc.splitTextToSize(formatValue(value), width);
            doc.text(splitValue, x, y + 6);
            return y + 6 + (splitValue.length * 5);
        };

        // Section A: Resident & Facility Details
        yPos = await addSectionTitle(ctx, "SECTION A: RESIDENT & FACILITY DETAILS", yPos);
        yPos = await ensurePEEPSpace(40, yPos);
        const rowResY = yPos;
        const dobVal = assessmentData.residentDateOfBirth || (resident ? resident.date_of_birth : "");
        const generatedDate = format(new Date(), "dd/MM/yyyy");

        const row1Left = addPEEPSectionAField(
            "Resident Name",
            assessmentData.residentName || (resident ? `${resident.first_name} ${resident.last_name}` : "N/A"),
            margin,
            rowResY,
            cpWidth
        );
        const row1Right = addPEEPSectionAField(
            "Care Home Name",
            assessmentData.facilityName || careHomeName || "N/A",
            cpCol2,
            rowResY,
            cpWidth
        );
        yPos = Math.max(row1Left, row1Right) + 3;

        const row2Left = addPEEPSectionAField(
            "Date of Birth",
            dobVal ? format(new Date(dobVal), "dd/MM/yyyy") : "N/A",
            margin,
            yPos,
            cpWidth
        );
        const row2Right = addPEEPSectionAField(
            "Bedroom Number",
            assessmentData.bedroomNumber || (resident ? resident.room_number : "N/A"),
            cpCol2,
            yPos,
            cpWidth
        );
        yPos = Math.max(row2Left, row2Right) + 3;

        const row3Left = addPEEPSectionAField("Unit", assessmentData.unit || "N/A", margin, yPos, cpWidth);
        const row3Right = addPEEPSectionAField("Date Generated", generatedDate, cpCol2, yPos, cpWidth);
        yPos = Math.max(row3Left, row3Right);

        // Section B: Awareness of Procedure
        yPos = await addSectionTitle(ctx, "SECTION B: AWARENESS OF PROCEDURE", yPos + 2);
        const informedBy = assessmentData.informedBy || {};
        yPos = await addField(ctx, "Alarm System", informedBy.alarmSystem ?? "N/A", margin, yPos, cpWidth);
        yPos = await addField(ctx, "Visual Alarm", informedBy.visualAlarm ?? "N/A", margin, yPos, cpWidth);
        yPos = await addField(ctx, "Pager Device / Vibrating Pad", informedBy.pagerDevice ?? "N/A", margin, yPos, cpWidth);
        yPos = await addField(ctx, "Other Informed Method", informedBy.other ?? "N/A", margin, yPos, cpWidth);
        if (informedBy.otherDetails || informedBy.other) {
            yPos = await addField(ctx, "Other Details", informedBy.otherDetails || "N/A", margin, yPos, pageWidth - margin * 2);
        }

        // Section C: Assistance & Equipment
        yPos = await addSectionTitle(ctx, "SECTION C: ASSISTANCE & EQUIPMENT", yPos + 2);
        yPos = await addField(ctx, "Designated Assistance", assessmentData.designatedAssistance || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Equipment Required", assessmentData.equipmentRequired || "N/A", margin, yPos, pageWidth - margin * 2);

        // Section D: Personalised Evacuation Procedure
        yPos = await addSectionTitle(ctx, "SECTION D: PERSONALISED EVACUATION PROCEDURE", yPos + 2);
        if (assessmentData.steps && Array.isArray(assessmentData.steps) && assessmentData.steps.length > 0) {
            for (const step of assessmentData.steps) {
                yPos = await addField(ctx, step.name || "Step", step.description || "N/A", margin, yPos, pageWidth - margin * 2);
                yPos += 2;
            }
        } else {
            yPos = await addField(ctx, "Step Details", "N/A", margin, yPos, pageWidth - margin * 2);
        }

        // Section E: Fire Hazards in Area / Room
        yPos = await addSectionTitle(ctx, "SECTION E: FIRE HAZARDS IN AREA / ROOM", yPos + 2);
        const hazards = assessmentData.hazards || {};
        yPos = await addField(ctx, "Oxygen Cylinders in use", hazards.oxygenCylinders ?? "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Soft Furnishings are Fire Retardant", hazards.furnishingsFireRetardant ?? "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Does the person smoke?", hazards.doesPersonSmoke ?? "N/A", margin, yPos, pageWidth - margin * 2);

        // Section F: Monitoring and Review / Signatures
        yPos = await addSectionTitle(ctx, "SECTION F: MONITORING AND REVIEW / SIGNATURES", yPos + 2);
        yPos = await ensurePEEPSpace(40, yPos);
        const rowSignY = yPos;
        
        let ySign1 = await addField(ctx, "Manager Signature", assessmentData.managerSignature || "N/A", margin, rowSignY, cpWidth, true);
        ySign1 = await addField(ctx, "Date (Manager)", assessmentData.managerSignatureDate ? format(new Date(assessmentData.managerSignatureDate), "dd/MM/yyyy") : "N/A", margin, ySign1 + 1, cpWidth, true);

        let ySign2 = await addField(ctx, "Person in Care Signature", assessmentData.personInCareSignature || "N/A", cpCol2, rowSignY, cpWidth, true);
        ySign2 = await addField(ctx, "Date (Person)", assessmentData.personInCareSignatureDate ? format(new Date(assessmentData.personInCareSignatureDate), "dd/MM/yyyy") : "N/A", cpCol2, ySign2 + 1, cpWidth, true);
        
        yPos = Math.max(ySign1, ySign2);

        doc.save(`PEEP-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Moving & Handling Specialized Layout ---
    if (upperFormName.includes("MOVING") && upperFormName.includes("HANDLING")) {
        const rawData = data as Record<string, unknown>;
        const source = assessmentDataForSpecialized as Record<string, unknown>;
        const sourceAssessment = (source.assessment_data ?? {}) as Record<string, unknown>;
        const rawAssessment = (rawData.assessment_data ?? {}) as Record<string, unknown>;

        const mobility = (
            source.mobility_assessment ??
            sourceAssessment.mobility_assessment ??
            rawData.mobility_assessment ??
            rawAssessment.mobility_assessment ??
            {}
        ) as Record<string, unknown>;

        const risk = (
            source.risk_factors ??
            source.riskFactors ??
            sourceAssessment.risk_factors ??
            sourceAssessment.riskFactors ??
            rawData.risk_factors ??
            rawData.riskFactors ??
            rawAssessment.risk_factors ??
            rawAssessment.riskFactors ??
            {}
        ) as Record<string, unknown>;

        const assessmentData: Record<string, unknown> = {
            ...rawData,
            ...source,
            ...rawAssessment,
            ...sourceAssessment,
            ...mobility,
            ...risk,
            equipmentUsed:
                source.equipmentUsed ??
                source.equipment_needed ??
                rawData.equipmentUsed ??
                rawData.equipment_needed,
            completedBy:
                source.completedBy ??
                source.completed_by ??
                rawData.completedBy ??
                rawData.completed_by,
            jobRole:
                source.jobRole ??
                source.job_role ??
                source.role ??
                risk.jobRole ??
                risk.job_role ??
                rawData.jobRole ??
                rawData.job_role,
            signature:
                source.signature ??
                source.staffSignature ??
                source.staff_signature ??
                risk.signature ??
                risk.staffSignature ??
                risk.staff_signature ??
                source.completedBy ??
                source.completed_by,
            assessmentDate:
                source.assessmentDate ??
                source.assessment_date ??
                source.completionDate ??
                source.completion_date ??
                rawData.assessmentDate ??
                rawData.assessment_date
        };
        const fullWidth = pageWidth - margin * 2;

        const display = (value: unknown): string => {
            if (value === null || value === undefined) return "N/A";
            if (typeof value === "string") return value.trim() ? value : "N/A";
            return String(value);
        };

        const displayDate = (value: unknown): string => {
            if (!value) return "N/A";
            const parsed = new Date(value as string | number | Date);
            return Number.isNaN(parsed.getTime()) ? "N/A" : format(parsed, "dd/MM/yyyy");
        };

        const yesNo = (value: unknown): string => {
            if (value === true) return "Yes";
            if (value === false) return "No";
            if (typeof value === "number") return value === 1 ? "Yes" : "No";
            if (typeof value === "string") {
                const normalized = value.trim().toLowerCase();
                return normalized === "true" || normalized === "yes" || normalized === "1" ? "Yes" : "No";
            }
            return "No";
        };

        const enumDisplay = (value: unknown): string => {
            const text = display(value);
            if (text === "N/A") return text;
            const formatted = text.replace(/-/g, " ").replace(/_/g, " ").toLowerCase();
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        };

        const addMovingHandlingField = async (label: string, value: unknown, x: number, y: number, width: number) => {
            const displayValue = display(value);
            const splitValue = doc.splitTextToSize(displayValue, width);
            const lineHeight = 4.8;
            const neededHeight = 8 + (splitValue.length * lineHeight) + 2;

            y = await ensureSpace(ctx, neededHeight, y);

            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(107, 114, 128);
            doc.text(label.toUpperCase(), x, y);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(17, 24, 39);
            doc.text(splitValue, x, y + 5);

            return y + 6 + (splitValue.length * lineHeight);
        };

        const addSubsectionTitle = async (title: string, y: number) => {
            if (y + 14 > 280) {
                doc.addPage();
                await drawHeader(ctx);
                y = 30;
            }
            doc.setFillColor(219, 234, 254);
            doc.rect(margin, y, fullWidth, 8, "F");
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 58, 138);
            doc.text(title.toUpperCase(), margin + 2, y + 5.5);
            return y + 10;
        };

        yPos = 30;
        await drawHeader(ctx);

        yPos = await addSectionTitle(ctx, "SECTION 1 - RESIDENT INFORMATION", yPos);
        yPos = await addMovingHandlingField("Resident Name", enumDisplay(assessmentData.residentName || `${resident?.first_name || ""} ${resident?.last_name || ""}`.trim()), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Date of Birth", displayDate(assessmentData.dateOfBirth || resident?.date_of_birth), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Bedroom Number", display(assessmentData.bedroomNumber || resident?.room_number), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Weight (kg)", display(assessmentData.weight), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Height (cm)", display(assessmentData.height), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("History of Falls", yesNo(assessmentData.historyOfFalls), margin, yPos, fullWidth);

        yPos = await addSectionTitle(ctx, "SECTION 2 - MOBILITY ASSESSMENT", yPos + 2);
        yPos = await addMovingHandlingField("Independent Mobility", yesNo(assessmentData.independentMobility), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Weight Bearing Capacity", enumDisplay(assessmentData.canWeightBear), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Limb Mobility - Upper Right", enumDisplay(assessmentData.limbUpperRight), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Limb Mobility - Upper Left", enumDisplay(assessmentData.limbUpperLeft), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Limb Mobility - Lower Right", enumDisplay(assessmentData.limbLowerRight), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Limb Mobility - Lower Left", enumDisplay(assessmentData.limbLowerLeft), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Equipment Needed", enumDisplay(assessmentData.equipmentUsed), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Details of Support/Staff Required", enumDisplay(assessmentData.needsRiskStaff), margin, yPos, fullWidth);

        yPos = await addSectionTitle(ctx, "SECTION 3 - RISK FACTORS", yPos + 2);

        yPos = await addSubsectionTitle("Sensory & Behavioral", yPos);
        yPos = await addMovingHandlingField("Deafness State", enumDisplay(assessmentData.deafnessState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Deafness Comments", display(assessmentData.deafnessComments), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Blindness State", enumDisplay(assessmentData.blindnessState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Blindness Comments", display(assessmentData.blindnessComments), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Unpredictable Behaviour State", enumDisplay(assessmentData.unpredictableBehaviourState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Unpredictable Behaviour Comments", display(assessmentData.unpredictableBehaviourComments), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Uncooperative Behaviour State", enumDisplay(assessmentData.uncooperativeBehaviourState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Uncooperative Behaviour Comments", display(assessmentData.uncooperativeBehaviourComments), margin, yPos, fullWidth);

        yPos = await addSubsectionTitle("Cognitive & Emotional", yPos + 1);
        yPos = await addMovingHandlingField("Distressed Reaction State", enumDisplay(assessmentData.distressedReactionState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Distressed Reaction Comments", display(assessmentData.distressedReactionComments), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Disorientated State", enumDisplay(assessmentData.disorientatedState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Disorientated Comments", display(assessmentData.disorientatedComments), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Unconscious State", enumDisplay(assessmentData.unconsciousState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Unconscious Comments", display(assessmentData.unconsciousComments), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Unbalance State", enumDisplay(assessmentData.unbalanceState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Unbalance Comments", display(assessmentData.unbalanceComments), margin, yPos, fullWidth);

        yPos = await addSubsectionTitle("Physical & Other", yPos + 1);
        yPos = await addMovingHandlingField("Spasms State", enumDisplay(assessmentData.spasmsState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Spasms Comments", display(assessmentData.spasmsComments), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Stiffness State", enumDisplay(assessmentData.stiffnessState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Stiffness Comments", display(assessmentData.stiffnessComments), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Catheters State", enumDisplay(assessmentData.cathetersState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Catheters Comments", display(assessmentData.cathetersComments), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Incontinence State", enumDisplay(assessmentData.incontinenceState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Incontinence Comments", display(assessmentData.incontinenceComments), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Localised Pain State", enumDisplay(assessmentData.localisedPain), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Localised Pain Comments", display(assessmentData.localisedPainComments), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Other Risk Factors State", enumDisplay(assessmentData.otherState), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Other Risk Factors Comments", display(assessmentData.otherComments), margin, yPos, fullWidth);

        yPos = await addSectionTitle(ctx, "SECTION 4 - COMPLETION", yPos + 2);
        yPos = await addMovingHandlingField("Completed By", enumDisplay(assessmentData.completedBy), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Job Role", enumDisplay(assessmentData.jobRole), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Signature", enumDisplay(assessmentData.signature), margin, yPos, fullWidth);
        yPos = await addMovingHandlingField("Assessment Date", displayDate(assessmentData.assessmentDate), margin, yPos, fullWidth);

        doc.save(`Moving-Handling-Assessment-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Resident Valuables and Personal Property Record Specialized Layout ---
    if (
        upperFormName.includes("RESIDENT VALUABLES AND PERSONAL PROPERTY") ||
        (upperFormName.includes("RESIDENT VALUABLES") && !upperFormName.includes("CARE PLAN"))
    ) {
        try {
            const src = assessmentDataForSpecialized as Record<string, unknown>;
            const w = pageWidth - margin * 2;
            const colWidth = w / 2 - 3;

            const pickPath = (source: Record<string, unknown>, path: string): unknown =>
                path.split(".").reduce<unknown>((acc, k) => {
                    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[k];
                    return undefined;
                }, source);

            const valStr = (paths: string[], fallback = "Not specified"): string => {
                for (const p of paths) {
                    const v = pickPath(src, p);
                    if (v !== undefined && v !== null && v !== "") return String(v);
                }
                return fallback;
            };

            const valNum = (paths: string[], fallback = 0): number => {
                for (const p of paths) {
                    const v = pickPath(src, p);
                    if (v !== undefined && v !== null && !isNaN(Number(v))) return Number(v);
                }
                return fallback;
            };

            const valDate = (paths: string[]): string => {
                for (const p of paths) {
                    const v = pickPath(src, p);
                    if (v) {
                        const d = new Date(v as string | number);
                        if (!isNaN(d.getTime())) return format(d, "dd MMMM yyyy");
                    }
                }
                return "Not specified";
            };

            // ── Section 1: Administrative Details ──
            yPos = await addSectionTitle(ctx, "Administrative Details", yPos);
            const rowA_y = yPos;
            const rowA_1 = await addField(ctx, "Resident Name", valStr(["residentName"]), margin, rowA_y, colWidth, true);
            const rowA_2 = await addField(ctx, "Bedroom Number", valStr(["bedroomNumber"]), col2, rowA_y, colWidth, true);
            yPos = Math.max(rowA_1, rowA_2) + 2;

            const rowB_y = yPos;
            const rowB_1 = await addField(ctx, "Date", valDate(["date"]), margin, rowB_y, colWidth, true);
            const completedByLabel = valStr(["completedBy"]) + (valStr(["completedByRole"], "") ? ` (${valStr(["completedByRole"])})` : "");
            const rowB_2 = await addField(ctx, "Completed By", completedByLabel, col2, rowB_y, colWidth, true);
            yPos = Math.max(rowB_1, rowB_2) + 2;

            const rowC_y = yPos;
            const witnessedByLabel = valStr(["witnessedBy"]) + (valStr(["witnessedByRole"], "") ? ` (${valStr(["witnessedByRole"])})` : "");
            const rowC_1 = await addField(ctx, "Witnessed By", witnessedByLabel, margin, rowC_y, colWidth, true);
            const rowC_2 = await addField(ctx, "Witness Job Role", valStr(["witnessedByRole"]), col2, rowC_y, colWidth, true);
            yPos = Math.max(rowC_1, rowC_2) + 6;

            // ── Section 2: Valuables & Jewellery ──
            yPos = await addSectionTitle(ctx, "Valuables & Jewellery", yPos);
            const valuables = Array.isArray(src.valuables)
                ? (src.valuables as Array<{ value: string }>)
                : [];
            if (valuables.length === 0) {
                yPos = await addField(ctx, "Items Recorded", "No valuables recorded", margin, yPos, w);
                yPos += 4;
            } else {
                yPos = await ensureSpace(ctx, valuables.length * 7 + 14, yPos);
                autoTable(doc, {
                    startY: yPos,
                    theme: "striped",
                    margin: { left: margin, right: margin },
                    tableWidth: w,
                    head: [["#", "Item Description"]],
                    body: valuables.map((item, i) => [String(i + 1), item.value || "—"]),
                    styles: { fontSize: 9, cellPadding: 2.5, textColor: [17, 24, 39] },
                    headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
                    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: w - 12 } },
                });
                yPos = (doc as any).lastAutoTable.finalY + 6;
            }

            // ── Section 3: Money & Cash ──
            yPos = await addSectionTitle(ctx, "Money & Cash", yPos);
            yPos = await ensureSpace(ctx, 60, yPos);
            const moneyTableData = [
                ["£50 Notes",  String(valNum(["n50"])), "50p Coins", String(valNum(["p50"]))],
                ["£20 Notes",  String(valNum(["n20"])), "20p Coins", String(valNum(["p20"]))],
                ["£10 Notes",  String(valNum(["n10"])), "10p Coins", String(valNum(["p10"]))],
                ["£5 Notes",   String(valNum(["n5"])),  "5p Coins",  String(valNum(["p5"]))],
                ["£2 Coins",   String(valNum(["n2"])),  "2p Coins",  String(valNum(["p2"]))],
                ["£1 Coins",   String(valNum(["n1"])),  "1p Coins",  String(valNum(["p1"]))],
            ];
            const denomColW = (w / 2) - 12;
            const countColW = 12;
            autoTable(doc, {
                startY: yPos,
                theme: "grid",
                margin: { left: margin, right: margin },
                tableWidth: w,
                head: [["Denomination (Pounds / Notes)", "Qty", "Denomination (Pence / Coins)", "Qty"]],
                body: moneyTableData,
                styles: { fontSize: 9, cellPadding: 2.5, textColor: [17, 24, 39] },
                headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: denomColW },
                    1: { cellWidth: countColW, halign: "center" },
                    2: { cellWidth: denomColW },
                    3: { cellWidth: countColW, halign: "center" },
                },
            });
            yPos = (doc as any).lastAutoTable.finalY + 4;

            yPos = await ensureSpace(ctx, 14, yPos);
            const total = valNum(["total"]);
            doc.setFillColor(6, 95, 70);
            doc.roundedRect(margin, yPos, w, 11, 2, 2, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`Total Cash: £${total.toFixed(2)}`, pageWidth / 2, yPos + 7.5, { align: "center" });
            doc.setTextColor(0, 0, 0);
            yPos += 16;

            // ── Section 4: Clothing Audit ──
            yPos = await addSectionTitle(ctx, "Clothing Audit", yPos);
            const clothing = Array.isArray(src.clothing)
                ? (src.clothing as Array<{ value: string; count: number }>)
                : [];
            if (clothing.length === 0) {
                yPos = await addField(ctx, "Items Recorded", "No clothing items recorded", margin, yPos, w);
                yPos += 4;
            } else {
                yPos = await ensureSpace(ctx, clothing.length * 7 + 14, yPos);
                autoTable(doc, {
                    startY: yPos,
                    theme: "striped",
                    margin: { left: margin, right: margin },
                    tableWidth: w,
                    head: [["#", "Item Description", "Qty"]],
                    body: clothing.map((item, i) => [String(i + 1), item.value || "—", String(item.count ?? 1)]),
                    styles: { fontSize: 9, cellPadding: 2.5, textColor: [17, 24, 39] },
                    headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
                    columnStyles: {
                        0: { cellWidth: 12 },
                        1: { cellWidth: w - 30 },
                        2: { cellWidth: 18, halign: "center" },
                    },
                });
                yPos = (doc as any).lastAutoTable.finalY + 6;
            }

            // ── Section 5: Other Property / Items Received ──
            yPos = await addSectionTitle(ctx, "Other Property / Items Received", yPos);
            const otherItems = Array.isArray(src.other)
                ? (src.other as Array<{ value: string; count: number }>)
                : [];
            if (otherItems.length === 0) {
                yPos = await addField(ctx, "Items Recorded", "No other items recorded", margin, yPos, w);
                yPos += 4;
            } else {
                yPos = await ensureSpace(ctx, otherItems.length * 7 + 14, yPos);
                autoTable(doc, {
                    startY: yPos,
                    theme: "striped",
                    margin: { left: margin, right: margin },
                    tableWidth: w,
                    head: [["#", "Item Description", "Qty"]],
                    body: otherItems.map((item, i) => [String(i + 1), item.value || "—", String(item.count ?? 1)]),
                    styles: { fontSize: 9, cellPadding: 2.5, textColor: [17, 24, 39] },
                    headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
                    columnStyles: {
                        0: { cellWidth: 12 },
                        1: { cellWidth: w - 30 },
                        2: { cellWidth: 18, halign: "center" },
                    },
                });
                yPos = (doc as any).lastAutoTable.finalY + 6;
            }

            // ── Section 6: Additional Comments ──
            yPos = await addSectionTitle(ctx, "Additional Comments", yPos);
            yPos = await addField(ctx, "Comments", valStr(["comments"], "No additional comments"), margin, yPos, w);
            yPos += 6;

            // ── Section 7: Signatures & Witnesses ──
            yPos = await addSectionTitle(ctx, "Signatures & Witnesses", yPos);
            const sigRowY = yPos;
            const sig1 = await addField(ctx, "Completed By", completedByLabel || "Not specified", margin, sigRowY, colWidth, true);
            const sig2 = await addField(ctx, "Witnessed By", witnessedByLabel || "Not specified", col2, sigRowY, colWidth, true);
            yPos = Math.max(sig1, sig2) + 8;

            yPos = await ensureSpace(ctx, 20, yPos);
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.3);
            doc.line(margin, yPos + 10, margin + colWidth, yPos + 10);
            doc.line(col2, yPos + 10, col2 + colWidth, yPos + 10);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(107, 114, 128);
            doc.text("Resident / Family Signature", margin, yPos + 14);
            doc.text("Witness Signature", col2, yPos + 14);
            yPos += 20;
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            doc.text(`Date: ${valDate(["date"])}`, margin, yPos);

            doc.save(`Resident-Valuables-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
            return;
        } catch (error) {
            console.error("Resident Valuables specialized PDF generation failed, falling back to generic layout:", error);
        }
    }
};
