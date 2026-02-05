
import { supabase } from "@/lib/supabase";

export interface HospitalPassport {
    id: string;
    resident_id: string;
    general_details: any;
    medical_care_needs: any;
    skin_medication_attachments: any;
    sign_off: any;
    organization_id: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface HospitalTransferLog {
    id: string;
    resident_id: string;
    date: string;
    hospital_name: string;
    reason: string;
    outcome?: string;
    follow_up?: string;
    files_changed?: any;
    medication_changes?: any;
    organization_id: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export const hospitalTransferService = {
    // --- Hospital Passports ---

    async getPassportsByResidentId(residentId: string) {
        const { data, error } = await supabase
            .from('hospital_passports')
            .select('*')
            .eq('resident_id', residentId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform snake_case DB fields to camelCase for frontend where necessary
        // or keep as snake_case and update frontend.
        // Given the extensive frontend code using camelCase nested objects, 
        // we should map the DB structure to what the frontend expects.
        // The DB structure uses JSONB for the main sections, which matches the frontend structure.
        // However, the properties *inside* the JSONB should be camelCase as per the Zod schema.

        return data.map(passport => ({
            _id: passport.id, // Frontend expects _id from Convex
            _creationTime: new Date(passport.created_at).getTime(), // Frontend might expect this
            residentId: passport.resident_id,
            generalDetails: passport.general_details,
            medicalCareNeeds: passport.medical_care_needs,
            skinMedicationAttachments: passport.skin_medication_attachments,
            signOff: passport.sign_off,
            organizationId: passport.organization_id,
            createdBy: passport.created_by,
            createdAt: passport.created_at,
            updatedAt: passport.updated_at
        }));
    },

    async createPassport(passport: any) {
        // Map frontend structure to DB structure
        const dbPayload = {
            resident_id: passport.residentId,
            general_details: passport.generalDetails,
            medical_care_needs: passport.medicalCareNeeds,
            skin_medication_attachments: passport.skinMedicationAttachments,
            sign_off: passport.signOff,
            organization_id: passport.organizationId,
            created_by: passport.createdBy
        };

        const { data, error } = await supabase
            .from('hospital_passports')
            .insert(dbPayload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updatePassport(id: string, updates: any) {
        // Map frontend structure to DB structure for updates
        // updates might be partial, but usually the whole form is submitted.
        const dbPayload: any = {};
        if (updates.generalDetails) dbPayload.general_details = updates.generalDetails;
        if (updates.medicalCareNeeds) dbPayload.medical_care_needs = updates.medicalCareNeeds;
        if (updates.skinMedicationAttachments) dbPayload.skin_medication_attachments = updates.skinMedicationAttachments;
        if (updates.signOff) dbPayload.sign_off = updates.signOff;

        const { data, error } = await supabase
            .from('hospital_passports')
            .update(dbPayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deletePassport(id: string) {
        const { error } = await supabase
            .from('hospital_passports')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Transfer Logs ---

    async getTransferLogsByResidentId(residentId: string) {
        const { data, error } = await supabase
            .from('hospital_transfer_logs')
            .select('*')
            .eq('resident_id', residentId)
            .order('created_at', { ascending: false }); // Order by created_at for consistency

        if (error) throw error;

        return data.map(log => ({
            _id: log.id,
            _creationTime: new Date(log.created_at).getTime(),
            residentId: log.resident_id,
            // Read from whichever column exists
            date: log.date || log.transfer_date,
            hospitalName: log.hospital_name || log.destination_hospital,
            reason: log.reason,
            outcome: log.outcome,
            followUp: log.follow_up,
            escortDetails: log.escort_details,
            paperworkSent: log.paperwork_sent,
            medicationSent: log.medication_sent,
            organizationId: log.organization_id,
            createdBy: log.created_by,
            createdAt: log.created_at,
            updatedAt: log.updated_at
        }));
    },

    async createTransferLog(log: any) {
        // Write to both column naming conventions to handle schema conflicts
        const dbPayload = {
            resident_id: log.residentId,
            // Both date column names
            date: log.date,
            transfer_date: log.date,
            // Both hospital column names  
            hospital_name: log.hospitalName,
            destination_hospital: log.hospitalName,
            reason: log.reason || '',
            // Additional columns from different schema versions
            outcome: log.outcome || null,
            follow_up: log.followUp || null,
            escort_details: log.escortDetails || null,
            paperwork_sent: log.paperworkSent || false,
            medication_sent: log.medicationSent || false,
            organization_id: log.organizationId,
            created_by: log.createdBy
        };

        const { data, error } = await supabase
            .from('hospital_transfer_logs')
            .insert(dbPayload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateTransferLog(id: string, updates: any) {
        const dbPayload: any = {};
        // Write to both column naming conventions
        if (updates.date) {
            dbPayload.date = updates.date;
            dbPayload.transfer_date = updates.date;
        }
        if (updates.hospitalName) {
            dbPayload.hospital_name = updates.hospitalName;
            dbPayload.destination_hospital = updates.hospitalName;
        }
        if (updates.reason) dbPayload.reason = updates.reason;
        if (updates.outcome) dbPayload.outcome = updates.outcome;
        if (updates.followUp) dbPayload.follow_up = updates.followUp;
        if (updates.escortDetails) dbPayload.escort_details = updates.escortDetails;
        if (updates.paperworkSent !== undefined) dbPayload.paperwork_sent = updates.paperworkSent;
        if (updates.medicationSent !== undefined) dbPayload.medication_sent = updates.medicationSent;

        const { data, error } = await supabase
            .from('hospital_transfer_logs')
            .update(dbPayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteTransferLog(id: string) {
        const { error } = await supabase
            .from('hospital_transfer_logs')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // --- Helper Methods (Resident & Diet) ---

    async getResidentById(residentId: string) {
        const { data, error } = await supabase
            .from('residents')
            .select('*')
            .eq('id', residentId)
            .single();

        if (error) throw error;

        // Map Snake case to Camel case as expected by the frontend
        return {
            _id: data.id,
            _creationTime: new Date(data.created_at).getTime(),
            firstName: data.first_name,
            lastName: data.last_name,
            dateOfBirth: data.date_of_birth,
            nhsHealthNumber: data.nhs_health_number,
            gpName: data.gp_name,
            gpAddress: data.gp_address,
            gpPhone: data.gp_phone,
            careManagerName: data.care_manager_name,
            careManagerAddress: data.care_manager_address,
            careManagerPhone: data.care_manager_phone,
            emergencyContacts: [] // Loaded separately if needed, simplified for now
        };
    },

    async getResidentWithContacts(residentId: string) {
        const { data, error } = await supabase
            .from('residents')
            .select(`
                *,
                emergency_contacts (*)
            `)
            .eq('id', residentId)
            .single();

        if (error) throw error;

        return {
            ...data,
            _id: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            dateOfBirth: data.date_of_birth,
            nhsHealthNumber: data.nhs_health_number,
            gpName: data.gp_name,
            gpAddress: data.gp_address,
            gpPhone: data.gp_phone,
            careManagerName: data.care_manager_name,
            careManagerAddress: data.care_manager_address,
            careManagerPhone: data.care_manager_phone,
            emergencyContacts: data.emergency_contacts?.map((c: any) => ({
                name: c.name,
                address: c.address,
                phoneNumber: c.phone_number,
                isPrimary: c.is_primary
            })) || []
        };
    },

    async getDietInformation(residentId: string) {
        const { data, error } = await supabase
            .from('diet_information')
            .select('*')
            .eq('resident_id', residentId)
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
            throw error;
        }

        if (!data) return null;

        return {
            allergies: data.allergies
        };
    }
};
