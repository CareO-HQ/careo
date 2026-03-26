import { z } from "zod";

const bodyMapMarkerSchema = z.object({
  id: z.string(),
  region_id: z.string(),
  region_name: z.string(),
  label: z.string(), // A, B, C...
  notes: z.string().optional()
});

export const painAssessmentV2Schema = z.object({
  // Metadata
  residentId: z.string(),
  teamId: z.string(),
  organizationId: z.string(),
  userId: z.string(),

  // Header Info
  residentName: z.string().min(1, "Resident name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  roomNumber: z.string().min(1, "Room number is required"),
  nameOfHome: z.string().min(1, "Name of home is required"),
  assessmentDate: z.number().min(1, "Assessment date is required"),

  // Body Map & Pain Details
  bodyMapMarkers: z.array(bodyMapMarkerSchema).default([]),
  descriptionOfPain: z.string().optional(),
  relievePain: z.string().optional(),
  worsePain: z.string().optional(),

  // Footer / Assessor Info
  completedBy: z.string().min(1, "Name of person completing assessment is required"),
  role: z.string().min(1, "Job role is required"),
  signature: z.string().optional(),
  time: z.string().optional(),
  
  // Backward compatibility/storage
  savedAsDraft: z.boolean().optional()
});

export type PainAssessmentV2 = z.infer<typeof painAssessmentV2Schema>;
export type BodyMapMarker = z.infer<typeof bodyMapMarkerSchema>;
