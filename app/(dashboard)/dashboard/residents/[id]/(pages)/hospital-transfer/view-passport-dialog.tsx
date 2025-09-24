import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle,
  XCircle
} from "lucide-react";

interface ViewPassportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passport: any;
  resident?: any;
}

function ViewPassportDialogComponent({
  open,
  onOpenChange,
  passport,
  resident
}: ViewPassportDialogProps) {
  // Early return if dialog is not open to prevent unnecessary renders
  if (!open || !passport) return null;

  const formatDateTime = (dateTimeString: string) => {
    try {
      return new Date(dateTimeString).toLocaleString();
    } catch {
      return dateTimeString;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const BooleanIcon = ({ value }: { value: boolean }) => (
    value ?
      <CheckCircle className="w-4 h-4 text-green-600" /> :
      <XCircle className="w-4 h-4 text-red-600" />
  );

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start space-x-3 py-2">
      <div className="flex-1">
        <dt className="text-sm font-medium text-gray-700">{label}:</dt>
        <dd className="text-sm text-gray-900 mt-1">{value || "Not specified"}</dd>
      </div>
    </div>
  );

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl mx-auto max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start space-x-4">
            {/* Resident Photo */}
            <Avatar className="w-16 h-16 flex-shrink-0 border-2 border-green-200">
              <AvatarImage
                src={resident?.imageUrl}
                alt={passport.generalDetails.personName}
                className="object-cover"
              />
              <AvatarFallback className="bg-green-100 text-green-700 text-lg font-semibold">
                {getInitials(passport.generalDetails.personName)}
              </AvatarFallback>
            </Avatar>

            {/* Title and Details */}
            <div className="flex-1">
              <DialogTitle>
                Hospital Passport Details
              </DialogTitle>
              <DialogDescription className="mt-2">
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-gray-900">{passport.generalDetails.personName}</span>
                  <span className="text-sm">Generated on {formatDateTime(passport.createdAt)}</span>
                  <span className="text-sm">Room {resident?.roomNumber || 'N/A'} • NHS: {passport.generalDetails.nhsNumber}</span>
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* General & Transfer Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">General & Transfer Details</h3>
            <div className="border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow
                  label="Person Name"
                  value={passport.generalDetails.personName}
                />
                <InfoRow
                  label="Known As"
                  value={passport.generalDetails.knownAs}
                />
                <InfoRow
                  label="Date of Birth"
                  value={formatDate(passport.generalDetails.dateOfBirth)}
                />
                <InfoRow
                  label="NHS Number"
                  value={passport.generalDetails.nhsNumber}
                />
                <InfoRow
                  label="Religion"
                  value={passport.generalDetails.religion}
                />
                <InfoRow
                  label="Weight on Transfer"
                  value={passport.generalDetails.weightOnTransfer}
                />
                <InfoRow
                  label="Care Type"
                  value={passport.generalDetails.careType}
                />
                <InfoRow
                  label="Transfer Date & Time"
                  value={formatDateTime(passport.generalDetails.transferDateTime)}
                />
                <InfoRow
                  label="Accompanied By"
                  value={passport.generalDetails.accompaniedBy}
                />
                <InfoRow
                  label="English First Language"
                  value={passport.generalDetails.englishFirstLanguage}
                />
                <InfoRow
                  label="First Language"
                  value={passport.generalDetails.firstLanguage}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Care Home */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Care Home</h4>
                <InfoRow label="Name" value={passport.generalDetails.careHomeName} />
                <InfoRow label="Address" value={passport.generalDetails.careHomeAddress} />
                <InfoRow label="Phone" value={passport.generalDetails.careHomePhone} />
              </div>

              {/* Hospital */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Hospital/Facility</h4>
                <InfoRow label="Name" value={passport.generalDetails.hospitalName} />
                <InfoRow label="Address" value={passport.generalDetails.hospitalAddress} />
                <InfoRow label="Phone" value={passport.generalDetails.hospitalPhone} />
              </div>

              {/* Next of Kin */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Next of Kin</h4>
                <InfoRow label="Name" value={passport.generalDetails.nextOfKinName} />
                <InfoRow label="Address" value={passport.generalDetails.nextOfKinAddress} />
                <InfoRow label="Phone" value={passport.generalDetails.nextOfKinPhone} />
              </div>
            </div>

            {/* GP & Care Manager */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">GP Details</h4>
                <InfoRow label="Name" value={passport.generalDetails.gpName} />
                <InfoRow label="Address" value={passport.generalDetails.gpAddress} />
                <InfoRow label="Phone" value={passport.generalDetails.gpPhone} />
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">Care Manager</h4>
                <InfoRow label="Name" value={passport.generalDetails.careManagerName} />
                <InfoRow label="Address" value={passport.generalDetails.careManagerAddress} />
                <InfoRow label="Phone" value={passport.generalDetails.careManagerPhone} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Medical & Care Needs */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical & Care Needs</h3>
            <div className="border rounded-lg p-4 space-y-4">
              {/* SBAR */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">SBAR Format</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Situation" value={passport.medicalCareNeeds.situation} />
                  <InfoRow label="Background" value={passport.medicalCareNeeds.background} />
                  <InfoRow label="Assessment" value={passport.medicalCareNeeds.assessment} />
                  <InfoRow label="Recommendations" value={passport.medicalCareNeeds.recommendations} />
                </div>
              </div>

              {/* Medical History */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Medical History</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Past Medical History" value={passport.medicalCareNeeds.pastMedicalHistory} />
                  <InfoRow label="Known Allergies" value={passport.medicalCareNeeds.knownAllergies} />
                  <InfoRow label="History of Confusion" value={passport.medicalCareNeeds.historyOfConfusion} />
                  <InfoRow label="Learning Disability/Mental Health" value={passport.medicalCareNeeds.learningDisabilityMentalHealth} />
                </div>
              </div>

              {/* Communication & Aids */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Communication & Aids</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Communication Issues" value={passport.medicalCareNeeds.communicationIssues} />
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Hearing Aid:</span>
                    <BooleanIcon value={passport.medicalCareNeeds.hearingAid} />
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Glasses:</span>
                    <BooleanIcon value={passport.medicalCareNeeds.glasses} />
                  </div>
                  <InfoRow label="Other Aids" value={passport.medicalCareNeeds.otherAids} />
                </div>
              </div>

              {/* Mobility */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Mobility</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Mobility Assistance" value={passport.medicalCareNeeds.mobilityAssistance} />
                  <InfoRow label="Mobility Aids" value={passport.medicalCareNeeds.mobilityAids} />
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">History of Falls:</span>
                    <BooleanIcon value={passport.medicalCareNeeds.historyOfFalls} />
                  </div>
                  <InfoRow label="Date of Last Fall" value={passport.medicalCareNeeds.dateOfLastFall} />
                </div>
              </div>

              {/* Toileting */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Toileting</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Toileting Assistance" value={passport.medicalCareNeeds.toiletingAssistance} />
                  <InfoRow label="Continence Status" value={passport.medicalCareNeeds.continenceStatus} />
                </div>
              </div>

              {/* Nutrition */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Nutrition</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Nutritional Assistance" value={passport.medicalCareNeeds.nutritionalAssistance} />
                  <InfoRow label="Diet Type" value={passport.medicalCareNeeds.dietType} />
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Swallowing Difficulties:</span>
                    <BooleanIcon value={passport.medicalCareNeeds.swallowingDifficulties} />
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Enteral Nutrition:</span>
                    <BooleanIcon value={passport.medicalCareNeeds.enteralNutrition} />
                  </div>
                  <InfoRow label="MUST Score" value={passport.medicalCareNeeds.mustScore} />
                </div>
              </div>

              {/* Personal Care */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Personal Care</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Personal Hygiene Assistance" value={passport.medicalCareNeeds.personalHygieneAssistance} />
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Top Dentures:</span>
                    <BooleanIcon value={passport.medicalCareNeeds.topDentures} />
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Bottom Dentures:</span>
                    <BooleanIcon value={passport.medicalCareNeeds.bottomDentures} />
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Dentures Accompanying:</span>
                    <BooleanIcon value={passport.medicalCareNeeds.denturesAccompanying} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Skin, Medication & Attachments */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Skin, Medication & Attachments</h3>
            <div className="border rounded-lg p-4 space-y-4">
              {/* Skin Care */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Skin Care</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Skin Integrity Assistance" value={passport.skinMedicationAttachments.skinIntegrityAssistance} />
                  <InfoRow label="Braden Score" value={passport.skinMedicationAttachments.bradenScore} />
                  <InfoRow label="Skin State on Transfer" value={passport.skinMedicationAttachments.skinStateOnTransfer} />
                  <InfoRow label="Current Skin Care Regime" value={passport.skinMedicationAttachments.currentSkinCareRegime} />
                  <InfoRow label="Pressure Relieving Equipment" value={passport.skinMedicationAttachments.pressureRelievingEquipment} />
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Known to TVN:</span>
                    <BooleanIcon value={passport.skinMedicationAttachments.knownToTVN} />
                  </div>
                  <InfoRow label="TVN Name" value={passport.skinMedicationAttachments.tvnName} />
                </div>
              </div>

              {/* Medication */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Medication</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Current Medication Regime" value={passport.skinMedicationAttachments.currentMedicationRegime} />
                  <InfoRow label="Last Medication Date/Time" value={formatDateTime(passport.skinMedicationAttachments.lastMedicationDateTime)} />
                  <InfoRow label="Last Meal/Drink Date/Time" value={passport.skinMedicationAttachments.lastMealDrinkDateTime ? formatDateTime(passport.skinMedicationAttachments.lastMealDrinkDateTime) : "Not specified"} />
                </div>
              </div>

              {/* Attachments */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Attachments</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <BooleanIcon value={passport.skinMedicationAttachments.attachments.currentMedications} />
                    <span className="text-sm text-gray-700">Current Medications</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BooleanIcon value={passport.skinMedicationAttachments.attachments.bodyMap} />
                    <span className="text-sm text-gray-700">Body Map</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BooleanIcon value={passport.skinMedicationAttachments.attachments.observations} />
                    <span className="text-sm text-gray-700">Observations</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BooleanIcon value={passport.skinMedicationAttachments.attachments.dnacprForm} />
                    <span className="text-sm text-gray-700">DNACPR Form</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BooleanIcon value={passport.skinMedicationAttachments.attachments.enteralFeedingRegime} />
                    <span className="text-sm text-gray-700">Enteral Feeding Regime</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BooleanIcon value={passport.skinMedicationAttachments.attachments.other} />
                    <span className="text-sm text-gray-700">Other</span>
                  </div>
                </div>
                {passport.skinMedicationAttachments.attachments.otherSpecify && (
                  <InfoRow label="Other Specify" value={passport.skinMedicationAttachments.attachments.otherSpecify} />
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Sign-off Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sign-off</h3>
            <div className="border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Signature" value={passport.signOff.signature} />
                <InfoRow label="Printed Name" value={passport.signOff.printedName} />
                <InfoRow label="Designation" value={passport.signOff.designation} />
                <InfoRow label="Contact Phone" value={passport.signOff.contactPhone} />
                <InfoRow label="Completed Date" value={formatDate(passport.signOff.completedDate)} />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const ViewPassportDialog = React.memo(ViewPassportDialogComponent);