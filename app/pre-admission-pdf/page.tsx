"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";

export default function PreAdmissionPDFPage() {
  const searchParams = useSearchParams();
  const formId = searchParams.get("formId");

  const preAdmissionData = useQuery(
    api.careFiles.preadmission.getPreAdmissionForm,
    formId ? { id: formId as Id<"preAdmissionCareFiles"> } : "skip"
  );

  if (!preAdmissionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto print:max-w-none print:mx-0 print:p-4">
      {/* Header */}
      <div className="border-b-2 border-gray-200 pb-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Pre-Admission Assessment Form
        </h1>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <strong>Care Home:</strong> {preAdmissionData.careHomeName}
            </p>
            <p>
              <strong>NHS Health & Care Number:</strong>{" "}
              {preAdmissionData.nhsHealthCareNumber}
            </p>
          </div>
          <div>
            <p>
              <strong>Completed by:</strong> {preAdmissionData.userName}
            </p>
            <p>
              <strong>Job Role:</strong> {preAdmissionData.jobRole}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {format(new Date(preAdmissionData.date), "dd/MM/yyyy")}
            </p>
          </div>
        </div>
      </div>

      {/* Consent */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Consent</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm">
            ✓ The person being assessed agreed to the assessment being completed
            on{" "}
            {format(
              new Date(preAdmissionData.consentAcceptedAt),
              "dd/MM/yyyy 'at' HH:mm"
            )}
          </p>
        </div>
      </div>

      {/* Resident Information */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Resident Information
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p>
              <strong>First Name:</strong> {preAdmissionData.firstName}
            </p>
            <p>
              <strong>Last Name:</strong> {preAdmissionData.lastName}
            </p>
            <p>
              <strong>Address:</strong> {preAdmissionData.address}
            </p>
            <p>
              <strong>Phone Number:</strong> {preAdmissionData.phoneNumber}
            </p>
          </div>
          <div className="space-y-2">
            <p>
              <strong>Ethnicity:</strong> {preAdmissionData.ethnicity}
            </p>
            <p>
              <strong>Gender:</strong> {preAdmissionData.gender}
            </p>
            <p>
              <strong>Religion:</strong> {preAdmissionData.religion}
            </p>
            <p>
              <strong>Date of Birth:</strong> {preAdmissionData.dateOfBirth}
            </p>
          </div>
        </div>
      </div>

      {/* Next of Kin */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Next of Kin
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p>
              <strong>First Name:</strong> {preAdmissionData.kinFirstName}
            </p>
            <p>
              <strong>Last Name:</strong> {preAdmissionData.kinLastName}
            </p>
          </div>
          <div className="space-y-2">
            <p>
              <strong>Relationship:</strong> {preAdmissionData.kinRelationship}
            </p>
            <p>
              <strong>Phone Number:</strong> {preAdmissionData.kinPhoneNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Professional Contacts */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Professional Contacts
        </h2>

        <div className="mb-4">
          <h3 className="font-medium text-gray-900 mb-2">
            Care Manager / Social Worker
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p>
              <strong>Name:</strong> {preAdmissionData.careManagerName}
            </p>
            <p>
              <strong>Phone:</strong> {preAdmissionData.careManagerPhoneNumber}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-medium text-gray-900 mb-2">District Nurse</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p>
              <strong>Name:</strong> {preAdmissionData.districtNurseName}
            </p>
            <p>
              <strong>Phone:</strong>{" "}
              {preAdmissionData.districtNursePhoneNumber}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-medium text-gray-900 mb-2">
            General Practitioner
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p>
              <strong>Name:</strong> {preAdmissionData.generalPractitionerName}
            </p>
            <p>
              <strong>Phone:</strong>{" "}
              {preAdmissionData.generalPractitionerPhoneNumber}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="font-medium text-gray-900 mb-2">
            Healthcare Information Provider
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <p>
              <strong>Name:</strong>{" "}
              {preAdmissionData.providerHealthcareInfoName}
            </p>
            <p>
              <strong>Designation:</strong>{" "}
              {preAdmissionData.providerHealthcareInfoDesignation}
            </p>
          </div>
        </div>
      </div>

      {/* Medical Information */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Medical Information
        </h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Known Allergies</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded border">
              {preAdmissionData.allergies}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Medical History</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded border">
              {preAdmissionData.medicalHistory}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">
              Medication Prescribed
            </h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded border">
              {preAdmissionData.medicationPrescribed}
            </p>
          </div>
        </div>
      </div>

      {/* Assessment Sections */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Assessment Sections
        </h2>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Consent Capacity Rights
              </h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded border">
                {preAdmissionData.consentCapacityRights}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Medication</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded border">
                {preAdmissionData.medication}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Mobility</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded border">
                {preAdmissionData.mobility}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Nutrition</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded border">
                {preAdmissionData.nutrition}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Continence</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded border">
                {preAdmissionData.continence}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Personal Hygiene & Dressing
              </h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded border">
                {preAdmissionData.hygieneDressing}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Skin Integrity</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded border">
                {preAdmissionData.skin}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Cognition</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded border">
                {preAdmissionData.cognition}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">
                Infection Control
              </h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded border">
                {preAdmissionData.infection}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Breathing</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded border">
                {preAdmissionData.breathing}
              </p>
            </div>
            <div className="md:col-span-2">
              <h3 className="font-medium text-gray-900 mb-1">
                Altered State of Consciousness
              </h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded border">
                {preAdmissionData.alteredStateOfConsciousness}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Palliative Care */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Palliative and End of Life Care
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p>
              <strong>DNACPR in place:</strong>{" "}
              {preAdmissionData.dnacpr ? "Yes" : "No"}
            </p>
            <p>
              <strong>Has capacity:</strong>{" "}
              {preAdmissionData.capacity ? "Yes" : "No"}
            </p>
          </div>
          <div>
            <p>
              <strong>Advanced decision:</strong>{" "}
              {preAdmissionData.advancedDecision ? "Yes" : "No"}
            </p>
            <p>
              <strong>Advanced care plan:</strong>{" "}
              {preAdmissionData.advancedCarePlan ? "Yes" : "No"}
            </p>
          </div>
        </div>
        {preAdmissionData.comments && (
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Comments</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded border">
              {preAdmissionData.comments}
            </p>
          </div>
        )}
      </div>

      {/* Preferences */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Preferences
        </h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Room Preferences</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded border">
              {preAdmissionData.roomPreferences}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">
              Admission Contact
            </h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded border">
              {preAdmissionData.admissionContact}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Food Preferences</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded border">
              {preAdmissionData.foodPreferences}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Preferred Name</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded border">
              {preAdmissionData.preferedName}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Family Concerns</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded border">
              {preAdmissionData.familyConcerns}
            </p>
          </div>
        </div>
      </div>

      {/* Other Information */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Other Information
        </h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-medium text-gray-900 mb-1">
              Other Healthcare Professionals
            </h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded border">
              {preAdmissionData.otherHealthCareProfessional}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">
              Equipment Required
            </h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded border">
              {preAdmissionData.equipment}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Information */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Financial Information
        </h2>
        <p className="text-sm">
          <strong>Can attend to own finances:</strong>{" "}
          {preAdmissionData.attendFinances ? "Yes" : "No"}
        </p>
      </div>

      {/* Additional Considerations */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Additional Considerations
        </h2>
        <p className="text-gray-700 bg-gray-50 p-3 rounded border text-sm">
          {preAdmissionData.additionalConsiderations}
        </p>
      </div>

      {/* Assessment Outcome */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Assessment Outcome
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <p>
            <strong>Outcome:</strong> {preAdmissionData.outcome}
          </p>
          {preAdmissionData.plannedAdmissionDate && (
            <p>
              <strong>Planned Admission Date:</strong>{" "}
              {format(
                new Date(preAdmissionData.plannedAdmissionDate),
                "dd/MM/yyyy"
              )}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-500">
        <p>
          Document generated on {format(new Date(), "dd/MM/yyyy 'at' HH:mm")}
        </p>
        <p>Pre-Admission Assessment Form - {preAdmissionData.careHomeName}</p>
      </div>
    </div>
  );
}
