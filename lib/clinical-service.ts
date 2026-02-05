import { supabase } from "@/lib/supabase";

export interface VitalRecord {
    id: string;
    resident_id: string;
    vital_type: string;
    value: string;
    value2?: string;
    unit?: string;
    notes?: string;
    recorded_by: string;
    record_date: string;
    record_time: string;
    created_at: string;
    created_by: string;
}

export interface ClinicalNote {
    id: string;
    resident_id: string;
    signature?: string; // staff_name mapped to signature
    content: string; // mapped from note_content
    note_type?: string; // mapped from category
    note_date: string;
    note_time?: string;
    organization_id: string;
    created_at: string;
    created_by: string;
    updated_at?: string;
}

export const clinicalService = {
    // --- Vital Signs ---

    async getLatestVitals(residentId: string) {
        const vitalTypes = [
            "temperature",
            "bloodPressure",
            "heartRate",
            "respiratoryRate",
            "oxygenSaturation",
            "weight",
            "glucoseLevel",
        ];

        const latestVitals: Record<string, any> = {};

        // We can't easily do a "distinct on" for multiple types in one query nicely with Supabase helper alone 
        // without a specific function or complex query, so we'll fetch them individually or all and filter.
        // Fetching all recent vitals for the resident is likely more efficient than N queries.

        const { data, error } = await supabase
            .from('vitals')
            .select('*')
            .eq('resident_id', residentId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
            for (const type of vitalTypes) {
                // Find the first occurrence of this vital type
                const vital = data.find((v) => v.vital_type === type);
                if (vital) {
                    // Map to camelCase for frontend consistency
                    latestVitals[type] = {
                        ...vital,
                        vitalType: vital.vital_type,
                        recordDate: vital.record_date,
                        recordTime: vital.record_time,
                        createdBy: vital.created_by,
                        createdAt: vital.created_at
                    };
                }
            }
        }

        return latestVitals;
    },

    async getRecentVitals(residentId: string, limit: number = 10) {
        const { data, error } = await supabase
            .from('vitals')
            .select('*')
            .eq('resident_id', residentId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data.map(vital => ({
            _id: vital.id,
            _creationTime: new Date(vital.created_at).getTime(),
            residentId: vital.resident_id,
            vitalType: vital.vital_type,
            value: vital.value,
            value2: vital.value2,
            unit: vital.unit,
            notes: vital.notes,
            recordedBy: vital.recorded_by,
            recordDate: vital.record_date,
            recordTime: vital.record_time,
            createdBy: vital.created_by,
            createdAt: vital.created_at
        }));
    },

    async createVitalRecord(vital: any) {
        const dbPayload = {
            resident_id: vital.residentId,
            vital_type: vital.vitalType,
            value: vital.value,
            value2: vital.value2,
            unit: vital.unit,
            notes: vital.notes,
            recorded_by: vital.recordedBy,
            record_date: vital.recordDate,
            record_time: vital.recordTime,
            created_by: vital.createdBy
        };

        const { data, error } = await supabase
            .from('vitals')
            .insert(dbPayload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Clinical Notes ---

    async getClinicalNotes(residentId: string, limit: number = 50) {
        const { data, error } = await supabase
            .from('clinical_notes')
            .select('*')
            .eq('resident_id', residentId)
            .order('note_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data.map(note => ({
            _id: note.id,
            _creationTime: new Date(note.created_at).getTime(),
            residentId: note.resident_id,
            staffName: note.signature, // Mapping signature to staffName
            staffEmail: "", // Not available in this table schema
            content: note.content, // Mapping content
            category: note.note_type, // Mapping note_type
            noteDate: note.note_date,
            noteTime: note.note_time,
            organizationId: note.organization_id,
            teamId: "", // Not available in this table schema
            createdBy: note.created_by,
            createdAt: note.created_at
        }));
    },

    async createClinicalNote(note: any) {
        const dbPayload = {
            resident_id: note.residentId,
            signature: note.staffName, // Store staff name in signature
            note_type: note.category || 'General',
            content: note.content,
            note_date: note.noteDate,
            note_time: note.noteTime,
            organization_id: note.organizationId,
            created_by: note.createdBy
        };

        const { data, error } = await supabase
            .from('clinical_notes')
            .insert(dbPayload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteClinicalNote(noteId: string) {
        const { error } = await supabase
            .from('clinical_notes')
            .delete()
            .eq('id', noteId);

        if (error) throw error;
    }
};
