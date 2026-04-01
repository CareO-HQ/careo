import React from "react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle } from "lucide-react";

interface ViewPassportInlineProps {
  passport: any;
  resident?: any;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
}

export function ViewPassportInline({ passport, resident, onEdit, onDelete, onPrint }: ViewPassportInlineProps) {
  if (!passport) return null;

  const formatDateTime = (dateValue: string | number | Date) => {
    if (!dateValue) return "Not specified";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleString('en-GB', {
      timeZone: 'Europe/London'
    });
  };

  const formatDate = (dateValue: string | number | Date) => {
    if (!dateValue) return "Not specified";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleDateString('en-GB', {
      timeZone: 'Europe/London'
    });
  };

  const BooleanIcon = ({ value }: { value: boolean }) => (
    value ?
      <CheckCircle className="w-4 h-4 text-green-600" /> :
      <XCircle className="w-4 h-4 text-red-600" />
  );

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start space-x-3 py-2">
      <div className="flex-1">
        <dt className="text-sm font-medium text-muted-foreground">{label}:</dt>
        <dd className="text-sm text-foreground mt-1">{value || "Not specified"}</dd>
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
    <div className="w-full space-y-8">
      {/* Header Section */}
      <div className="flex items-start space-x-4 pb-6 border-b">
        <Avatar className="w-16 h-16 flex-shrink-0 border-2 border-primary/20">
          <AvatarImage
            src={resident?.imageUrl}
            alt={passport.generalDetails.personName}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {getInitials(passport.generalDetails.personName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground">{passport.generalDetails.personName}</h3>
          <div className="flex flex-col space-y-1 mt-2 text-sm text-muted-foreground">
            <span>Generated on {formatDateTime(passport.createdAt)}</span>
            <span>Room {resident?.roomNumber || 'N/A'} • NHS: {passport.generalDetails.nhsNumber}</span>
          </div>
        </div>
      </div>

      {/* General Details Section */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Person in Care Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Name" value={passport.generalDetails.personName} />
          <InfoRow label="Known As" value={passport.generalDetails.knownAs} />
          <InfoRow label="Date of Birth" value={formatDate(passport.generalDetails.dateOfBirth)} />
          <InfoRow label="NHS Number" value={passport.generalDetails.nhsNumber} />
          <InfoRow label="Religion" value={passport.generalDetails.religion} />
          <InfoRow label="Weight on Transfer" value={passport.generalDetails.weightOnTransfer} />
          <InfoRow label="Care Type" value={passport.generalDetails.careType} />
          <InfoRow label="Transfer Date/Time" value={formatDateTime(passport.generalDetails.transferDateTime)} />
          <InfoRow label="Accompanied By" value={passport.generalDetails.accompaniedBy} />
          <InfoRow label="English First Language" value={passport.generalDetails.englishFirstLanguage} />
          {passport.generalDetails.englishFirstLanguage === 'no' && (
            <InfoRow label="First Language" value={passport.generalDetails.firstLanguage} />
          )}
        </div>
      </div>

      <Separator />

      {/* Care Home Details */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Care Home Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Care Home Name" value={passport.generalDetails.careHomeName} />
          <InfoRow label="Care Home Phone" value={passport.generalDetails.careHomePhone} />
        </div>
        <InfoRow label="Care Home Address" value={passport.generalDetails.careHomeAddress} />
      </div>

      <Separator />

      {/* Hospital Details */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Hospital/Facility Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Hospital Name" value={passport.generalDetails.hospitalName} />
          <InfoRow label="Hospital Phone" value={passport.generalDetails.hospitalPhone} />
        </div>
        <InfoRow label="Hospital Address" value={passport.generalDetails.hospitalAddress} />
      </div>

      <Separator />

      {/* Contact Information */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Contact Information</h4>

        <div className="space-y-2">
          <h5 className="text-sm font-semibold text-muted-foreground">Next of Kin/Representative</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Name" value={passport.generalDetails.nextOfKinName} />
            <InfoRow label="Phone" value={passport.generalDetails.nextOfKinPhone} />
          </div>
          <InfoRow label="Address" value={passport.generalDetails.nextOfKinAddress} />
        </div>

        <div className="space-y-2 mt-4">
          <h5 className="text-sm font-semibold text-muted-foreground">GP Details</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="GP Name" value={passport.generalDetails.gpName} />
            <InfoRow label="GP Phone" value={passport.generalDetails.gpPhone} />
          </div>
          <InfoRow label="GP Address" value={passport.generalDetails.gpAddress} />
        </div>

        {passport.generalDetails.careManagerName && (
          <div className="space-y-2 mt-4">
            <h5 className="text-sm font-semibold text-muted-foreground">Care Manager</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Name" value={passport.generalDetails.careManagerName} />
              <InfoRow label="Phone" value={passport.generalDetails.careManagerPhone} />
            </div>
            <InfoRow label="Address" value={passport.generalDetails.careManagerAddress} />
          </div>
        )}
      </div>

      <Separator />

      {/* Medical Care Needs - SBAR */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Reason for Transfer (SBAR)</h4>
        <InfoRow label="Situation" value={passport.medicalCareNeeds.situation} />
        <InfoRow label="Background" value={passport.medicalCareNeeds.background} />
        <InfoRow label="Assessment" value={passport.medicalCareNeeds.assessment} />
        <InfoRow label="Recommendations" value={passport.medicalCareNeeds.recommendations} />
      </div>

      <Separator />

      {/* Medical History */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Medical History</h4>
        <InfoRow label="Past Medical History" value={passport.medicalCareNeeds.pastMedicalHistory} />
        <InfoRow label="Known Allergies" value={passport.medicalCareNeeds.knownAllergies} />
        <InfoRow label="History of Confusion" value={passport.medicalCareNeeds.historyOfConfusion} />
        <InfoRow label="Learning Disability/Mental Health" value={passport.medicalCareNeeds.learningDisabilityMentalHealth} />
      </div>

      <Separator />

      {/* Sign-off */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Sign-off</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Completed By" value={passport.signOff.printedName} />
          <InfoRow label="Designation" value={passport.signOff.designation} />
          <InfoRow label="Contact Phone" value={passport.signOff.contactPhone} />
          <InfoRow label="Date Completed" value={formatDate(passport.signOff.completedDate)} />
        </div>
      </div>
    </div>
  );
}
