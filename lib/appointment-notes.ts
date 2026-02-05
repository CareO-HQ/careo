/**
 * Helper functions for appointment notes operations
 */

export interface CreateAppointmentNoteData {
    residentId: string;
    category: string;
    preparationTime?: string;
    preparationNotes?: string;
    preferredTime?: string;
    transportPreference?: string;
    instructions?: string;
    transportationNeeds?: string[];
    medicalNeeds?: string[];
    priority?: string;
    organizationId: string;
    teamId?: string;
}

/**
 * Fetch appointment notes for a resident
 */
export async function getAppointmentNotes(residentId: string, options?: { activeOnly?: boolean }) {
    const params = new URLSearchParams();
    params.append("residentId", residentId);
    if (options?.activeOnly !== undefined) {
        params.append("activeOnly", options.activeOnly.toString());
    }

    const response = await fetch(`/api/appointment-notes?${params.toString()}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch appointment notes");
    }

    return response.json();
}

/**
 * Create a new appointment note
 */
export async function createAppointmentNote(data: CreateAppointmentNoteData) {
    const response = await fetch("/api/appointment-notes", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create appointment note");
    }

    return response.json();
}

/**
 * Delete an appointment note
 */
export async function deleteAppointmentNote(data: { noteId: string }) {
    const response = await fetch(`/api/appointment-notes/${data.noteId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete appointment note");
    }

    return response.json();
}
