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
  Plus,
  Eye,
  Phone,
  AlertTriangle,
  FileText,
  Shield,
  Printer,
  Edit,
  FileCheck,
  Trash2,
  Pill,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cross,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { HospitalPassportDialog } from "./hospital-passport-dialog";
import { ViewPassportDialog } from "./view-passport-dialog";
import { TransferLogDialog } from "./transfer-log-dialog";
import { ViewTransferLogDialog } from "./view-transfer-log-dialog";

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
  const totalSteps = 13;

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
  const [isEditTransferLogDialogOpen, setIsEditTransferLogDialogOpen] = React.useState(false);
  const [isViewTransferLogDialogOpen, setIsViewTransferLogDialogOpen] = React.useState(false);
  const [selectedPassport, setSelectedPassport] = React.useState<any>(null);
  const [editingPassport, setEditingPassport] = React.useState<any>(null);
  const [editingTransferLog, setEditingTransferLog] = React.useState<any>(null);
  const [selectedTransferLog, setSelectedTransferLog] = React.useState<any>(null);

  // Confirmation dialog states - separate states to prevent conflicts
  const [showDeletePassportDialog, setShowDeletePassportDialog] = React.useState(false);
  const [showDeleteTransferLogDialog, setShowDeleteTransferLogDialog] = React.useState(false);
  const [passportToDelete, setPassportToDelete] = React.useState<any>(null);
  const [transferLogToDelete, setTransferLogToDelete] = React.useState<any>(null);

  // Loading states for operations
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isEditingPassport, setIsEditingPassport] = React.useState(false);

  // Pagination state for transfer logs
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

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
  const updateTransferLogMutation = useMutation(api.hospitalTransferLogs.update);
  const deleteTransferLogMutation = useMutation(api.hospitalTransferLogs.deleteTransferLog);

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

  // Update staff field when user data loads (moved after editForm declaration)
  React.useEffect(() => {
    if (user?.user) {
      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
      form.setValue('signOff.printedName', staffName);
      form.setValue('signOff.signature', staffName);
      // Also update edit form
      editForm.setValue('signOff.printedName', staffName);
      editForm.setValue('signOff.signature', staffName);
    }
  }, [user, form, editForm]);

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
      case 1: // Person in Care Information
        fieldsToValidate = [
          'generalDetails.personName',
          'generalDetails.knownAs',
          'generalDetails.dateOfBirth',
          'generalDetails.nhsNumber',
          'generalDetails.transferDateTime',
        ];
        break;
      case 2: // Transfer Locations
        fieldsToValidate = [
          'generalDetails.careHomeName',
          'generalDetails.careHomeAddress',
          'generalDetails.careHomePhone',
        ];
        break;
      case 3: // Hospital/Facility Being Transferred Details
        fieldsToValidate = [
          'generalDetails.hospitalName',
          'generalDetails.hospitalAddress',
        ];
        break;
      case 4: // Contact Information
        fieldsToValidate = [
          'generalDetails.nextOfKinName',
          'generalDetails.nextOfKinAddress',
          'generalDetails.nextOfKinPhone',
        ];
        break;
      case 5: // GP Details & Care Manager
        fieldsToValidate = [
          'generalDetails.gpName',
          'generalDetails.gpAddress',
          'generalDetails.gpPhone',
        ];
        break;
      case 6: // Reason for Transfer
        fieldsToValidate = [
          'medicalCareNeeds.situation',
          'medicalCareNeeds.background',
          'medicalCareNeeds.assessment',
          'medicalCareNeeds.recommendations',
        ];
        break;
      case 7: // Medical History
        fieldsToValidate = [
          'medicalCareNeeds.pastMedicalHistory',
        ];
        break;
      case 8: // Communication & Mobility
        fieldsToValidate = [];
        break;
      case 9: // Care Needs
        fieldsToValidate = [];
        break;
      case 10: // Skin Care
        fieldsToValidate = [
          'skinMedicationAttachments.skinStateOnTransfer',
        ];
        break;
      case 11: // Medication
        fieldsToValidate = [
          'skinMedicationAttachments.currentMedicationRegime',
          'skinMedicationAttachments.lastMedicationDateTime',
        ];
        break;
      case 12: // Attachments
        fieldsToValidate = [];
        break;
      case 13: // Sign-off Section
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
    // Validation checks
    if (!passport || !passport._id) {
      toast.error("Invalid passport selected for editing");
      return;
    }

    if (isCreating || isUpdating || isDeleting || isEditingPassport) {
      toast.error("Please wait for the current operation to complete");
      return;
    }

    try {
      setEditingPassport(passport);

      // Populate the edit form with existing passport data
      editForm.reset({
        generalDetails: passport.generalDetails || {},
        medicalCareNeeds: passport.medicalCareNeeds || {},
        skinMedicationAttachments: passport.skinMedicationAttachments || {},
        signOff: passport.signOff || {},
      });

      setEditCurrentStep(1);
      setIsEditPassportDialogOpen(true);
    } catch (error) {
      console.error('Error setting up edit form:', error);
      toast.error("Failed to open edit form. Please try again.");
    }
  };

  // Handler for printing individual passport with current resident data
  const handlePrintPassport = (passport: any) => {
    // Validation checks
    if (!passport || !resident) {
      toast.error("Unable to print passport - missing data");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Unable to open print window. Please check your browser's popup settings.");
      return;
    }

    const formatDate = (dateString: string) => {
      try {
        return new Date(dateString).toLocaleDateString();
      } catch {
        return dateString || 'Not specified';
      }
    };

    const formatDateTime = (dateString: string) => {
      try {
        return new Date(dateString).toLocaleString();
      } catch {
        return dateString || 'Not specified';
      }
    };

    const formatAssistanceLevel = (level: string) => {
      return level ? level.charAt(0).toUpperCase() + level.slice(1) : 'Not specified';
    };

    // Create a dynamic passport object that combines current resident data with passport medical data
    const dynamicPassport = {
      ...passport,
      generalDetails: {
        // Use current resident data for personal info
        personName: fullName,
        knownAs: resident.firstName || '',
        dateOfBirth: resident.dateOfBirth || '',
        nhsNumber: resident.nhsHealthNumber || '',
        religion: passport.generalDetails.religion || '',
        weightOnTransfer: passport.generalDetails.weightOnTransfer || '',
        careType: passport.generalDetails.careType || 'residential',
        transferDateTime: passport.generalDetails.transferDateTime || '',
        accompaniedBy: passport.generalDetails.accompaniedBy || '',
        englishFirstLanguage: passport.generalDetails.englishFirstLanguage || 'yes',
        firstLanguage: passport.generalDetails.firstLanguage || '',
        // Use current resident data for contact info
        careHomeName: passport.generalDetails.careHomeName || '',
        careHomeAddress: passport.generalDetails.careHomeAddress || '',
        careHomePhone: passport.generalDetails.careHomePhone || '',
        hospitalName: passport.generalDetails.hospitalName || '',
        hospitalAddress: passport.generalDetails.hospitalAddress || '',
        hospitalPhone: passport.generalDetails.hospitalPhone || '',
        nextOfKinName: resident.emergencyContacts?.[0]?.name || '',
        nextOfKinAddress: resident.emergencyContacts?.[0]?.address || '',
        nextOfKinPhone: resident.emergencyContacts?.[0]?.phoneNumber || '',
        gpName: resident.gpName || '',
        gpAddress: resident.gpAddress || '',
        gpPhone: resident.gpPhone || '',
        careManagerName: resident.careManagerName || '',
        careManagerAddress: resident.careManagerAddress || '',
        careManagerPhone: resident.careManagerPhone || '',
      }
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hospital Passport - ${passport.generalDetails.personName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.4;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 15px;
              font-size: 13px;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .header-left {
              flex: 1;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #1e40af;
            }
            .header h2 {
              margin: 5px 0 0 0;
              font-size: 16px;
              color: #333;
            }
            .header-dates {
              font-size: 10px;
              color: #666;
              margin-top: 5px;
            }
            .section {
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              color: #1e40af;
              background-color: #eff6ff;
              padding: 5px 10px;
              margin-bottom: 10px;
              border-left: 3px solid #2563eb;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              margin-bottom: 10px;
            }
            .info-item {
              margin-bottom: 6px;
              padding: 4px;
              background-color: #fafafa;
              border-radius: 3px;
            }
            .info-label {
              font-weight: bold;
              color: #374151;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-value {
              margin-top: 1px;
              color: #111;
              font-size: 12px;
            }
            .full-width {
              grid-column: 1 / -1;
            }
            .checkbox-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              margin: 8px 0;
            }
            .checkbox-item {
              display: flex;
              align-items: center;
              gap: 3px;
              font-size: 11px;
            }
            .resident-photo {
              width: 100px;
              height: 100px;
              border-radius: 8px;
              object-fit: cover;
              border: 2px solid #e5e7eb;
            }
            .photo-section {
              display: flex;
              align-items: center;
              gap: 15px;
              margin-bottom: 15px;
              padding: 10px;
              background-color: #f9fafb;
              border-radius: 8px;
            }
            .photo-info {
              flex: 1;
            }
            .photo-info h3 {
              margin: 0 0 5px 0;
              font-size: 18px;
              color: #111;
            }
            .photo-info p {
              margin: 2px 0;
              font-size: 12px;
              color: #666;
            }
            .no-photo {
              width: 100px;
              height: 100px;
              border-radius: 8px;
              background-color: #e5e7eb;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 36px;
              font-weight: bold;
              color: #9ca3af;
            }
            @media print {
              body {
                margin: 0;
                padding: 10px;
                font-size: 11px;
              }
              .section {
                page-break-inside: avoid;
                margin-bottom: 15px;
              }
              .header {
                margin-bottom: 10px;
              }
              .photo-section {
                margin-bottom: 10px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <h1>HOSPITAL PASSPORT</h1>
              <h2>${dynamicPassport.generalDetails.personName}</h2>
              <div class="header-dates">
                Generated: ${formatDateTime(new Date().toISOString())} | Original: ${formatDateTime(passport.createdAt)}
              </div>
            </div>
          </div>

          <div class="photo-section">
            ${resident.imageUrl
              ? `<img src="${resident.imageUrl}" alt="${fullName}" class="resident-photo" />`
              : `<div class="no-photo">${initials}</div>`
            }
            <div class="photo-info">
              <h3>${fullName}</h3>
              <p><strong>NHS Number:</strong> ${resident.nhsHealthNumber || "Not specified"}</p>
              <p><strong>Date of Birth:</strong> ${formatDate(resident.dateOfBirth)} (Age: ${currentAge} years)</p>
              <p><strong>Room:</strong> ${resident.roomNumber || "N/A"} | <strong>Care Type:</strong> ${formatAssistanceLevel(dynamicPassport.generalDetails.careType)}</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Transfer Details</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Known As</div>
                <div class="info-value">${dynamicPassport.generalDetails.knownAs}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Religion</div>
                <div class="info-value">${dynamicPassport.generalDetails.religion || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Weight on Transfer</div>
                <div class="info-value">${dynamicPassport.generalDetails.weightOnTransfer || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Transfer Date/Time</div>
                <div class="info-value">${formatDateTime(dynamicPassport.generalDetails.transferDateTime)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Accompanied By</div>
                <div class="info-value">${dynamicPassport.generalDetails.accompaniedBy || 'Not specified'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">English First Language</div>
                <div class="info-value">${dynamicPassport.generalDetails.englishFirstLanguage === 'yes' ? 'Yes' : 'No'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">First Language</div>
                <div class="info-value">${dynamicPassport.generalDetails.firstLanguage || 'Not specified'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Care Home & Hospital Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Care Home Name</div>
                <div class="info-value">${dynamicPassport.generalDetails.careHomeName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Care Home Phone</div>
                <div class="info-value">${dynamicPassport.generalDetails.careHomePhone}</div>
              </div>
              <div class="info-item full-width">
                <div class="info-label">Care Home Address</div>
                <div class="info-value">${dynamicPassport.generalDetails.careHomeAddress}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Hospital Name</div>
                <div class="info-value">${dynamicPassport.generalDetails.hospitalName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Hospital Phone</div>
                <div class="info-value">${dynamicPassport.generalDetails.hospitalPhone || 'Not specified'}</div>
              </div>
              <div class="info-item full-width">
                <div class="info-label">Hospital Address</div>
                <div class="info-value">${dynamicPassport.generalDetails.hospitalAddress}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Contact Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Next of Kin Name</div>
                <div class="info-value">${dynamicPassport.generalDetails.nextOfKinName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Next of Kin Phone</div>
                <div class="info-value">${dynamicPassport.generalDetails.nextOfKinPhone}</div>
              </div>
              <div class="info-item full-width">
                <div class="info-label">Next of Kin Address</div>
                <div class="info-value">${dynamicPassport.generalDetails.nextOfKinAddress}</div>
              </div>
              <div class="info-item">
                <div class="info-label">GP Name</div>
                <div class="info-value">${dynamicPassport.generalDetails.gpName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">GP Phone</div>
                <div class="info-value">${dynamicPassport.generalDetails.gpPhone}</div>
              </div>
              <div class="info-item full-width">
                <div class="info-label">GP Address</div>
                <div class="info-value">${dynamicPassport.generalDetails.gpAddress}</div>
              </div>
              ${dynamicPassport.generalDetails.careManagerName ? `
              <div class="info-item">
                <div class="info-label">Care Manager Name</div>
                <div class="info-value">${dynamicPassport.generalDetails.careManagerName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Care Manager Phone</div>
                <div class="info-value">${dynamicPassport.generalDetails.careManagerPhone || 'Not specified'}</div>
              </div>
              <div class="info-item full-width">
                <div class="info-label">Care Manager Address</div>
                <div class="info-value">${dynamicPassport.generalDetails.careManagerAddress || 'Not specified'}</div>
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

    const doc = printWindow.document;
    doc.documentElement.innerHTML = printContent;

    // Wait for content to load then print
    printWindow.onload = () => {
      try {
        printWindow.print();
        printWindow.close();
      } catch (error) {
        console.error('Error printing:', error);
        toast.error("Print failed. Please try again.");
        printWindow.close();
      }
    };

    // Fallback timeout in case onload doesn't fire
    setTimeout(() => {
      try {
        if (!printWindow.closed) {
          printWindow.print();
        }
      } catch (error) {
        console.warn('Print fallback failed:', error);
      }
    }, 500);
  };

  // Handler for creating/updating transfer log
  const handleTransferLogSubmit = async (data: any) => {

    // Validation checks
    if (!data?.date || !data?.hospitalName || !data?.reason) {
      toast.error("Please fill in all required fields");
      throw new Error("Missing required fields");
    }

    if (!activeOrganization?.id || !user?.user?.id) {
      toast.error("Authentication error. Please refresh the page and try again.");
      throw new Error("Authentication error");
    }

    if (!resident?._id) {
      toast.error("Resident information not found. Please refresh the page.");
      throw new Error("Resident not found");
    }

    if (isCreating || isUpdating) {
      throw new Error("Operation already in progress"); // Prevent multiple submissions
    }

    try {
      if (editingTransferLog) {
        if (!editingTransferLog._id) {
          toast.error("Invalid transfer log selected for editing");
          throw new Error("Invalid transfer log");
        }

        setIsUpdating(true);

        await updateTransferLogMutation({
          transferLogId: editingTransferLog._id,
          date: data.date,
          hospitalName: data.hospitalName.trim(),
          reason: data.reason.trim(),
          outcome: data.outcome?.trim() || "",
          followUp: data.followUp?.trim() || "",
          filesChanged: data.filesChanged || {
            carePlan: false,
            riskAssessment: false,
            other: ""
          },
          medicationChanges: data.medicationChanges || {
            medicationsAdded: false,
            addedMedications: "",
            medicationsRemoved: false,
            removedMedications: "",
            medicationsModified: false,
            modifiedMedications: ""
          },
        });

        toast.success("Transfer log updated successfully");
        setIsEditTransferLogDialogOpen(false);
        setEditingTransferLog(null);
      } else {
        setIsCreating(true);

        await createTransferLogMutation({
          residentId: residentId,
          date: data.date,
          hospitalName: data.hospitalName.trim(),
          reason: data.reason.trim(),
          outcome: data.outcome?.trim() || "",
          followUp: data.followUp?.trim() || "",
          filesChanged: data.filesChanged || {
            carePlan: false,
            riskAssessment: false,
            other: ""
          },
          medicationChanges: data.medicationChanges || {
            medicationsAdded: false,
            addedMedications: "",
            medicationsRemoved: false,
            removedMedications: "",
            medicationsModified: false,
            modifiedMedications: ""
          },
          organizationId: activeOrganization.id,
          teamId: resident?.teamId || "",
          createdBy: user.user.id,
        });

        toast.success("Transfer log added successfully");
        setIsTransferLogDialogOpen(false);
      }
    } catch (error) {
      console.error("Error with transfer log:", error);
      const action = editingTransferLog ? "update" : "add";
      toast.error(`Failed to ${action} transfer log. Please try again.`);
    } finally {
      setIsCreating(false);
      setIsUpdating(false);
    }
  };

  // Handler for editing transfer log
  const handleEditTransferLog = (transferLog: any) => {
    // Validation checks
    if (!transferLog || !transferLog._id) {
      toast.error("Invalid transfer log selected for editing");
      return;
    }

    if (isCreating || isUpdating || isDeleting || isEditingPassport) {
      toast.error("Please wait for the current operation to complete");
      return;
    }

    setEditingTransferLog(transferLog);
    setIsEditTransferLogDialogOpen(true);
  };

  // Handler for opening transfer log delete dialog
  const handleDeleteTransferLog = (transferLog: any) => {
    if (!transferLog?._id) {
      toast.error("Invalid transfer log selected");
      return;
    }
    setTransferLogToDelete(transferLog);
    setShowDeleteTransferLogDialog(true);
  };

  // Handler for confirming transfer log deletion
  const confirmDeleteTransferLog = async () => {
    if (!transferLogToDelete?._id || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);

      await deleteTransferLogMutation({
        transferLogId: transferLogToDelete._id,
      });

      toast.success("Transfer log deleted successfully");
      setShowDeleteTransferLogDialog(false);
      setTransferLogToDelete(null);
    } catch (error) {
      console.error("Error deleting transfer log:", error);
      toast.error("Failed to delete transfer log. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for viewing transfer log
  const handleViewTransferLog = (transferLog: any) => {
    if (!transferLog?._id) {
      toast.error("Invalid transfer log selected");
      return;
    }
    setSelectedTransferLog(transferLog);
    setIsViewTransferLogDialogOpen(true);
  };

  // Handler for editing existing passport
  const handleEditSubmit = async (data: HospitalPassportFormData) => {
    // Validation checks
    if (!data?.generalDetails?.personName || !data?.generalDetails?.dateOfBirth) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!editingPassport?._id) {
      toast.error("No passport selected for editing");
      return;
    }

    if (isEditingPassport) {
      return; // Prevent multiple submissions
    }

    try {
      setIsEditingPassport(true);

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
      toast.error("Failed to update Hospital Passport. Please try again.");
    } finally {
      setIsEditingPassport(false);
    }
  };

  // Handler for opening passport delete dialog
  const handleDeletePassport = (passport: any) => {
    if (!passport?._id) {
      toast.error("Invalid passport selected");
      return;
    }
    setPassportToDelete(passport);
    setShowDeletePassportDialog(true);
  };

  // Handler for confirming passport deletion
  const confirmDeletePassport = async () => {
    if (!passportToDelete?._id || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);

      await deleteHospitalPassportMutation({
        hospitalPassportId: passportToDelete._id,
      });

      toast.success("Hospital Passport deleted successfully");
      setShowDeletePassportDialog(false);
      setPassportToDelete(null);
    } catch (error) {
      console.error("Error deleting hospital passport:", error);
      toast.error("Failed to delete Hospital Passport. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (data: HospitalPassportFormData) => {
    // Validation checks
    if (!data?.generalDetails?.personName || !data?.generalDetails?.dateOfBirth) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!activeOrganization?.id || !user?.user?.id) {
      toast.error("Authentication error. Please refresh the page and try again.");
      return;
    }

    if (!resident?._id) {
      toast.error("Resident information not found. Please refresh the page.");
      return;
    }

    if (isCreating) {
      return; // Prevent multiple submissions
    }

    try {
      setIsCreating(true);

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
            name: data.generalDetails.nextOfKinName?.trim() || "",
            address: data.generalDetails.nextOfKinAddress?.trim() || undefined,
            phoneNumber: data.generalDetails.nextOfKinPhone?.trim() || "",
          });
        }
      }

      // Update GP and Care Manager information in residents table
      const hasResidentChanges =
        (data.generalDetails.gpName?.trim() || "") !== (resident?.gpName || "") ||
        (data.generalDetails.gpAddress?.trim() || "") !== (resident?.gpAddress || "") ||
        (data.generalDetails.gpPhone?.trim() || "") !== (resident?.gpPhone || "") ||
        (data.generalDetails.careManagerName?.trim() || "") !== (resident?.careManagerName || "") ||
        (data.generalDetails.careManagerAddress?.trim() || "") !== (resident?.careManagerAddress || "") ||
        (data.generalDetails.careManagerPhone?.trim() || "") !== (resident?.careManagerPhone || "");

      if (hasResidentChanges) {
        await updateResidentMutation({
          residentId: residentId,
          gpName: data.generalDetails.gpName?.trim() || "",
          gpAddress: data.generalDetails.gpAddress?.trim() || "",
          gpPhone: data.generalDetails.gpPhone?.trim() || "",
          careManagerName: data.generalDetails.careManagerName?.trim() || "",
          careManagerAddress: data.generalDetails.careManagerAddress?.trim() || "",
          careManagerPhone: data.generalDetails.careManagerPhone?.trim() || "",
        });
      }

      // Create Hospital Passport
      await createHospitalPassportMutation({
        residentId: residentId,
        generalDetails: {
          ...data.generalDetails,
          personName: data.generalDetails.personName.trim(),
          knownAs: data.generalDetails.knownAs?.trim() || "",
          hospitalName: data.generalDetails.hospitalName?.trim() || "",
          careHomeName: data.generalDetails.careHomeName?.trim() || "",
        },
        medicalCareNeeds: data.medicalCareNeeds,
        skinMedicationAttachments: data.skinMedicationAttachments,
        signOff: {
          ...data.signOff,
          signature: data.signOff.signature.trim(),
          printedName: data.signOff.printedName.trim(),
          designation: data.signOff.designation.trim(),
          contactPhone: data.signOff.contactPhone.trim(),
        },
        organizationId: activeOrganization.id,
        teamId: resident?.teamId || "",
        createdBy: user.user.id,
        status: "completed",
      });


      toast.success("Hospital Passport generated and saved successfully");
      form.reset();
      setIsTransferDialogOpen(false);
      setCurrentStep(1);
    } catch (error) {
      console.error("Error generating hospital passport:", error);
      toast.error("Failed to generate Hospital Passport. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Step validation before moving to next step
  const validateCurrentStep = async () => {
    let fieldsToValidate: any[] = [];

    switch (currentStep) {
      case 1: // Person in Care Information
        fieldsToValidate = [
          'generalDetails.personName',
          'generalDetails.knownAs',
          'generalDetails.dateOfBirth',
          'generalDetails.nhsNumber',
          'generalDetails.transferDateTime',
        ];
        break;
      case 2: // Transfer Locations
        fieldsToValidate = [
          'generalDetails.careHomeName',
          'generalDetails.careHomeAddress',
          'generalDetails.careHomePhone',
        ];
        break;
      case 3: // Hospital/Facility Being Transferred Details
        fieldsToValidate = [
          'generalDetails.hospitalName',
          'generalDetails.hospitalAddress',
        ];
        break;
      case 4: // Contact Information
        fieldsToValidate = [
          'generalDetails.nextOfKinName',
          'generalDetails.nextOfKinAddress',
          'generalDetails.nextOfKinPhone',
        ];
        break;
      case 5: // GP Details & Care Manager
        fieldsToValidate = [
          'generalDetails.gpName',
          'generalDetails.gpAddress',
          'generalDetails.gpPhone',
        ];
        break;
      case 6: // Reason for Transfer
        fieldsToValidate = [
          'medicalCareNeeds.situation',
          'medicalCareNeeds.background',
          'medicalCareNeeds.assessment',
          'medicalCareNeeds.recommendations',
        ];
        break;
      case 7: // Medical History
        fieldsToValidate = [
          'medicalCareNeeds.pastMedicalHistory',
        ];
        break;
      case 8: // Communication & Mobility
        fieldsToValidate = [];
        break;
      case 9: // Care Needs
        fieldsToValidate = [];
        break;
      case 10: // Skin Care
        fieldsToValidate = [
          'skinMedicationAttachments.skinStateOnTransfer',
        ];
        break;
      case 11: // Medication
        fieldsToValidate = [
          'skinMedicationAttachments.currentMedicationRegime',
          'skinMedicationAttachments.lastMedicationDateTime',
        ];
        break;
      case 12: // Attachments
        fieldsToValidate = [];
        break;
      case 13: // Sign-off Section
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

  // Memoized age calculation to prevent unnecessary recalculations
  const calculateAge = React.useCallback((dateOfBirth: string) => {
    if (!dateOfBirth) return 'Unknown';
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);

      if (isNaN(birthDate.getTime())) return 'Invalid Date';

      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age < 0 ? 0 : age;
    } catch (error) {
      console.warn('Error calculating age:', error);
      return 'Unknown';
    }
  }, []);

  // Pagination calculations for transfer logs
  const totalTransferLogs = transferLogs?.length || 0;
  const totalPages = Math.ceil(totalTransferLogs / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransferLogs = transferLogs ? transferLogs.slice(startIndex, endIndex) : [];
  const showPagination = totalTransferLogs > itemsPerPage;

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Memoized values to prevent unnecessary re-renders - moved before early returns
  const fullName = React.useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return 'Unknown Resident';
    return `${resident.firstName} ${resident.lastName}`;
  }, [resident?.firstName, resident?.lastName]);

  const initials = React.useMemo(() => {
    if (!resident?.firstName || !resident?.lastName) return 'UR';
    return `${resident.firstName[0]}${resident.lastName[0]}`.toUpperCase();
  }, [resident?.firstName, resident?.lastName]);

  // Memoized current age to prevent recalculating on every render
  const currentAge = React.useMemo(() => {
    return calculateAge(resident?.dateOfBirth || '');
  }, [resident?.dateOfBirth, calculateAge]);

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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col gap-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/residents/${id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src={resident.imageUrl} alt={fullName} className="border" />
            <AvatarFallback className="text-sm bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Hospital Transfer</h1>
            <p className="text-muted-foreground text-sm">
              Manage hospital transfers and passports for {resident.firstName} {resident.lastName}.
            </p>
          </div>
          <div className="flex flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer/documents` as any)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Transfer History
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsTransferLogDialogOpen(true)}
              disabled={isCreating || isUpdating || isDeleting || isEditingPassport}
            >
              <Ambulance className="w-4 h-4 mr-2" />
              Hospital Transfer Entry
            </Button>
          </div>
        </div>

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
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${riskLevel === 'high' ? 'bg-red-100 text-red-700 border-red-300' :
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
            <span>CareO Passport</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hospitalPassports && hospitalPassports.length > 0 ? (
            // Show the single passport for this resident
            <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm overflow-hidden max-w-sm mx-auto">
              {/* NHS Header - Compact */}
              <div className="bg-blue-500 text-white p-3 text-center">
                <div className="w-12 h-12 mx-auto mb-1 bg-white rounded p-1 flex items-center justify-center">
                  <Cross className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-sm font-bold">HOSPITAL PASSPORT</h2>
                
              </div>

              {/* Patient Photo and Basic Info - Compact */}
              <div className="p-4">
                <div className="flex flex-col items-center mb-4">
                  {/* Passport Photo - Smaller */}
                  <div className="relative mb-3">
                    <Avatar className="w-20 h-20 border-2 border-gray-300 shadow-md">
                      <AvatarImage
                        src={resident.imageUrl}
                        alt={fullName}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gray-100 text-gray-700 text-lg font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                      <FileCheck className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Patient Name - Smaller */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">{fullName}</h3>

                  {/* Key Information Grid - Compact */}
                  <div className="w-full space-y-2">
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium text-gray-600 text-xs">NHS:</span>
                      <span className="text-gray-900 font-mono text-xs">
                        {resident?.nhsHealthNumber || "Not specified"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium text-gray-600 text-xs">DOB:</span>
                      <span className="text-gray-900 text-xs">
                        {resident?.dateOfBirth
                          ? (() => {
                            try {
                              return new Date(resident.dateOfBirth).toLocaleDateString();
                            } catch {
                              return "Invalid date";
                            }
                          })()
                          : "Not specified"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium text-gray-600 text-xs">Age:</span>
                      <span className="text-gray-900 text-xs">{currentAge} years</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1">
                      <span className="font-medium text-gray-600 text-xs">Room:</span>
                      <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs px-1 py-0 h-4">
                        {resident.roomNumber || "N/A"}
                      </Badge>
                    </div>
                  </div>

                  {/* Passport Info - Smaller */}
                  <div className="mt-3 pt-2 border-t border-gray-200 text-center">
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Created:</span>{" "}
                      {new Date(hospitalPassports[0].createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Compact */}
                <div className="flex items-center justify-center space-x-1 pt-2 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-700 hover:text-black hover:bg-gray-50 border-gray-300 h-7 px-2 text-xs"
                    onClick={() => {
                      // Create dynamic passport with current resident data for viewing
                      const dynamicPassportForView = {
                        ...hospitalPassports[0],
                        generalDetails: {
                          ...hospitalPassports[0].generalDetails,
                          // Use current resident data
                          personName: fullName,
                          knownAs: resident.firstName || '',
                          dateOfBirth: resident.dateOfBirth || '',
                          nhsNumber: resident.nhsHealthNumber || '',
                          nextOfKinName: resident.emergencyContacts?.[0]?.name || '',
                          nextOfKinAddress: resident.emergencyContacts?.[0]?.address || '',
                          nextOfKinPhone: resident.emergencyContacts?.[0]?.phoneNumber || '',
                          gpName: resident.gpName || '',
                          gpAddress: resident.gpAddress || '',
                          gpPhone: resident.gpPhone || '',
                          careManagerName: resident.careManagerName || '',
                          careManagerAddress: resident.careManagerAddress || '',
                          careManagerPhone: resident.careManagerPhone || '',
                        }
                      };
                      setSelectedPassport(dynamicPassportForView);
                      setIsViewPassportDialogOpen(true);
                    }}
                    disabled={isCreating || isUpdating || isDeleting || isEditingPassport}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-700 hover:text-black hover:bg-gray-50 border-gray-300 h-7 px-2 text-xs"
                    onClick={() => handleEditPassport(hospitalPassports[0])}
                    disabled={isCreating || isUpdating || isDeleting || isEditingPassport}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-700 hover:text-black hover:bg-gray-50 border-gray-300 h-7 px-2 text-xs"
                    onClick={() => handlePrintPassport(hospitalPassports[0])}
                    disabled={isCreating || isUpdating || isDeleting || isEditingPassport}
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-700 hover:text-black hover:bg-gray-50 border-gray-300 h-7 px-2 text-xs"
                    onClick={() => handleDeletePassport(hospitalPassports[0])}
                    disabled={isCreating || isUpdating || isDeleting || isEditingPassport}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
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
                  onClick={() => {
                    // Set user data before opening dialog
                    if (user?.user) {
                      const staffName = user.user.name || user.user.email?.split('@')[0] || "";
                      form.setValue('signOff.printedName', staffName);
                      form.setValue('signOff.signature', staffName);
                    }
                    setIsTransferDialogOpen(true);
                  }}
                  disabled={isCreating || isUpdating || isDeleting}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-400 h-12 px-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Generate Hospital Passport
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>



      {/* Recent Transfer Logs - Matching progress-notes pattern */}
      <Card className="border-0">
        <CardHeader className="">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Ambulance className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-900">Recent Transfer Logs</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-100 text-gray-700">{transferLogs?.length || 0} Total</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer/documents`)}
                className="h-8 px-3"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Transfer History
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!transferLogs || !Array.isArray(transferLogs) || transferLogs.length === 0 ? (
            <div className="text-center py-8">
              <Ambulance className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No transfer logs recorded</p>
              <p className="text-gray-400 text-sm mt-1">
                Start tracking hospital transfers and admissions
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedTransferLogs.map((log: any) => (
                <div
                  key={log._id}
                  className="flex flex-col md:flex-row md:items-start md:justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                      <Ambulance className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{log.hospitalName}</h4>
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          Transfer
                        </Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{log.reason}</p>

                      {/* Files Changed Display */}
                      {log.filesChanged && (log.filesChanged.carePlan || log.filesChanged.riskAssessment || log.filesChanged.other) && (
                        <div className="mb-2">
                          <div className="flex items-center flex-wrap gap-1 text-xs">
                            <span className="text-gray-500 font-medium mr-1">Files Updated:</span>
                            {log.filesChanged.carePlan && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <FileText className="w-3 h-3 mr-1" />
                                Care Plan
                              </Badge>
                            )}
                            {log.filesChanged.riskAssessment && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                <FileText className="w-3 h-3 mr-1" />
                                Risk Assessment
                              </Badge>
                            )}
                            {log.filesChanged.other && (
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                <FileText className="w-3 h-3 mr-1" />
                                {log.filesChanged.other.split(',').map((item: string) => item.trim()).join(',')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Medication Changes Display - Inline */}
                      {log.medicationChanges && (
                        log.medicationChanges.medicationsAdded ||
                        log.medicationChanges.medicationsRemoved ||
                        log.medicationChanges.medicationsModified
                      ) && (
                          <div className="mb-2">
                            <div className="flex items-center flex-wrap gap-1 text-xs">
                              <span className="text-gray-500 font-medium mr-1">Medications:</span>
                              {log.medicationChanges.medicationsAdded && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <Pill className="w-3 h-3 mr-1" />
                                  Added
                                </Badge>
                              )}
                              {log.medicationChanges.medicationsRemoved && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  <Pill className="w-3 h-3 mr-1" />
                                  Removed
                                </Badge>
                              )}
                              {log.medicationChanges.medicationsModified && (
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  <Pill className="w-3 h-3 mr-1" />
                                  Modified
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(log.date).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>Added {new Date(log.createdAt).toLocaleDateString()}</span>
                        {log.outcome && (
                          <>
                            <span>•</span>
                            <span className="text-green-600 font-medium">{log.outcome}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1 mt-2 md:mt-0 md:ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-gray-700 hover:text-black hover:bg-gray-50 border-gray-300 h-7 px-2 text-xs"
                      onClick={() => handleViewTransferLog(log)}
                      disabled={isCreating || isUpdating || isDeleting || isEditingPassport}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-gray-700 hover:text-black hover:bg-gray-50 border-gray-300 h-7 px-2 text-xs"
                      onClick={() => handleEditTransferLog(log)}
                      disabled={isCreating || isUpdating || isDeleting || isEditingPassport}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-gray-700 hover:text-black hover:bg-gray-50 border-gray-300 h-7 px-2 text-xs"
                      onClick={() => handleDeleteTransferLog(log)}
                      disabled={isCreating || isUpdating || isDeleting || isEditingPassport}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {showPagination && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1}-{Math.min(endIndex, totalTransferLogs)} of {totalTransferLogs} transfer logs
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hospital Passport Dialog */}
      <HospitalPassportDialog
        open={isTransferDialogOpen}
        onOpenChange={(open) => {
          setIsTransferDialogOpen(open);
          if (!open) {
            // Reset form state when dialog is closed but preserve user data
            const currentUserName = form.getValues('signOff.printedName');
            const currentSignature = form.getValues('signOff.signature');
            form.reset();
            // Restore user data after reset
            if (currentUserName) {
              form.setValue('signOff.printedName', currentUserName);
              form.setValue('signOff.signature', currentSignature);
            }
            setCurrentStep(1);
          }
        }}
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
        onOpenChange={(open) => {
          setIsEditPassportDialogOpen(open);
          if (!open) {
            // Clean up editing state when dialog is closed
            setEditingPassport(null);
            setEditCurrentStep(1);
            editForm.reset();
          }
        }}
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
        onOpenChange={(open) => {
          setIsViewPassportDialogOpen(open);
          if (!open) {
            // Clean up selected passport when dialog is closed
            setSelectedPassport(null);
          }
        }}
        passport={selectedPassport}
        resident={resident}
      />

      {/* Transfer Log Dialog */}
      <TransferLogDialog
        open={isTransferLogDialogOpen}
        onOpenChange={(open) => {
          setIsTransferLogDialogOpen(open);
          if (!open) {
            // No specific cleanup needed for new dialog
          }
        }}
        onSubmit={handleTransferLogSubmit}
        residentName={fullName}
      />

      {/* Edit Transfer Log Dialog */}
      <TransferLogDialog
        open={isEditTransferLogDialogOpen}
        onOpenChange={(open) => {
          setIsEditTransferLogDialogOpen(open);
          if (!open) {
            // Clean up editing state when dialog is closed
            setEditingTransferLog(null);
          }
        }}
        onSubmit={handleTransferLogSubmit}
        residentName={fullName}
        transferLog={editingTransferLog}
        isEditMode={true}
      />

      {/* View Transfer Log Dialog */}
      <ViewTransferLogDialog
        open={isViewTransferLogDialogOpen}
        onOpenChange={(open) => {
          setIsViewTransferLogDialogOpen(open);
          if (!open) {
            // Clean up selected transfer log when dialog is closed
            setSelectedTransferLog(null);
          }
        }}
        transferLog={selectedTransferLog}
        residentName={fullName}
        currentUser={user}
      />

      {/* Delete Passport Confirmation Dialog */}
      <AlertDialog
        open={showDeletePassportDialog}
        onOpenChange={(open) => {
          if (isDeleting) return; // Prevent closing during deletion
          setShowDeletePassportDialog(open);
          if (!open) {
            setPassportToDelete(null); // Clear item when dialog is closed
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Hospital Passport
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this Hospital Passport? This action cannot be undone and will permanently remove
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePassport}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Passport
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Transfer Log Confirmation Dialog */}
      <AlertDialog
        open={showDeleteTransferLogDialog}
        onOpenChange={(open) => {
          if (isDeleting) return; // Prevent closing during deletion
          setShowDeleteTransferLogDialog(open);
          if (!open) {
            setTransferLogToDelete(null); // Clear item when dialog is closed
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Transfer Log
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transfer log? This action cannot be undone.

            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTransferLog}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Transfer Log
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}