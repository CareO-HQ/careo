import { z } from "zod";

export const PRNProtocolSchema = z.object({
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Header
  homeName: z.string().optional(),
  roomNo: z.string().optional(),
  serviceUsersName: z.string().min(1, "Service User's Name is required"),
  dob: z.number(),
  nameOfMedication: z.string().min(1, "Name of medication is required"),
  form: z.string().min(1, "Form is required"),
  routeOfAdministration: z.string().min(1, "Route of administration is required"),
  strength: z.string().min(1, "Strength is required"),
  nameOfPrescriber: z.string().min(1, "Name of prescriber is required"),

  // Details Part 1
  dosageCircumstances: z.string().min(1, "Dosage circumstances are required"),
  frequencyOfDoses: z.string().min(1, "Frequency of doses is required"),
  minimumTimeInterval: z.string().min(1, "Minimum time interval is required"),
  maximumDose24Hours: z.string().min(1, "Maximum dose in 24 hours is required"),

  // Details Part 2
  purposeOfAdministration: z.string().min(1, "Purpose of administration is required"),
  expectedOutcome: z.string().min(1, "Expected/desired outcome is required"),
  otherMedicinesAwareness: z.string().optional(),

  // Review & Instructions
  reviewDate: z.number().optional(), // In the image it's just a text box, but date makes sense
  specialInstructions: z.string().optional(),

  // Signatures
  nameOfPersonCompleting: z.string().min(1, "Name of person completing this form is required"),
  dateCompleted: z.number(),
  countersigned: z.string().optional(),
  countersignedDate: z.number().optional(),
});

export type PRNProtocolFormData = z.infer<typeof PRNProtocolSchema>;
