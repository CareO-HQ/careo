/**
 * Helper functions for appointment operations
 */

export interface CreateAppointmentData {
  residentId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location: string;
  staffId?: string;
  organizationId: string;
  teamId?: string;
}

export interface UpdateAppointmentData {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  staffId?: string;
  status?: "scheduled" | "completed" | "cancelled";
  updatedBy?: string;
}

/**
 * Create a new appointment
 */
export async function createAppointment(data: CreateAppointmentData) {
  const response = await fetch("/api/appointments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create appointment");
  }

  return response.json();
}

/**
 * Get appointments with filters
 */
export async function getAppointments(filters: {
  residentId?: string;
  teamId?: string;
  organizationId?: string;
  status?: string;
  includeAll?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters.residentId) params.append("residentId", filters.residentId);
  if (filters.teamId) params.append("teamId", filters.teamId);
  if (filters.organizationId) params.append("organizationId", filters.organizationId);
  if (filters.status) params.append("status", filters.status);
  if (filters.includeAll) params.append("includeAll", "true");

  const response = await fetch(`/api/appointments?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch appointments");
  }

  return response.json();
}

/**
 * Get upcoming appointments
 */
export async function getUpcomingAppointments(filters: {
  residentId?: string;
  teamId?: string;
  organizationId?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters.residentId) params.append("residentId", filters.residentId);
  if (filters.teamId) params.append("teamId", filters.teamId);
  if (filters.organizationId) params.append("organizationId", filters.organizationId);
  if (filters.limit) params.append("limit", filters.limit.toString());

  const response = await fetch(`/api/appointments/upcoming?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch upcoming appointments");
  }

  return response.json();
}

/**
 * Get appointments for a specific resident
 */
export async function getAppointmentsByResident(
  residentId: string,
  options?: { status?: string; includeAll?: boolean }
) {
  const params = new URLSearchParams();
  if (options?.status) params.append("status", options.status);
  if (options?.includeAll) params.append("includeAll", "true");

  const response = await fetch(
    `/api/appointments/resident/${residentId}?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch appointments");
  }

  return response.json();
}

/**
 * Get a single appointment by ID
 */
export async function getAppointmentById(id: string) {
  const response = await fetch(`/api/appointments/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch appointment");
  }

  return response.json();
}

/**
 * Update an appointment
 */
export async function updateAppointment(
  id: string,
  data: UpdateAppointmentData
) {
  const response = await fetch(`/api/appointments/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update appointment");
  }

  return response.json();
}

/**
 * Delete an appointment
 */
export async function deleteAppointment(id: string) {
  const response = await fetch(`/api/appointments/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete appointment");
  }

  return response.json();
}

/**
 * Mark an appointment as read
 */
export async function markAppointmentAsRead(appointmentId: string) {
  const response = await fetch(`/api/appointments/${appointmentId}/read`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to mark appointment as read");
  }

  return response.json();
}

/**
 * Mark multiple appointments as read
 */
export async function markMultipleAppointmentsAsRead(appointmentIds: string[]) {
  const response = await fetch("/api/appointments/read", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ appointmentIds }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to mark appointments as read");
  }

  return response.json();
}