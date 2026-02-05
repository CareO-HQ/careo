import { supabase } from "@/lib/supabase";

export interface Resident {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    imageUrl?: string;
    phoneNumber?: string;
    roomNumber?: string;
    admissionDate: string;
    nhsHealthNumber?: string;
    status: string;
    organizationId: string;
    teamId: string;
    gpName?: string;
    gpAddress?: string;
    gpPhone?: string;
    careManagerName?: string;
    careManagerAddress?: string;
    careManagerPhone?: string;
}

export const residentService = {
    async getResidentById(id: string): Promise<Resident | null> {
        if (!id) return null;

        const { data, error } = await supabase
            .from('residents')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        // Map snake_case to camelCase for frontend consistency with Convex model
        return {
            id: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            dateOfBirth: data.date_of_birth,
            imageUrl: data.image_url,
            phoneNumber: data.phone_number,
            roomNumber: data.room_number,
            admissionDate: data.admission_date,
            nhsHealthNumber: data.nhs_health_number,
            status: data.status,
            organizationId: data.organization_id,
            teamId: data.team_id,
            gpName: data.gp_name,
            gpAddress: data.gp_address,
            gpPhone: data.gp_phone,
            careManagerName: data.care_manager_name,
            careManagerAddress: data.care_manager_address,
            careManagerPhone: data.care_manager_phone
        };
    }
};
