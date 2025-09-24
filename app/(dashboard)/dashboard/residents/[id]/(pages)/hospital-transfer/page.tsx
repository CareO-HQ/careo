"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { HospitalPassportSchema, HospitalPassportFormData } from "./types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Ambulance,
  User,
  Calendar,
  Clock,
  Plus,
  Eye,
  Phone,
  AlertTriangle,
  FileText,
  Shield,
  Printer,
  Edit,
  FileCheck,
  Trash2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { HospitalPassportDialog } from "./hospital-passport-dialog";
import { ViewPassportDialog } from "./view-passport-dialog";
import { TransferLogDialog } from "./transfer-log-dialog";

type HospitalTransferPageProps = {
  params: Promise<{ id: string }>;
};


export default function HospitalTransferPage({ params }: HospitalTransferPageProps) {
  const { id } = React.use(params);
  const router = useRouter();

  // Memoize the resident ID to prevent unnecessary re-renders
  const residentId = React.useMemo(() => id as Id<"residents">, [id]);

  const resident = useQuery(api.residents.getById, {
    residentId
  });

  // Only fetch diet information if resident exists
  const dietInformation = useQuery(
    api.diet.getDietByResidentId,
    resident ? { residentId } : "skip"
  );

  // Only fetch hospital passports if resident exists
  const hospitalPassports = useQuery(
    api.hospitalPassports.getByResidentId,
    resident ? { residentId } : "skip"
  );

  // Only fetch transfer logs if resident exists
  const transferLogs = useQuery(
    api.hospitalTransferLogs.getByResidentId,
    resident ? { residentId } : "skip"
  );

  // Get today's date and time
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString().slice(0, 16);

  // Helper function to format allergies from diet information
  const formatAllergies = React.useCallback((allergies: any[]) => {
    if (!allergies || !Array.isArray(allergies) || allergies.length === 0) {
      return "";
    }
    return allergies.map(item =>
      typeof item === 'string' ? item : item.allergy
    ).join(', ');
  }, []);

  // Multi-step form state
  const [currentStep, setCurrentStep] = React.useState(1);
  const totalSteps = 4;

  // Form setup
  const form = useForm<HospitalPassportFormData>({
    resolver: zodResolver(HospitalPassportSchema),
    defaultValues: {
      generalDetails: {
        personName: `${resident?.firstName || ""} ${resident?.lastName || ""}`.trim(),
        knownAs: resident?.firstName || "",
        dateOfBirth: resident?.dateOfBirth || "",
        nhsNumber: resident?.nhsHealthNumber || "",
        religion: "",
        weightOnTransfer: "",
        careType: "residential",
        transferDateTime: now,
        accompaniedBy: "",
        englishFirstLanguage: "yes",
        firstLanguage: "",
        careHomeName: "",
        careHomeAddress: "",
        careHomePhone: "",
        hospitalName: "",
        hospitalAddress: "",
        hospitalPhone: "",
        nextOfKinName: resident?.emergencyContacts?.[0]?.name || "",
        nextOfKinAddress: resident?.emergencyContacts?.[0]?.address || "",
        nextOfKinPhone: resident?.emergencyContacts?.[0]?.phoneNumber || "",
        gpName: resident?.gpName || "",
        gpAddress: resident?.gpAddress || "",
        gpPhone: resident?.gpPhone || "",
        careManagerName: resident?.careManagerName || "",
        careManagerAddress: resident?.careManagerAddress || "",
        careManagerPhone: resident?.careManagerPhone || "",
      },
      medicalCareNeeds: {
        situation: "",
        background: "",
        assessment: "",
        recommendations: "",
        pastMedicalHistory: "",
        knownAllergies: formatAllergies(dietInformation?.allergies || []),
        historyOfConfusion: "no",
        learningDisabilityMentalHealth: "",
        communicationIssues: "",
        hearingAid: false,
        glasses: false,
        otherAids: "",
        mobilityAssistance: "independent",
        mobilityAids: "",
        historyOfFalls: false,
        dateOfLastFall: "",
        toiletingAssistance: "independent",
        continenceStatus: "continent",
        nutritionalAssistance: "independent",
        dietType: "",
        swallowingDifficulties: false,
        enteralNutrition: false,
        mustScore: "",
        personalHygieneAssistance: "independent",
        topDentures: false,
        bottomDentures: false,
        denturesAccompanying: false,
      },
      skinMedicationAttachments: {
        skinIntegrityAssistance: "independent",
        bradenScore: "",
        skinStateOnTransfer: "",
        currentSkinCareRegime: "",
        pressureRelievingEquipment: "",
        knownToTVN: false,
        tvnName: "",
        currentMedicationRegime: "",
        lastMedicationDateTime: now,
        lastMealDrinkDateTime: now,
        attachments: {
          currentMedications: false,
          bodyMap: false,
          observations: false,
          dnacprForm: false,
          enteralFeedingRegime: false,
          other: false,
          otherSpecify: "",
        },
      },
      signOff: {
        signature: "",
        printedName: "",
        designation: "",
        contactPhone: "",
        completedDate: today,
      },
    },
  });

  // Dialog states
  const [isTransferDialogOpen, setIsTransferDialogOpen] = React.useState(false);
  const [isEditPassportDialogOpen, setIsEditPassportDialogOpen] = React.useState(false);
  const [isViewPassportDialogOpen, setIsViewPassportDialogOpen] = React.useState(false);
  const [isTransferLogDialogOpen, setIsTransferLogDialogOpen] = React.useState(false);
  const [selectedPassport, setSelectedPassport] = React.useState<any>(null);
  const [editingPassport, setEditingPassport] = React.useState<any>(null);

  // Auth data
  const { data: user } = authClient.useSession();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  // Update form with resident data when resident loads
  React.useEffect(() => {
    if (resident) {
      const fullName = `${resident.firstName || ""} ${resident.lastName || ""}`.trim();
      form.setValue('generalDetails.personName', fullName);
      form.setValue('generalDetails.knownAs', resident.firstName || "");
      form.setValue('generalDetails.dateOfBirth', resident.dateOfBirth || "");
      form.setValue('generalDetails.nhsNumber', resident.nhsHealthNumber || "");

      // Update contact information
      if (resident.emergencyContacts?.[0]) {
        form.setValue('generalDetails.nextOfKinName', resident.emergencyContacts[0].name || "");
        form.setValue('generalDetails.nextOfKinAddress', resident.emergencyContacts[0].address || "");
        form.setValue('generalDetails.nextOfKinPhone', resident.emergencyContacts[0].phoneNumber || "");
      }

      // Update GP information
      form.setValue('generalDetails.gpName', resident.gpName || "");
      form.setValue('generalDetails.gpAddress', resident.gpAddress || "");
      form.setValue('generalDetails.gpPhone', resident.gpPhone || "");

      // Update Care Manager information
      form.setValue('generalDetails.careManagerName', resident.careManagerName || "");
      form.setValue('generalDetails.careManagerAddress', resident.careManagerAddress || "");
      form.setValue('generalDetails.careManagerPhone', resident.careManagerPhone || "");
    }
  }, [resident, form]);

  // Update form with diet information when it loads
  React.useEffect(() => {
    if (dietInformation) {
      // Update known allergies from diet information
      const allergiesString = formatAllergies(dietInformation.allergies || []);
      form.setValue('medicalCareNeeds.knownAllergies', allergiesString);
    }
  }, [dietInformation, form, formatAllergies]);

  // Update staff field when user data loads
  React.useEffect(() => {
    if (user?.user) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('signOff.printedName', staffName);
      form.setValue('signOff.signature', staffName);
    }
  }, [user, form]);

  // Navigation helpers
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Mutations for updating data
  const updateEmergencyContactMutation = useMutation(api.residents.updateEmergencyContact);
  const updateResidentMutation = useMutation(api.residents.update);
  const createHospitalPassportMutation = useMutation(api.hospitalPassports.create);
  const updateHospitalPassportMutation = useMutation(api.hospitalPassports.update);
  const deleteHospitalPassportMutation = useMutation(api.hospitalPassports.deleteHospitalPassport);
  const createTransferLogMutation = useMutation(api.hospitalTransferLogs.create);

  // Create separate form for editing
  const editForm = useForm<HospitalPassportFormData>({
    resolver: zodResolver(HospitalPassportSchema),
    defaultValues: {
      generalDetails: {
        personName: "",
        knownAs: "",
        dateOfBirth: "",
        nhsNumber: "",
        religion: "",
        weightOnTransfer: "",
        careType: "residential",
        transferDateTime: now,
        accompaniedBy: "",
        englishFirstLanguage: "yes",
        firstLanguage: "",
        careHomeName: "",
        careHomeAddress: "",
        careHomePhone: "",
        hospitalName: "",
        hospitalAddress: "",
        hospitalPhone: "",
        nextOfKinName: "",
        nextOfKinAddress: "",
        nextOfKinPhone: "",
        gpName: "",
        gpAddress: "",
        gpPhone: "",
        careManagerName: "",
        careManagerAddress: "",
        careManagerPhone: "",
      },
      medicalCareNeeds: {
        situation: "",
        background: "",
        assessment: "",
        recommendations: "",
        pastMedicalHistory: "",
        knownAllergies: "",
        historyOfConfusion: "no",
        learningDisabilityMentalHealth: "",
        communicationIssues: "",
        hearingAid: false,
        glasses: false,
        otherAids: "",
        mobilityAssistance: "independent",
        mobilityAids: "",
        historyOfFalls: false,
        dateOfLastFall: "",
        toiletingAssistance: "independent",
        continenceStatus: "continent",
        nutritionalAssistance: "independent",
        dietType: "",
        swallowingDifficulties: false,
        enteralNutrition: false,
        mustScore: "",
        personalHygieneAssistance: "independent",
        topDentures: false,
        bottomDentures: false,
        denturesAccompanying: false,
      },
      skinMedicationAttachments: {
        skinIntegrityAssistance: "independent",
        bradenScore: "",
        skinStateOnTransfer: "",
        currentSkinCareRegime: "",
        pressureRelievingEquipment: "",
        knownToTVN: false,
        tvnName: "",
        currentMedicationRegime: "",
        lastMedicationDateTime: now,
        lastMealDrinkDateTime: now,
        attachments: {
          currentMedications: false,
          bodyMap: false,
          observations: false,
          dnacprForm: false,
          enteralFeedingRegime: false,
          other: false,
          otherSpecify: "",
        },
      },
      signOff: {
        signature: "",
        printedName: "",
        designation: "",
        contactPhone: "",
        completedDate: today,
      },
    },
  });

  // Edit step state
  const [editCurrentStep, setEditCurrentStep] = React.useState(1);

  // Edit navigation helpers
  const editNextStep = () => {
    if (editCurrentStep < totalSteps) {
      setEditCurrentStep(editCurrentStep + 1);
    }
  };

  const editPrevStep = () => {
    if (editCurrentStep > 1) {
      setEditCurrentStep(editCurrentStep - 1);
    }
  };

  // Edit step validation
  const validateEditCurrentStep = async () => {
    let fieldsToValidate: any[] = [];

    switch (editCurrentStep) {
      case 1:
        fieldsToValidate = [
          'generalDetails.personName',
          'generalDetails.knownAs',
          'generalDetails.dateOfBirth',
          'generalDetails.nhsNumber',
          'generalDetails.transferDateTime',
          'generalDetails.careHomeName',
          'generalDetails.careHomeAddress',
          'generalDetails.careHomePhone',
          'generalDetails.hospitalName',
          'generalDetails.hospitalAddress',
          'generalDetails.nextOfKinName',
          'generalDetails.nextOfKinAddress',
          'generalDetails.nextOfKinPhone',
          'generalDetails.gpName',
          'generalDetails.gpAddress',
          'generalDetails.gpPhone',
        ];
        break;
      case 2:
        fieldsToValidate = [
          'medicalCareNeeds.situation',
          'medicalCareNeeds.background',
          'medicalCareNeeds.assessment',
          'medicalCareNeeds.recommendations',
          'medicalCareNeeds.pastMedicalHistory',
        ];
        break;
      case 3:
        fieldsToValidate = [
          'skinMedicationAttachments.skinStateOnTransfer',
          'skinMedicationAttachments.currentMedicationRegime',
          'skinMedicationAttachments.lastMedicationDateTime',
        ];
        break;
      case 4:
        fieldsToValidate = [
          'signOff.signature',
          'signOff.printedName',
          'signOff.designation',
          'signOff.contactPhone',
          'signOff.completedDate',
        ];
        break;
    }

    const result = await editForm.trigger(fieldsToValidate as any);
    return result;
  };

  const handleEditNextStep = async () => {
    const isValid = await validateEditCurrentStep();
    if (isValid) {
      editNextStep();
    }
  };

  // Handler to open edit dialog and populate form
  const handleEditPassport = (passport: any) => {
    setEditingPassport(passport);

    // Populate the edit form with existing passport data
    editForm.reset({
      generalDetails: passport.generalDetails,
      medicalCareNeeds: passport.medicalCareNeeds,
      skinMedicationAttachments: passport.skinMedicationAttachments,
      signOff: passport.signOff,
    });

    setEditCurrentStep(1);
    setIsEditPassportDialogOpen(true);
  };

  // Handler for printing individual passport
  const handlePrintPassport = (passport: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString();
    };

    const formatDateTime = (dateString: string) => {
      return new Date(dateString).toLocaleString();
    };

    const formatAssistanceLevel = (level: string) => {
      return level.charAt(0).toUpperCase() + level.slice(1);
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hospital Passport - ${passport.generalDetails.personName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #2563eb;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 8px;
              margin-bottom: 15px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 15px;
            }
            .info-item {
              margin-bottom: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #374151;
            }
            .info-value {
              margin-top: 2px;
              color: #6b7280;
            }
            .full-width {
              grid-column: 1 / -1;
            }
            .checkbox-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin: 10px 0;
            }
            .checkbox-item {
              display: flex;
              align-items: center;
              gap: 5px;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Hospital Passport</h1>
            <h2>${passport.generalDetails.personName}</h2>
            <p>Generated: ${formatDateTime(passport.createdAt)}</p>
          </div>

          <div class="section">
            <div class="section-title">General & Transfer Details</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Name of Person</div>
                <div class="info-value">${passport.generalDetails.personName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Known As</div>
                <div class="info-value">${passport.generalDetails.knownAs}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date of Birth</div>
                <div class="info-value">${formatDate(passport.generalDetails.dateOfBirth)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">NHS Number</div>
                <div class="info-value">${passport.generalDetails.nhsNumber}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Religion</div>
                <div class="info-value">${passport.generalDetails.religion || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Weight on Transfer</div>
                <div class="info-value">${passport.generalDetails.weightOnTransfer || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Care Type</div>
                <div class="info-value">${formatAssistanceLevel(passport.generalDetails.careType || 'Not specified')}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Transfer Date/Time</div>
                <div class="info-value">${formatDateTime(passport.generalDetails.transferDateTime)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Accompanied By</div>
                <div class="info-value">${passport.generalDetails.accompaniedBy || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">English First Language</div>
                <div class="info-value">${passport.generalDetails.englishFirstLanguage === 'yes' ? 'Yes' : 'No'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">First Language</div>
                <div class="info-value">${passport.generalDetails.firstLanguage || 'Not specified'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Care Home & Hospital Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Care Home Name</div>
                <div class="info-value">${passport.generalDetails.careHomeName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Care Home Phone</div>
                <div class="info-value">${passport.generalDetails.careHomePhone}</div>
              </div>
              <div class="info-item full-width">
                <div class="info-label">Care Home Address</div>
                <div class="info-value">${passport.generalDetails.careHomeAddress}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Hospital Name</div>
                <div class="info-value">${passport.generalDetails.hospitalName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Hospital Phone</div>
                <div class="info-value">${passport.generalDetails.hospitalPhone || 'Not specified'}</div>
              </div>
              <div class="info-item full-width">
                <div class="info-label">Hospital Address</div>
                <div class="info-value">${passport.generalDetails.hospitalAddress}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Contact Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Next of Kin Name</div>
                <div class="info-value">${passport.generalDetails.nextOfKinName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Next of Kin Phone</div>
                <div class="info-value">${passport.generalDetails.nextOfKinPhone}</div>
              </div>
              <div class="info-item full-width">
                <div class="info-label">Next of Kin Address</div>
                <div class="info-value">${passport.generalDetails.nextOfKinAddress}</div>
              </div>
              <div class="info-item">
                <div class="info-label">GP Name</div>
                <div class="info-value">${passport.generalDetails.gpName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">GP Phone</div>
                <div class="info-value">${passport.generalDetails.gpPhone}</div>
              </div>
              <div class="info-item full-width">
                <div class="info-label">GP Address</div>
                <div class="info-value">${passport.generalDetails.gpAddress}</div>
              </div>
              ${passport.generalDetails.careManagerName ? `
              <div class="info-item">
                <div class="info-label">Care Manager Name</div>
                <div class="info-value">${passport.generalDetails.careManagerName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Care Manager Phone</div>
                <div class="info-value">${passport.generalDetails.careManagerPhone || 'Not specified'}</div>
              </div>
              <div class="info-item full-width">
                <div class="info-label">Care Manager Address</div>
                <div class="info-value">${passport.generalDetails.careManagerAddress || 'Not specified'}</div>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Medical & Care Needs</div>
            <div class="info-item full-width">
              <div class="info-label">Situation</div>
              <div class="info-value">${passport.medicalCareNeeds.situation}</div>
            </div>
            <div class="info-item full-width">
              <div class="info-label">Background</div>
              <div class="info-value">${passport.medicalCareNeeds.background}</div>
            </div>
            <div class="info-item full-width">
              <div class="info-label">Assessment</div>
              <div class="info-value">${passport.medicalCareNeeds.assessment}</div>
            </div>
            <div class="info-item full-width">
              <div class="info-label">Recommendations</div>
              <div class="info-value">${passport.medicalCareNeeds.recommendations}</div>
            </div>
            <div class="info-item full-width">
              <div class="info-label">Past Medical History</div>
              <div class="info-value">${passport.medicalCareNeeds.pastMedicalHistory}</div>
            </div>
            <div class="info-item full-width">
              <div class="info-label">Known Allergies</div>
              <div class="info-value">${passport.medicalCareNeeds.knownAllergies || 'None specified'}</div>
            </div>

            <div style="margin-top: 20px;">
              <div class="info-label">Care Assistance Levels</div>
              <div class="info-grid" style="margin-top: 10px;">
                <div class="info-item">
                  <div class="info-label">Mobility Assistance</div>
                  <div class="info-value">${formatAssistanceLevel(passport.medicalCareNeeds.mobilityAssistance)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Toileting Assistance</div>
                  <div class="info-value">${formatAssistanceLevel(passport.medicalCareNeeds.toiletingAssistance)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Nutritional Assistance</div>
                  <div class="info-value">${formatAssistanceLevel(passport.medicalCareNeeds.nutritionalAssistance)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Personal Hygiene Assistance</div>
                  <div class="info-value">${formatAssistanceLevel(passport.medicalCareNeeds.personalHygieneAssistance)}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Skin, Medication & Attachments</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Skin Integrity Assistance</div>
                <div class="info-value">${formatAssistanceLevel(passport.skinMedicationAttachments.skinIntegrityAssistance)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Braden Score</div>
                <div class="info-value">${passport.skinMedicationAttachments.bradenScore || 'Not specified'}</div>
              </div>
              <div class="info-item full-width">
                <div class="info-label">Skin State on Transfer</div>
                <div class="info-value">${passport.skinMedicationAttachments.skinStateOnTransfer}</div>
              </div>
              <div class="info-item full-width">
                <div class="info-label">Current Medication Regime</div>
                <div class="info-value">${passport.skinMedicationAttachments.currentMedicationRegime}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Last Medication Date/Time</div>
                <div class="info-value">${formatDateTime(passport.skinMedicationAttachments.lastMedicationDateTime)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Last Meal/Drink Date/Time</div>
                <div class="info-value">${passport.skinMedicationAttachments.lastMealDrinkDateTime ? formatDateTime(passport.skinMedicationAttachments.lastMealDrinkDateTime) : 'Not specified'}</div>
              </div>
            </div>

            <div style="margin-top: 20px;">
              <div class="info-label">Attachments</div>
              <div class="checkbox-grid">
                <div class="checkbox-item">
                  <span>${passport.skinMedicationAttachments.attachments.currentMedications ? '✓' : '☐'}</span>
                  <span>Current Medications</span>
                </div>
                <div class="checkbox-item">
                  <span>${passport.skinMedicationAttachments.attachments.bodyMap ? '✓' : '☐'}</span>
                  <span>Body Map</span>
                </div>
                <div class="checkbox-item">
                  <span>${passport.skinMedicationAttachments.attachments.observations ? '✓' : '☐'}</span>
                  <span>Observations</span>
                </div>
                <div class="checkbox-item">
                  <span>${passport.skinMedicationAttachments.attachments.dnacprForm ? '✓' : '☐'}</span>
                  <span>DNACPR Form</span>
                </div>
                <div class="checkbox-item">
                  <span>${passport.skinMedicationAttachments.attachments.enteralFeedingRegime ? '✓' : '☐'}</span>
                  <span>Enteral Feeding Regime</span>
                </div>
                <div class="checkbox-item">
                  <span>${passport.skinMedicationAttachments.attachments.other ? '✓' : '☐'}</span>
                  <span>Other</span>
                </div>
              </div>
              ${passport.skinMedicationAttachments.attachments.otherSpecify ? `
              <div class="info-item" style="margin-top: 10px;">
                <div class="info-label">Other Specify</div>
                <div class="info-value">${passport.skinMedicationAttachments.attachments.otherSpecify}</div>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Sign-off</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Signature</div>
                <div class="info-value">${passport.signOff.signature}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Printed Name</div>
                <div class="info-value">${passport.signOff.printedName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Designation</div>
                <div class="info-value">${passport.signOff.designation}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Contact Phone</div>
                <div class="info-value">${passport.signOff.contactPhone}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Completed Date</div>
                <div class="info-value">${formatDate(passport.signOff.completedDate)}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  // Handler for creating transfer log
  const handleTransferLogSubmit = async (data: any) => {
    try {
      if (!activeOrganization?.id || !user?.user?.id) {
        toast.error("Missing organization or user information");
        return;
      }

      await createTransferLogMutation({
        residentId: residentId,
        date: data.date,
        hospitalName: data.hospitalName,
        reason: data.reason,
        outcome: data.outcome,
        followUp: data.followUp,
        filesChanged: data.filesChanged,
        organizationId: activeOrganization.id,
        teamId: resident?.teamId || "",
        createdBy: user.user.id,
      });

      toast.success("Transfer log added successfully");
      setIsTransferLogDialogOpen(false);
    } catch (error) {
      console.error("Error creating transfer log:", error);
      toast.error("Failed to add transfer log");
    }
  };

  // Handler for editing existing passport
  const handleEditSubmit = async (data: HospitalPassportFormData) => {
    try {
      if (!editingPassport?._id) {
        toast.error("No passport selected for editing");
        return;
      }

      // Update the hospital passport
      await updateHospitalPassportMutation({
        hospitalPassportId: editingPassport._id,
        generalDetails: data.generalDetails,
        medicalCareNeeds: data.medicalCareNeeds,
        skinMedicationAttachments: data.skinMedicationAttachments,
        signOff: data.signOff,
      });

      toast.success("Hospital Passport updated successfully");
      setIsEditPassportDialogOpen(false);
      setEditingPassport(null);
      setEditCurrentStep(1);
    } catch (error) {
      console.error("Error updating hospital passport:", error);
      toast.error("Failed to update Hospital Passport");
    }
  };

  // Handler for deleting passport
  const handleDeletePassport = async (passport: any) => {
    try {
      if (!passport?._id) {
        toast.error("No passport selected for deletion");
        return;
      }

      // Show confirmation dialog
      const confirmed = window.confirm(
        `Are you sure you want to delete this Hospital Passport?\n\nThis action cannot be undone.`
      );

      if (!confirmed) {
        return;
      }

      // Delete the hospital passport
      await deleteHospitalPassportMutation({
        hospitalPassportId: passport._id,
      });

      toast.success("Hospital Passport deleted successfully");
    } catch (error) {
      console.error("Error deleting hospital passport:", error);
      toast.error("Failed to delete Hospital Passport");
    }
  };

  const handleSubmit = async (data: HospitalPassportFormData) => {
    try {
      // Update Next of Kin information in emergencyContacts table
      if (resident?.emergencyContacts?.[0]?._id) {
        const primaryContact = resident.emergencyContacts[0];
        const hasNextOfKinChanges =
          data.generalDetails.nextOfKinName !== primaryContact.name ||
          data.generalDetails.nextOfKinAddress !== primaryContact.address ||
          data.generalDetails.nextOfKinPhone !== primaryContact.phoneNumber;

        if (hasNextOfKinChanges) {
          await updateEmergencyContactMutation({
            contactId: primaryContact._id,
            name: data.generalDetails.nextOfKinName,
            address: data.generalDetails.nextOfKinAddress || undefined,
            phoneNumber: data.generalDetails.nextOfKinPhone,
          });
        }
      }

      // Update GP and Care Manager information in residents table
      const hasResidentChanges =
        data.generalDetails.gpName !== resident?.gpName ||
        data.generalDetails.gpAddress !== resident?.gpAddress ||
        data.generalDetails.gpPhone !== resident?.gpPhone ||
        data.generalDetails.careManagerName !== resident?.careManagerName ||
        data.generalDetails.careManagerAddress !== resident?.careManagerAddress ||
        data.generalDetails.careManagerPhone !== resident?.careManagerPhone;

      if (hasResidentChanges) {
        await updateResidentMutation({
          residentId: residentId,
          gpName: data.generalDetails.gpName,
          gpAddress: data.generalDetails.gpAddress,
          gpPhone: data.generalDetails.gpPhone,
          careManagerName: data.generalDetails.careManagerName,
          careManagerAddress: data.generalDetails.careManagerAddress,
          careManagerPhone: data.generalDetails.careManagerPhone,
        });
      }

      // Save Hospital Passport data to database
      if (!activeOrganization?.id || !user?.user?.id) {
        toast.error("Missing organization or user information");
        return;
      }

      const hospitalPassportId = await createHospitalPassportMutation({
        residentId: residentId,
        generalDetails: data.generalDetails,
        medicalCareNeeds: data.medicalCareNeeds,
        skinMedicationAttachments: data.skinMedicationAttachments,
        signOff: data.signOff,
        organizationId: activeOrganization.id,
        teamId: resident?.teamId || "",
        createdBy: user.user.id,
        status: "completed",
      });

      console.log("Hospital Passport saved with ID:", hospitalPassportId);

      toast.success("Hospital Passport generated and saved successfully");
      form.reset();
      setIsTransferDialogOpen(false);
      setCurrentStep(1);
    } catch (error) {
      console.error("Error generating hospital passport:", error);
      toast.error("Failed to generate Hospital Passport");
    }
  };

  // Step validation before moving to next step
  const validateCurrentStep = async () => {
    let fieldsToValidate: any[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = [
          'generalDetails.personName',
          'generalDetails.knownAs',
          'generalDetails.dateOfBirth',
          'generalDetails.nhsNumber',
          'generalDetails.transferDateTime',
          'generalDetails.careHomeName',
          'generalDetails.careHomeAddress',
          'generalDetails.careHomePhone',
          'generalDetails.hospitalName',
          'generalDetails.hospitalAddress',
          'generalDetails.nextOfKinName',
          'generalDetails.nextOfKinAddress',
          'generalDetails.nextOfKinPhone',
          'generalDetails.gpName',
          'generalDetails.gpAddress',
          'generalDetails.gpPhone',
        ];
        break;
      case 2:
        fieldsToValidate = [
          'medicalCareNeeds.situation',
          'medicalCareNeeds.background',
          'medicalCareNeeds.assessment',
          'medicalCareNeeds.recommendations',
          'medicalCareNeeds.pastMedicalHistory',
        ];
        break;
      case 3:
        fieldsToValidate = [
          'skinMedicationAttachments.skinStateOnTransfer',
          'skinMedicationAttachments.currentMedicationRegime',
          'skinMedicationAttachments.lastMedicationDateTime',
        ];
        break;
      case 4:
        fieldsToValidate = [
          'signOff.signature',
          'signOff.printedName',
          'signOff.designation',
          'signOff.contactPhone',
          'signOff.completedDate',
        ];
        break;
    }

    const result = await form.trigger(fieldsToValidate as any);
    return result;
  };

  const handleNextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      nextStep();
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };


  if (resident === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading resident...</p>
        </div>
      </div>
    );
  }

  if (resident === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold">Resident not found</p>
          <p className="text-muted-foreground">
            The resident you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${resident.firstName} ${resident.lastName}`;
  const initials = `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/residents/${id}`)}
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
        >
          {fullName}
        </Button>
        <span>/</span>
        <span className="text-foreground">Hospital Transfer</span>
      </div>

      {/* Header with Back Button */}
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Ambulance className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Hospital Transfer</h1>
            <p className="text-muted-foreground text-sm">Emergency transfers & hospital admissions</p>
          </div>
        </div>
      </div>

      {/* Resident Info Card - Matching daily-care pattern */}
      <Card className="border-0">
        <CardContent className="p-4">
          {/* Mobile Layout */}
          <div className="flex flex-col space-y-4 sm:hidden">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate">{fullName}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Emergency Ready
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-3">
          
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer/documents`)}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                View History
              </Button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-15 h-15">
                <AvatarImage
                  src={resident.imageUrl}
                  alt={fullName}
                  className="border"
                />
                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{fullName}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
                    Room {resident.roomNumber || "N/A"}
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {calculateAge(resident.dateOfBirth)} years old
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Emergency Ready
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
       
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer/documents`)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                Transfer History
              </Button>
              <Button
              className=" bg-green-500 hover:bg-green-700 text-white"
              onClick={() => setIsTransferLogDialogOpen(true)}
            >
              <Ambulance className="w-6 h-6 mr-3" />
              Add Transfer Log
            </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span>Emergency Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">GP Contact</span>
              </div>
              <p className="text-sm text-blue-800">
                {resident.gpName || "Not specified"}
              </p>
              <p className="text-xs text-blue-600">
                {resident.gpPhone || "No phone number"}
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">Next of Kin</span>
              </div>
              <p className="text-sm text-green-800">
                {resident.emergencyContacts?.[0]?.name || "Not specified"}
              </p>
              <p className="text-xs text-green-600">
                {resident.emergencyContacts?.[0]?.phoneNumber || "No phone number"}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-purple-900">NHS Number</span>
              </div>
              <p className="text-sm text-purple-800 font-mono">
                {resident.nhsHealthNumber || "Not specified"}
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-900">Known Risks</span>
              </div>
              {resident.risks && Array.isArray(resident.risks) && resident.risks.length > 0 ? (
                <div className="space-y-1">
                  {resident.risks.slice(0, 3).map((risk: any, index: number) => {
                    const riskText = typeof risk === 'string' ? risk : risk.risk;
                    const riskLevel = typeof risk === 'object' ? risk.level : undefined;
                    return (
                      <div key={index} className="flex items-center space-x-1">
                        <span className="text-xs text-red-800">•</span>
                        <span className="text-xs text-red-800 truncate">{riskText}</span>
                        {riskLevel && (
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${
                            riskLevel === 'high' ? 'bg-red-100 text-red-700 border-red-300' :
                            riskLevel === 'medium' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                            'bg-yellow-100 text-yellow-700 border-yellow-300'
                          }`}>
                            {riskLevel}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                  {resident.risks.length > 3 && (
                    <span className="text-xs text-red-600 font-medium">+{resident.risks.length - 3} more</span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-red-600">No risks identified</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hospital Passport Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>Hospital Passport</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hospitalPassports && hospitalPassports.length > 0 ? (
            // Show the single passport for this resident
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-6 shadow-sm">
              {/* Passport Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  {/* Passport Photo */}
                  <div className="relative">
                    <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
                      <AvatarImage
                        src={resident.imageUrl}
                        alt={fullName}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                      <FileCheck className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{fullName}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-600">Room:</span>
                        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                          {resident.roomNumber || "N/A"}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-600">Age:</span>
                        <span className="text-gray-800">{calculateAge(resident.dateOfBirth)} years</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-600">NHS:</span>
                        <span className="text-gray-800 font-mono text-xs">
                          {resident.nhsHealthNumber || "Not specified"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-600">DOB:</span>
                        <span className="text-gray-800">
                          {new Date(resident.dateOfBirth).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Passport Info */}
                    <div className="mt-3 pt-3 border-t border-indigo-200">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-indigo-700">
                          <span className="font-medium">Passport Created:</span>{" "}
                          {new Date(hospitalPassports[0].createdAt).toLocaleDateString()}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            hospitalPassports[0].status === 'completed'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}
                        >
                          {hospitalPassports[0].status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                    onClick={() => {
                      setSelectedPassport(hospitalPassports[0]);
                      setIsViewPassportDialogOpen(true);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                    onClick={() => handleEditPassport(hospitalPassports[0])}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    onClick={() => handlePrintPassport(hospitalPassports[0])}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => handleDeletePassport(hospitalPassports[0])}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-indigo-200">
                <div className="text-center">
                  <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
                    Transfer To
                  </div>
                  <div className="mt-1 text-sm text-gray-900 font-medium">
                    {hospitalPassports[0].generalDetails.hospitalName || "Not specified"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
                    Next of Kin
                  </div>
                  <div className="mt-1 text-sm text-gray-900 font-medium">
                    {hospitalPassports[0].generalDetails.nextOfKinName || "Not specified"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
                    Emergency Contact
                  </div>
                  <div className="mt-1 text-sm text-gray-900 font-medium">
                    {hospitalPassports[0].generalDetails.nextOfKinPhone || "Not specified"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Show generate passport button when no passport exists
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Hospital Passport</h3>
                <p className="text-sm text-gray-600 mb-4 max-w-md">
                  Generate a Hospital Passport to have quick access to essential patient information for emergency transfers.
                </p>
                <Button
                  onClick={() => setIsTransferDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 text-base"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Generate Hospital Passport
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>



      {/* Recent Transfer Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <span>Transfer Logs</span>
            <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700 ml-auto">
              {transferLogs?.length || 0} Total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transferLogs && transferLogs.length > 0 ? (
            <div className="space-y-3">
              {transferLogs.slice(0, 5).map((log: any) => (
                <div key={log._id} className="p-3 border rounded-lg bg-white">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-sm text-gray-900">
                          {log.hospitalName}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-xs bg-red-50 text-red-700 border-red-200"
                        >
                          Transfer
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(log.date).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>Added {new Date(log.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">Reason</span>
                        <p className="text-gray-700 font-medium mt-1">{log.reason}</p>
                      </div>
                      {log.outcome && (
                        <div>
                          <span className="text-gray-500">Outcome</span>
                          <p className="text-gray-700 font-medium mt-1">{log.outcome}</p>
                        </div>
                      )}
                      {log.followUp && (
                        <div className="md:col-span-2">
                          <span className="text-gray-500">Follow Up</span>
                          <p className="text-gray-700 font-medium mt-1">{log.followUp}</p>
                        </div>
                      )}
                    </div>

                    {log.filesChanged && (log.filesChanged.carePlan || log.filesChanged.riskAssessment || log.filesChanged.other) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-500">Files Updated:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {log.filesChanged.carePlan && (
                            <Badge variant="outline" className="text-xs">
                              Care Plan
                            </Badge>
                          )}
                          {log.filesChanged.riskAssessment && (
                            <Badge variant="outline" className="text-xs">
                              Risk Assessment
                            </Badge>
                          )}
                          {log.filesChanged.other && (
                            <Badge variant="outline" className="text-xs">
                              {log.filesChanged.other}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {transferLogs.length > 5 && (
                <div className="text-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    View All {transferLogs.length} Logs
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="flex justify-center mb-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Ambulance className="w-6 h-6 text-gray-400" />
                </div>
              </div>
              <p className="text-gray-600 font-medium text-sm mb-1">No transfer logs</p>
              <p className="text-xs text-gray-500 mb-3">
                Start tracking hospital transfers
              </p>
              <Button
                size="sm"
                onClick={() => setIsTransferLogDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Transfer Log
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hospital Passport Dialog */}
      <HospitalPassportDialog
        open={isTransferDialogOpen}
        onOpenChange={setIsTransferDialogOpen}
        form={form}
        onSubmit={handleSubmit}
        residentName={fullName}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        handleNextStep={handleNextStep}
        prevStep={prevStep}
      />

      {/* Edit Passport Dialog */}
      <HospitalPassportDialog
        open={isEditPassportDialogOpen}
        onOpenChange={setIsEditPassportDialogOpen}
        form={editForm}
        onSubmit={handleEditSubmit}
        residentName={fullName}
        currentStep={editCurrentStep}
        setCurrentStep={setEditCurrentStep}
        handleNextStep={handleEditNextStep}
        prevStep={editPrevStep}
        isEditMode={true}
      />

      {/* View Passport Dialog */}
      <ViewPassportDialog
        open={isViewPassportDialogOpen}
        onOpenChange={setIsViewPassportDialogOpen}
        passport={selectedPassport}
        resident={resident}
      />

      {/* Transfer Log Dialog */}
      <TransferLogDialog
        open={isTransferLogDialogOpen}
        onOpenChange={setIsTransferLogDialogOpen}
        onSubmit={handleTransferLogSubmit}
        residentName={fullName}
      />
    </div>
  );
}