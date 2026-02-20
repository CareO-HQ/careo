import { BodyMapData, BodyMapSession } from "@/types/body-map";
import { v4 as uuidv4 } from "uuid";

/**
 * Normalizes body map data to the latest format (multi-session).
 * Handles legacy format (single array of entries) and missing initial data.
 */
export function normalizeBodyMapData(data: any, incidentDate?: string): BodyMapData {
    // If no data, return empty sessions list
    if (!data) {
        return { sessions: [] };
    }

    // New format already
    if (data.sessions && Array.isArray(data.sessions)) {
        return data as BodyMapData;
    }

    // Legacy format handles 'entries' directly
    if (data.entries && Array.isArray(data.entries)) {
        if (data.entries.length === 0) {
            return { sessions: [] };
        }

        // Migrate legacy entries to an initial session
        const initialSession: BodyMapSession = {
            id: uuidv4(),
            date: incidentDate || new Date().toISOString().split("T")[0],
            label: "Initial Record",
            entries: data.entries,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        return {
            sessions: [initialSession],
        };
    }

    // Unknown format or empty
    return { sessions: [] };
}
