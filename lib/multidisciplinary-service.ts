import { supabase } from "@/lib/supabase";

export interface MultidisciplinaryCareTeamMember {
    id: string;
    residentId: string;
    name: string;
    designation: string;
    phone?: string;
    email?: string;
    specialty?: string;
    organisation?: string;
    address?: string;
    isActive: boolean;
    organizationId: string;
    createdBy: string;
    createdAt: string;
}

export interface MultidisciplinaryNote {
    id: string;
    residentId: string;
    teamMemberId?: string;
    teamMemberName: string;
    noteDate: string;
    noteTime?: string;
    reasonForVisit: string;
    outcome: string;
    relativeInformed: boolean;
    relativeInformedDetails?: string;
    signature: string;
    organizationId: string;
    createdBy: string;
    createdAt: string;
}

export const multidisciplinaryService = {
    // --- Care Team Members ---

    async getCareTeamByResidentId(residentId: string): Promise<MultidisciplinaryCareTeamMember[]> {
        const { data, error } = await supabase
            .from('multidisciplinary_care_team')
            .select('*')
            .eq('resident_id', residentId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(member => ({
            id: member.id,
            residentId: member.resident_id,
            name: member.name,
            designation: member.designation,
            phone: member.phone,
            email: member.email,
            specialty: member.specialty,
            organisation: member.organisation,
            isActive: member.is_active,
            organizationId: member.organization_id,
            createdBy: member.created_by,
            createdAt: member.created_at
        }));
    },

    async createCareTeamMember(member: any) {
        const dbPayload = {
            resident_id: member.residentId,
            name: member.name,
            designation: member.designation,
            phone: member.phone,
            email: member.email,
            specialty: member.specialty,
            organisation: member.organisation,
            organization_id: member.organizationId,
            created_by: member.createdBy
        };

        const { data, error } = await supabase
            .from('multidisciplinary_care_team')
            .insert(dbPayload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Multidisciplinary Notes ---

    async getNotesByResidentId(residentId: string): Promise<MultidisciplinaryNote[]> {
        const { data, error } = await supabase
            .from('multidisciplinary_notes')
            .select('*')
            .eq('resident_id', residentId)
            .order('note_date', { ascending: false })
            .order('note_time', { ascending: false });

        if (error) throw error;
        return (data || []).map(note => ({
            id: note.id,
            residentId: note.resident_id,
            teamMemberId: note.team_member_id,
            teamMemberName: note.team_member_name,
            noteDate: note.note_date,
            noteTime: note.note_time,
            reasonForVisit: note.reason_for_visit,
            outcome: note.outcome,
            relativeInformed: note.relative_informed,
            relativeInformedDetails: note.relative_informed_details,
            signature: note.signature,
            organizationId: note.organization_id,
            createdBy: note.created_by,
            createdAt: note.created_at
        }));
    },

    async createNote(note: any) {
        const dbPayload = {
            resident_id: note.residentId,
            team_member_id: note.teamMemberId,
            team_member_name: note.teamMemberName,
            note_date: note.noteDate,
            note_time: note.noteTime,
            reason_for_visit: note.reasonForVisit,
            outcome: note.outcome,
            relative_informed: note.relativeInformed,
            relative_informed_details: note.relativeInformedDetails,
            signature: note.signature,
            organization_id: note.organizationId,
            created_by: note.createdBy
        };

        const { data, error } = await supabase
            .from('multidisciplinary_notes')
            .insert(dbPayload)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
