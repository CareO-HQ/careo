import { AuditItem } from "./types";

export const mockAuditData: AuditItem[] = [
  {
    id: "1",
    residentId: "res_1",
    residentName: "John Smith",
    residentPhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    type: "Care Plan",
    title: "Monthly Care Plan Review - John Smith",
    status: "NEW",
    priority: "High",
    createdDate: new Date("2024-01-15"),
    updatedDate: new Date("2024-01-20"),
    dueDate: new Date("2024-02-01"),
    files: [
      { id: "f1", name: "care_plan_jan.pdf", url: "/files/care_plan_jan.pdf" },
      { id: "f2", name: "medication_review.pdf", url: "/files/medication_review.pdf" }
    ]
  },
  {
    id: "2",
    residentId: "res_2",
    residentName: "Mary Johnson",
    residentPhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mary",
    type: "Risk Assessment",
    title: "Fall Risk Assessment - Mary Johnson",
    status: "NEW",
    priority: "Medium",
    createdDate: new Date("2024-01-10"),
    updatedDate: new Date("2024-01-18"),
    dueDate: new Date("2024-01-25"),
    files: [
      { id: "f3", name: "fall_risk_assessment.pdf", url: "/files/fall_risk.pdf" }
    ]
  },
  {
    id: "3",
    residentId: "res_3",
    residentName: "Robert Williams",
    residentPhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
    type: "Incident Report",
    title: "Minor Fall Incident - Dining Room",
    status: "COMPLETED",
    priority: "Low",
    followUpNote: "Incident resolved, no injuries reported",
    createdDate: new Date("2024-01-05"),
    updatedDate: new Date("2024-01-06"),
    files: [
      { id: "f4", name: "incident_report_0105.pdf", url: "/files/incident_0105.pdf" },
      { id: "f5", name: "witness_statement.pdf", url: "/files/witness.pdf" }
    ]
  },
  {
    id: "4",
    residentId: "res_4",
    residentName: "Patricia Brown",
    residentPhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Patricia",
    type: "Care Plan",
    title: "Quarterly Care Plan Assessment",
    status: "NEW",
    priority: "Medium",
    createdDate: new Date("2024-01-12"),
    updatedDate: new Date("2024-01-19"),
    dueDate: new Date("2024-01-30"),
    files: []
  },
  {
    id: "5",
    residentId: "res_5",
    residentName: "James Davis",
    residentPhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
    type: "Risk Assessment",
    title: "Pressure Sore Risk Evaluation",
    status: "NEW",
    priority: "High",
    createdDate: new Date("2024-01-08"),
    updatedDate: new Date("2024-01-16"),
    dueDate: new Date("2024-01-22"),
    files: [
      { id: "f6", name: "pressure_sore_assessment.pdf", url: "/files/pressure_sore.pdf" }
    ]
  },
  {
    id: "6",
    residentId: "res_6",
    residentName: "Linda Miller",
    residentPhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Linda",
    type: "Incident Report",
    title: "Medication Error - Non-Critical",
    status: "AUDITED",
    priority: "Medium",
    followUpNote: "Process review completed, training scheduled",
    createdDate: new Date("2024-01-03"),
    updatedDate: new Date("2024-01-10"),
    files: [
      { id: "f7", name: "medication_error_report.pdf", url: "/files/med_error.pdf" },
      { id: "f8", name: "corrective_action_plan.pdf", url: "/files/action_plan.pdf" }
    ]
  },
  {
    id: "7",
    residentId: "res_1",
    residentName: "John Smith",
    residentPhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    type: "Risk Assessment",
    title: "Mobility Assessment Update",
    status: "NEW",
    priority: "Medium",
    createdDate: new Date("2024-01-14"),
    updatedDate: new Date("2024-01-21"),
    dueDate: new Date("2024-02-05"),
    files: [
      { id: "f9", name: "mobility_assessment.pdf", url: "/files/mobility.pdf" }
    ]
  },
  {
    id: "8",
    residentId: "res_2",
    residentName: "Mary Johnson",
    residentPhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mary",
    type: "Care Plan",
    title: "Dietary Requirements Review",
    status: "IN_PROGRESS",
    priority: "Low",
    createdDate: new Date("2024-01-11"),
    updatedDate: new Date("2024-01-17"),
    dueDate: new Date("2024-01-28"),
    files: []
  },
  {
    id: "9",
    residentId: "res_3",
    residentName: "Robert Williams",
    residentPhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
    type: "Incident Report",
    title: "Behavioral Incident - Resolved",
    status: "COMPLETED",
    priority: "High",
    followUpNote: "Family notified, care plan updated",
    createdDate: new Date("2024-01-09"),
    updatedDate: new Date("2024-01-13"),
    files: [
      { id: "f10", name: "behavioral_report.pdf", url: "/files/behavioral.pdf" }
    ]
  },
  {
    id: "10",
    residentId: "res_4",
    residentName: "Patricia Brown",
    residentPhoto: "https://api.dicebear.com/7.x/avataaars/svg?seed=Patricia",
    type: "Risk Assessment",
    title: "Infection Control Assessment",
    status: "NEW",
    priority: "Medium",
    createdDate: new Date("2024-01-07"),
    updatedDate: new Date("2024-01-14"),
    files: [
      { id: "f11", name: "infection_control.pdf", url: "/files/infection.pdf" }
    ]
  }
];

export const staffMembers = [
  { id: "s1", name: "Sarah Johnson" },
  { id: "s2", name: "Michael Brown" },
  { id: "s3", name: "Emily Davis" },
  { id: "s4", name: "James Wilson" },
  { id: "s5", name: "Jennifer Martinez" },
  { id: "s6", name: "David Anderson" },
  { id: "s7", name: "Lisa Thompson" },
  { id: "s8", name: "Christopher Garcia" }
];