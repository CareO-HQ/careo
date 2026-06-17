export interface GenerateCareFilePDFOptions {
    formName: string;
    data: any;
    resident: any;
    orgLogoUrl?: string;
    careHomeName?: string;
}

export const generateCareFilePDF = async (options: GenerateCareFilePDFOptions) => {
    const { formName } = options;
    const upperFormName = formName.toUpperCase();

    // 1. Incidents
    if (formName === "BHSCT Incident Report" || formName === "SEHSCT Incident Report") {
        const { generateIncidentPDF } = await import("./pdf/care-file/incidents");
        return generateIncidentPDF(options);
    }

    // 2. Logs
    const isSpecimenLog = upperFormName.includes("SPECIMEN RECORD LOG") || formName.includes("v2-specimen-log");
    const isKeyWorkerDiaryPdf = upperFormName.includes("KEY WORKER DIARY");
    const isProgressNotesPdf = formName === "Progress Notes";
    if (isSpecimenLog || isKeyWorkerDiaryPdf || isProgressNotesPdf) {
        const { generateLogsPDF } = await import("./pdf/care-file/logs");
        return generateLogsPDF(options);
    }

    // 3. Consent & Capacity
    if (
        upperFormName.includes("CAPACITY AND CONSENT") ||
        upperFormName.includes("BEST INTEREST DECISION") ||
        upperFormName.includes("BEDRAIL CONSENT") ||
        upperFormName.includes("CONSENT AND RISK ASSESSMENT FOR RESTRAINTS")
    ) {
        const { generateConsentCapacityPDF } = await import("./pdf/care-file/consent-capacity");
        return generateConsentCapacityPDF(options);
    }

    // 4. Admissions
    if (
        upperFormName.includes("PRE-ADMISSION ASSESSMENT FORM") ||
        (upperFormName.includes("PRE-ADMISSION") && !upperFormName.includes("INFECTION PREVENTION")) ||
        upperFormName.includes("PHOTOGRAPHIC CONSENT") ||
        upperFormName.includes("PHOTOGRAPHY CONSENT") ||
        upperFormName.includes("ADMISSION ASSESSMENT") ||
        (upperFormName.includes("PERSONAL PROFILE") && !upperFormName.includes("CARE PLAN")) ||
        (upperFormName.includes("PEEP") && !upperFormName.includes("CARE PLAN")) ||
        (upperFormName.includes("MOVING") && upperFormName.includes("HANDLING")) ||
        (upperFormName.includes("RESIDENT VALUABLES") && !upperFormName.includes("CARE PLAN"))
    ) {
        const { generateAdmissionsPDF } = await import("./pdf/care-file/admissions");
        return generateAdmissionsPDF(options);
    }

    // 5. Assessments (general risk, fall risk, choking, braden, cornell, smoking, infection, continence, etc.)
    const { generateAssessmentsPDF } = await import("./pdf/care-file/assessments");
    return generateAssessmentsPDF(options);
};
