"use client";

import React from "react";
import { useQuery } from "convex/react";
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
  Shield
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { HospitalPassportDialog } from "./hospital-passport-dialog";

type HospitalTransferPageProps = {
  params: Promise<{ id: string }>;
};


export default function HospitalTransferPage({ params }: HospitalTransferPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const resident = useQuery(api.residents.getById, {
    residentId: id as Id<"residents">
  });

  // Get today's date and time
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString().slice(0, 16);

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
        nextOfKinAddress: "",
        nextOfKinPhone: resident?.emergencyContacts?.[0]?.phoneNumber || "",
        gpName: resident?.gpName || "",
        gpAddress: "",
        gpPhone: resident?.gpPhone || "",
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

  // Dialog states
  const [isTransferDialogOpen, setIsTransferDialogOpen] = React.useState(false);

  // Auth data
  const { data: user } = authClient.useSession();

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

  // Mock mutations (you'll need to implement these in your Convex schema)
  // const createHospitalTransfer = useMutation(api.hospitalTransfers.createHospitalTransfer);
  // const getRecentTransfers = useQuery(api.hospitalTransfers.getRecentTransfers, {
  //   residentId: id as Id<"residents">
  // });

  const handleSubmit = async (data: HospitalPassportFormData) => {
    try {
      // Implement hospital passport generation
      console.log("Hospital Passport Data:", data);
      // await createHospitalPassport({
      //   residentId: id as Id<"residents">,
      //   ...data,
      // });

      toast.success("Hospital Passport generated successfully");
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
                onClick={() => setIsTransferDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Hospital Passport
              </Button>
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
                onClick={() => setIsTransferDialogOpen(true)}
                className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Hospital Passport</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer/documents`)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                Transfer History
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

      {/* Transfer Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Ambulance className="w-5 h-5 text-blue-600" />
            <span>Transfer Recording</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              className="h-16 text-lg bg-blue-500 hover:bg-blue-700 text-white"
              onClick={() => setIsTransferDialogOpen(true)}
            >
              <FileText className="w-6 h-6 mr-3" />
              Generate Hospital Passport
            </Button>
            <Button
            variant="outline"
             className="h-16 text-lg "
              onClick={() => router.push(`/dashboard/residents/${id}/hospital-transfer/documents`)}
            >
              <Eye className="w-6 h-6 mr-3" />
              View Transfer History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transfers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <span>Recent Transfers</span>
            <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700 ml-auto">
              Last 30 days
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mock data - replace with actual query results */}
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Ambulance className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <p className="text-gray-600 font-medium mb-2">No recent transfers</p>
            <p className="text-sm text-gray-500">
              No hospital transfers recorded for {fullName} in the last 30 days
            </p>
          </div>
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
    </div>
  );
}