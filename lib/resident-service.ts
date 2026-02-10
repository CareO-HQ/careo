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
    emergency_contacts?: {
        name: string;
        phone_number: string;
        relationship: string;
        is_primary: boolean;
        address?: string;
    }[];
}

export const residentService = {
    async getResidentById(id: string): Promise<Resident | null> {
        if (!id) return null;

        const { data, error } = await supabase
            .from('residents')
            .select('*, emergency_contacts(*)')
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
            careManagerPhone: data.care_manager_phone,
            emergency_contacts: data.emergency_contacts?.map((contact: any) => ({
                name: contact.name,
                phone_number: contact.phone_number,
                relationship: contact.relationship,
                is_primary: contact.is_primary,
                address: contact.address
            }))
        };
    },

    async getResidentsByTeamId(teamId: string): Promise<Resident[]> {
        if (!teamId) return [];

        const { data, error } = await supabase
            .from('residents')
            .select('*')
            .eq('team_id', teamId)
            .eq('status', 'active');

        if (error) throw error;
        if (!data) return [];

        return data.map(resident => ({
            id: resident.id,
            firstName: resident.first_name,
            lastName: resident.last_name,
            dateOfBirth: resident.date_of_birth,
            imageUrl: resident.image_url,
            phoneNumber: resident.phone_number,
            roomNumber: resident.room_number,
            admissionDate: resident.admission_date,
            nhsHealthNumber: resident.nhs_health_number,
            status: resident.status,
            organizationId: resident.organization_id,
            teamId: resident.team_id,
            gpName: resident.gp_name,
            gpAddress: resident.gp_address,
            gpPhone: resident.gp_phone,
            careManagerName: resident.care_manager_name,
            care_manager_address: resident.care_manager_address,
            care_manager_phone: resident.care_manager_phone
        })) as Resident[];
    }
};
