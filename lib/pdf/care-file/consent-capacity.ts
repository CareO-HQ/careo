import jsPDF from "jspdf";
import { format } from "date-fns";
import { drawHeader, addSectionTitle, addField, ensureSpace, toSafeFilePart, GenerateCareFilePDFOptions, PDFContext } from "./helpers";

export const generateConsentCapacityPDF = async (options: GenerateCareFilePDFOptions) => {
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

    // --- Capacity and Consent Specialized Layout ---
    if (upperFormName.includes("CAPACITY AND CONSENT")) {
        const assessmentData = assessmentDataForSpecialized;

        const drawCapacityHeader = async () => {
            await drawHeader(ctx);
        };

        const ensureCapacitySpace = async (heightNeeded: number, currentY: number) => {
            return ensureSpace(ctx, heightNeeded, currentY);
        };

        // Section A - Resident Details
        yPos = await addSectionTitle(ctx, "SECTION A - RESIDENT DETAILS", yPos);
        yPos = await ensureCapacitySpace(40, yPos);
        const rowResY = yPos;
        let yRes1 = await addField(ctx, "Resident Name", assessmentData.residentName || (resident ? `${resident.first_name} ${resident.last_name}` : "N/A"), margin, rowResY, cpWidth, true);
        const dobVal = assessmentData.dateOfBirth || (resident ? resident.date_of_birth : "");
        yRes1 = await addField(ctx, "Date of Birth", dobVal ? (typeof dobVal === 'number' ? format(new Date(dobVal), "dd/MM/yyyy") : format(new Date(dobVal), "dd/MM/yyyy")) : "N/A", margin, yRes1 + 1, cpWidth, true);

        let yRes2 = await addField(ctx, "NHS Number", assessmentData.nhsNumber || (resident ? resident.nhs_health_number : "N/A"), cpCol2, rowResY, cpWidth, true);
        const admDate = assessmentData.dateOfAdmission || (resident ? resident.admission_date : "");
        yRes2 = await addField(ctx, "Date of Admission", admDate ? format(new Date(admDate), "dd/MM/yyyy") : "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yPos = Math.max(yRes1, yRes2);

        // Section B - Details of Decision
        yPos = await addSectionTitle(ctx, "SECTION B - DETAILS OF DECISION", yPos + 2);
        if (assessmentData.decisionToBeMade && assessmentData.decisionToBeMade !== "N/A") {
            yPos = await addField(ctx, "Decision to be made", assessmentData.decisionToBeMade, margin, yPos, pageWidth - margin * 2);
        }
        
        const decisionTypes = [
            { label: "Admission to Care Home", value: assessmentData.admissionToCareHome },
            { label: "Consent to Care Planning & Treatment", value: assessmentData.consentToCarePlanning },
            { label: "Consent to Medication", value: assessmentData.consentToMedication },
            { label: "Consent to Sharing Information", value: assessmentData.consentToSharingInfo },
            { label: "Other Decision", value: assessmentData.otherDecision }
        ];

        const decisionsText = decisionTypes
            .filter(d => d.value)
            .map(d => `[x] ${d.label}`)
            .join("   ");
        
        if (decisionsText) {
            yPos = await addField(ctx, "Decision requiring assessment", decisionsText, margin, yPos, pageWidth - margin * 2);
        }
        if (assessmentData.otherDecision && assessmentData.otherDecisionDetails) {
            yPos = await addField(ctx, "Other Decision Details", assessmentData.otherDecisionDetails, margin, yPos, pageWidth - margin * 2);
        }

        // Section C - Stage 1 (Diagnostic Test)
        yPos = await addSectionTitle(ctx, "SECTION C - STAGE 1: THE DIAGNOSTIC TEST", yPos + 2);
        yPos = await addField(ctx, "Does the person have an impairment or disturbance in the functioning of the mind or brain?", assessmentData.hasImpairment || "N/A", margin, yPos, pageWidth - margin * 2);
        yPos = await addField(ctx, "Details of impairment", assessmentData.impairmentDetails || "N/A", margin, yPos, pageWidth - margin * 2);

        // Section D - Stage 2 (Functional Test)
        yPos = await addSectionTitle(ctx, "SECTION D - STAGE 2: THE FUNCTIONAL TEST", yPos + 2);
        
        const functionalAssesments = [
            { label: "1. Can the person understand the information relevant to the decision?", value: assessmentData.understandInformation, notes: assessmentData.understandNotes },
            { label: "2. Can the person retain that information?", value: assessmentData.retainInformation, notes: assessmentData.retainNotes },
            { label: "3. Can the person use or weigh that information as part of the process of making the decision?", value: assessmentData.useWeighInformation, notes: assessmentData.useWeighNotes },
            { label: "4. Can the person communicate their decision?", value: assessmentData.communicateDecision, notes: assessmentData.communicateNotes }
        ];

        for (const fa of functionalAssesments) {
            yPos = await addField(ctx, fa.label, fa.value || "N/A", margin, yPos, pageWidth - margin * 2);
            if (fa.notes) {
                yPos = await addField(ctx, "Notes / Evidence", fa.notes, margin, yPos, pageWidth - margin * 2);
            }
            yPos += 2;
        }

        // Section E - Outcome of Capacity Assessment
        yPos = await addSectionTitle(ctx, "SECTION E - OUTCOME OF CAPACITY ASSESSMENT", yPos + 2);
        const capacityOutcome = assessmentData.hasCapacity === "Yes" 
            ? "Based on the assessment above, the person DOES have the capacity to make this decision."
            : "Based on the assessment above, the person DOES NOT have the capacity to make this decision.";
        yPos = await addField(ctx, "Capacity Outcome", capacityOutcome, margin, yPos, pageWidth - margin * 2);

        // Section F - Resident Consent (if capacity is present)
        if (assessmentData.hasCapacity === "Yes") {
            yPos = await addSectionTitle(ctx, "SECTION F - RESIDENT CONSENT", yPos + 2);
            yPos = await ensureCapacitySpace(25, yPos);
            const rowResConsentY = yPos;
            const yResConsent1 = await addField(ctx, "Resident Signature", assessmentData.residentSignature || "N/A", margin, rowResConsentY, cpWidth, true);
            const yResConsent2 = await addField(ctx, "Date", assessmentData.residentConsentDate ? format(new Date(assessmentData.residentConsentDate), "dd/MM/yyyy") : "N/A", cpCol2, rowResConsentY, cpWidth, true);
            yPos = Math.max(yResConsent1, yResConsent2);
        }

        // Section G - Assessor Details
        yPos = await addSectionTitle(ctx, "SECTION G - ASSESSOR DETAILS", yPos + 2);
        yPos = await ensureCapacitySpace(40, yPos);
        const rowAssessorY = yPos;
        let yAssessor1 = await addField(ctx, "Assessor Name", assessmentData.assessorName || "N/A", margin, rowAssessorY, cpWidth, true);
        yAssessor1 = await addField(ctx, "Assessor Role", assessmentData.assessorRole || "N/A", margin, yAssessor1 + 1, cpWidth, true);

        let yAssessor2 = await addField(ctx, "Assessor Signature", assessmentData.assessorSignature || "N/A", cpCol2, rowAssessorY, cpWidth, true);
        yAssessor2 = await addField(ctx, "Date of Assessment", assessmentData.assessmentDate ? format(new Date(assessmentData.assessmentDate), "dd/MM/yyyy") : "N/A", cpCol2, yAssessor2 + 1, cpWidth, true);
        yPos = Math.max(yAssessor1, yAssessor2);

        // Section H - Legal Representative (if applicable)
        if (assessmentData.legalRepresentativeType || assessmentData.representativeName) {
            yPos = await addSectionTitle(ctx, "SECTION H - LEGAL REPRESENTATIVE", yPos + 2);
            yPos = await ensureCapacitySpace(40, yPos);
            const rowRepY = yPos;
            let yRep1 = await addField(ctx, "Type of Representative", assessmentData.legalRepresentativeType || "N/A", margin, rowRepY, cpWidth, true);
            yRep1 = await addField(ctx, "Representative Name", assessmentData.representativeName || "N/A", margin, yRep1 + 1, cpWidth, true);

            let yRep2 = await addField(ctx, "Relationship to Resident", assessmentData.relationshipToResident || "N/A", cpCol2, rowRepY, cpWidth, true);
            yRep2 = await addField(ctx, "Contact Details", assessmentData.contactDetails || "N/A", cpCol2, yRep2 + 1, cpWidth, true);
            yPos = Math.max(yRep1, yRep2);
        }

        // Section I - Review and Reassessment
        yPos = await addSectionTitle(ctx, "SECTION I - REVIEW AND REASSESSMENT", yPos + 2);
        yPos = await ensureCapacitySpace(25, yPos);
        const rowReviewY = yPos;
        const yReview1 = await addField(ctx, "Next Review Date", assessmentData.nextReviewDate ? format(new Date(assessmentData.nextReviewDate), "dd/MM/yyyy") : "N/A", margin, rowReviewY, cpWidth, true);
        const yReview2 = await addField(ctx, "Reason for Reassessment", assessmentData.reasonForReassessment || "N/A", cpCol2, rowReviewY, cpWidth, true);
        yPos = Math.max(yReview1, yReview2);

        doc.save(`Capacity-and-Consent-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    // --- Best Interest Decision Form Specialized Layout ---
    if (upperFormName.includes("BEST INTEREST DECISION")) {
        const assessmentData = assessmentDataForSpecialized;

        const drawBIDHeader = async () => {
            await drawHeader(ctx);
        };

        const ensureBIDSpace = async (heightNeeded: number, currentY: number) => {
            return ensureSpace(ctx, heightNeeded, currentY);
        };

        // 1. Resident Details
        yPos = await addSectionTitle(ctx, "RESIDENT DETAILS", yPos);
        yPos = await ensureBIDSpace(40, yPos);
        const rowResY = yPos;
        let yRes1 = await addField(ctx, "Resident Name", assessmentData.residentName || (resident ? `${resident.first_name} ${resident.last_name}` : "N/A"), margin, rowResY, cpWidth, true);
        const dobVal = assessmentData.dateOfBirth || (resident ? resident.date_of_birth : "");
        yRes1 = await addField(ctx, "Date of Birth", dobVal ? format(new Date(dobVal), "dd/MM/yyyy") : "N/A", margin, yRes1 + 1, cpWidth, true);

        let yRes2 = await addField(ctx, "GP Name", assessmentData.gpName || (resident ? resident.gp_name : "N/A"), cpCol2, rowResY, cpWidth, true);
        yRes2 = await addField(ctx, "Staff involved in Discussion", assessmentData.staffMemberInvolved || "N/A", cpCol2, yRes2 + 1, cpWidth, true);
        yPos = Math.max(yRes1, yRes2);

        // 2. Decision Details
        yPos = await addSectionTitle(ctx, "DECISION DETAILS", yPos + 2);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(31, 41, 55);
        
        const label1 = "I/We have been involved in a discussion with the relevant health professionals over the investigation/treatment/procedure/restraint proposed of:";
        const splitLabel1 = doc.splitTextToSize(label1, pageWidth - margin * 2);
        doc.text(splitLabel1, margin, yPos);
        yPos += (splitLabel1.length * 5) + 2;

        doc.setFont("helvetica", "bold");
        const val1 = assessmentData.proposedTreatmentOf || "N/A";
        const splitVal1 = doc.splitTextToSize(val1, pageWidth - margin * 2);
        doc.text(splitVal1, margin, yPos);
        yPos += (splitVal1.length * 5) + 4;

        doc.setFont("helvetica", "normal");
        const label2 = "for (Explain what treatment is):";
        doc.text(label2, margin, yPos);
        yPos += 5;

        doc.setFont("helvetica", "bold");
        const val2 = assessmentData.treatmentDescription || "N/A";
        const splitVal2 = doc.splitTextToSize(val2, pageWidth - margin * 2);
        doc.text(splitVal2, margin, yPos);
        yPos += (splitVal2.length * 5) + 6;

        // 3. Declaration & Comments
        yPos = await addSectionTitle(ctx, "DECLARATION & COMMENTS", yPos + 2);
        const declarationText = "I/We understand that he/she is unable to give his/her consent. I/We also understand that investigation/treatment/procedure/restraint may lawfully be carried out if it is in his/her best interests to receive it.";
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(107, 114, 128);
        const splitDecl = doc.splitTextToSize(declarationText, pageWidth - margin * 2);
        doc.text(splitDecl, margin, yPos);
        yPos += (splitDecl.length * 5) + 4;

        yPos = await addField(ctx, "Any other comments, including concerns about the decision", assessmentData.otherComments || "N/A", margin, yPos, pageWidth - margin * 2);

        // 4. Sign-off
        yPos = await addSectionTitle(ctx, "SIGN-OFF", yPos + 2);
        yPos = await ensureBIDSpace(40, yPos);
        const rowSignY = yPos;

        let ySign1 = await addField(ctx, "Name", assessmentData.signerName || "N/A", margin, rowSignY, cpWidth, true);
        ySign1 = await addField(ctx, "Relationship to Resident", assessmentData.signerRelationship || "N/A", margin, ySign1 + 1, cpWidth, true);
        ySign1 = await addField(ctx, "Address", assessmentData.signerAddress || "N/A", margin, ySign1 + 1, cpWidth, true);

        let ySign2 = await addField(ctx, "Signature", assessmentData.signerSignature || "N/A", cpCol2, rowSignY, cpWidth, true);
        ySign2 = await addField(ctx, "Date", assessmentData.signerDate ? format(new Date(assessmentData.signerDate), "dd/MM/yyyy") : "N/A", cpCol2, ySign2 + 1, cpWidth, true);

        yPos = Math.max(ySign1, ySign2);

        doc.save(`Best-Interest-Decision-${resident?.last_name || "Resident"}-${format(new Date(), "ddMMyyyy")}.pdf`);
        return;
    }

    const isBedrailConsentForm =
        formName.toUpperCase().includes("BEDRAIL CONSENT") ||
        formName.toUpperCase().includes("BEDRAILS CONSENT") ||
        formName.toUpperCase().includes("BEDRAIL CONSENT / AGREEMENT") ||
        formName.toUpperCase().includes("BEDRAILS CONSENT / AGREEMENT");
    const isRestraintsConsentForm = formName.toUpperCase().includes("CONSENT AND RISK ASSESSMENT FOR RESTRAINTS");

    if (isBedrailConsentForm) {
        type ConsentType = "ABLE_TO_CONSENT" | "UNABLE_TO_CONSENT";
        type ConsentChoice = "CONSENT_TO_USE" | "REFUSE_TO_USE";
        type ResidentPreference = "WOULD_PREFER_USE" | "WOULD_NOT_PREFER_USE";

        interface BedrailAbleSection {
            consentChoice?: ConsentChoice;
            residentSignature?: string;
            staffMemberName?: string;
            staffMemberSignature?: string;
            staffSignatureDate?: string;
        }

        interface BedrailUnableSection {
            representativeName?: string;
            discussionAcknowledged?: boolean;
            residentPreference?: ResidentPreference;
            representativeSignature?: string;
            staffMemberName?: string;
            staffMemberSignature?: string;
            staffSignatureDate?: string;
        }

        interface BedrailAssessmentData {
            residentName?: string;
            bedroomNumber?: string;
            dateOfBirth?: string | number;
            assessment_date?: string | number;
            consentType?: ConsentType;
            ableToConsentSection?: BedrailAbleSection;
            unableToConsentSection?: BedrailUnableSection;
            assessment_data?: BedrailAssessmentData;
        }

        const source = data as BedrailAssessmentData;
        const assessmentData: BedrailAssessmentData = source.assessment_data || source;
        const fullWidth = pageWidth - margin * 2;
        const display = (value: unknown): string => {
            if (value === null || value === undefined) return "Not provided";
            if (typeof value === "string") return value.trim() ? value : "Not provided";
            if (typeof value === "number") return String(value);
            return String(value);
        };
        const displayDateValue = (value: unknown): string => {
            if (value === null || value === undefined || value === "") return "Not provided";
            try {
                const date = new Date(value as string | number);
                if (Number.isNaN(date.getTime())) return display(value);
                return format(date, "dd/MM/yyyy");
            } catch {
                return display(value);
            }
        };
        const yesNo = (value: boolean): string => (value ? "Yes" : "No");

        const consentType = assessmentData.consentType;
        const able = assessmentData.ableToConsentSection || {};
        const unable = assessmentData.unableToConsentSection || {};

        yPos = await addSectionTitle(ctx, "Form Overview", yPos + 2);
        yPos = await addField(ctx, "Resident Name", display(assessmentData.residentName), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Bedroom Number", display(assessmentData.bedroomNumber), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Date of Birth", displayDateValue(assessmentData.dateOfBirth), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Consent Type", display(consentType), margin, yPos, fullWidth);

        if (consentType === "ABLE_TO_CONSENT") {
            yPos = await addSectionTitle(ctx, "Able To Consent Section", yPos + 2);
            yPos = await addField(
                ctx,
                "Consent Statement",
                "I understand that I may be at risk of falling out of bed and would therefore like bed rails/bumpers to be used on my bed.",
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(
                ctx,
                "Consent To Use Bedrails (checkbox)",
                yesNo(able.consentChoice === "CONSENT_TO_USE"),
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(
                ctx,
                "Refusal Statement",
                "I understand that I may be at risk of falling out of bed, but I do NOT want bed rails or bumpers to be used on my bed.",
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(
                ctx,
                "Refuse To Use Bedrails (checkbox)",
                yesNo(able.consentChoice === "REFUSE_TO_USE"),
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(ctx, "Resident Signature", display(able.residentSignature), margin, yPos, fullWidth);
            yPos = await addField(ctx, "Staff Member Name", display(able.staffMemberName), margin, yPos, fullWidth);
            yPos = await addField(ctx, "Staff Member Signature", display(able.staffMemberSignature), margin, yPos, fullWidth);
            yPos = await addField(ctx, "Staff Signature Date", displayDateValue(able.staffSignatureDate), margin, yPos, fullWidth);
        } else if (consentType === "UNABLE_TO_CONSENT") {
            yPos = await addSectionTitle(ctx, "Unable To Consent Section", yPos + 2);
            yPos = await addField(ctx, "Representative Name", display(unable.representativeName), margin, yPos, fullWidth);
            yPos = await addField(
                ctx,
                "Discussion Statement",
                "I have discussed the issue of using bed rails/bumpers with the professionals concerned and based on my knowledge of the resident's previously expressed wishes and beliefs:",
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(
                ctx,
                "Discussion Acknowledged (checkbox)",
                yesNo(unable.discussionAcknowledged === true),
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(
                ctx,
                "Resident would have preferred to use bed rails/bumpers (checkbox)",
                yesNo(unable.residentPreference === "WOULD_PREFER_USE"),
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(
                ctx,
                "Resident would not have preferred to use bed rails/bumpers (checkbox)",
                yesNo(unable.residentPreference === "WOULD_NOT_PREFER_USE"),
                margin,
                yPos,
                fullWidth
            );
            yPos = await addField(ctx, "Representative Signature", display(unable.representativeSignature), margin, yPos, fullWidth);
            yPos = await addField(ctx, "Staff Member Name", display(unable.staffMemberName), margin, yPos, fullWidth);
            yPos = await addField(ctx, "Staff Member Signature", display(unable.staffMemberSignature), margin, yPos, fullWidth);
            yPos = await addField(ctx, "Staff Signature Date", displayDateValue(unable.staffSignatureDate), margin, yPos, fullWidth);
        }
    }

    if (isRestraintsConsentForm) {
        const assessmentData = data.assessment_data || data;
        const selectedRestraints: string[] = Array.isArray(assessmentData.selectedRestraints)
            ? assessmentData.selectedRestraints
            : [];
        const consentType = assessmentData.consentType;
        const ableToConsent = assessmentData.ableToConsent || {};
        const discussionWithRelative = assessmentData.discussionWithRelative || {};
        const fullWidth = pageWidth - margin * 2;
        const cpWidth = (pageWidth - margin * 2) / 2 - 5;

        const toDisplay = (value: unknown): string => {
            if (value === null || value === undefined) return "N/A";
            if (typeof value === "string") return value.trim() ? value : "N/A";
            return String(value);
        };
        const yesNo = (condition: boolean): string => condition ? "Yes" : "No";

        const restraintOptions = [
            "Wheelchair lap belt",
            "Specialised chair with no lap belt",
            "Specialised chair with lap belt",
            "Alarm mat",
            "Crash mat",
            "Bed rails",
            "Door alarms",
            "Chemical restraint"
        ];

        yPos = await addSectionTitle(ctx, "Type of Restraint considered/required", yPos + 2);
        for (const option of restraintOptions) {
            yPos = await addField(ctx, option, yesNo(selectedRestraints.includes(option)), margin, yPos, fullWidth);
        }

        yPos = await addSectionTitle(ctx, "Consent Status", yPos + 2);
        yPos = await addField(ctx, "Resident is able to consent", yesNo(consentType === "ABLE_TO_CONSENT"), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Resident is unable to consent (Relative/Staff Discussion)", yesNo(consentType === "UNABLE_TO_CONSENT"), margin, yPos, fullWidth);

        yPos = await addSectionTitle(ctx, "Persons who are able to Consent", yPos + 2);
        yPos = await addField(ctx, "Name", toDisplay(ableToConsent.name), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Risk Of", toDisplay(ableToConsent.riskOf), margin, yPos, fullWidth);
        yPos = await addField(ctx, "I prefer that restraint is used", yesNo(ableToConsent.preference === "PREFER_USE"), margin, yPos, fullWidth);
        yPos = await addField(ctx, "I do not want any form of restraint used", yesNo(ableToConsent.preference === "DO_NOT_WANT_USE"), margin, yPos, fullWidth);
        const ableSigRowY = yPos;
        const ableSigY1 = await addField(ctx, "Signature Of Person", toDisplay(ableToConsent.personSignature), margin, ableSigRowY, cpWidth, true);
        const ableSigY2 = await addField(ctx, "Date", toDisplay(ableToConsent.personSignatureDate), col2, ableSigRowY, cpWidth, true);
        yPos = Math.max(ableSigY1, ableSigY2) + 2;
        const ableMemberRowY = yPos;
        const ableMemberY1 = await addField(ctx, "Signature Of Member", toDisplay(ableToConsent.memberSignature), margin, ableMemberRowY, cpWidth, true);
        const ableMemberY2 = await addField(ctx, "Date", toDisplay(ableToConsent.memberSignatureDate), col2, ableMemberRowY, cpWidth, true);
        yPos = Math.max(ableMemberY1, ableMemberY2) + 2;

        yPos = await addSectionTitle(ctx, "Discussion with Relative (NOK)", yPos + 2);
        yPos = await addField(ctx, "Relative Name", toDisplay(discussionWithRelative.relativeName), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Issue Of", toDisplay(discussionWithRelative.issueOf), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Resident Name", toDisplay(discussionWithRelative.residentName), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Would have preferred", yesNo(discussionWithRelative.preference === "WOULD_HAVE_PREFERRED"), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Would not have preferred", yesNo(discussionWithRelative.preference === "WOULD_NOT_HAVE_PREFERRED"), margin, yPos, fullWidth);
        yPos = await addField(ctx, "Restraint Used", toDisplay(discussionWithRelative.restraintUsed), margin, yPos, fullWidth);
        const relSigRowY = yPos;
        const relSigY1 = await addField(ctx, "Signature Of Person", toDisplay(discussionWithRelative.personSignature), margin, relSigRowY, cpWidth, true);
        const relSigY2 = await addField(ctx, "Date", toDisplay(discussionWithRelative.personSignatureDate), col2, relSigRowY, cpWidth, true);
        yPos = Math.max(relSigY1, relSigY2) + 2;
        const relMemberRowY = yPos;
        const relMemberY1 = await addField(ctx, "Signature Of Member", toDisplay(discussionWithRelative.memberSignature), margin, relMemberRowY, cpWidth, true);
        const relMemberY2 = await addField(ctx, "Date", toDisplay(discussionWithRelative.memberSignatureDate), col2, relMemberRowY, cpWidth, true);
        yPos = Math.max(relMemberY1, relMemberY2) + 2;

        yPos = await addSectionTitle(ctx, "System Fields", yPos + 2);
        const systemRowY = yPos;
        const systemY1 = await addField(ctx, "Assessment Date", toDisplay(assessmentData.assessmentDate), margin, systemRowY, cpWidth, true);
        const systemY2 = await addField(ctx, "Completed By", toDisplay(assessmentData.completedBy || data.completed_by), col2, systemRowY, cpWidth, true);
        yPos = Math.max(systemY1, systemY2) + 2;
        yPos = await addField(ctx, "Status", toDisplay(assessmentData.status), margin, yPos, fullWidth);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`Generated by CareO System on ${new Date().toLocaleString('en-GB')}`, margin, doc.internal.pageSize.height - 10);

    const safeFormName = toSafeFilePart(formName);
    const safeResidentName = toSafeFilePart(resident?.last_name || "Resident");
    doc.save(`${safeFormName}-${safeResidentName}-${new Date().getTime()}.pdf`);
};
