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
    profession?: string;
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
    title?: string;
    fileId?: string;
    file?: {
        id: string;
        name: string;
        original_name: string;
        file_size: number;
        storage_path: string;
        file_type: string;
        created_at: string;
        public_url: string;
    };
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
            .select('*, file:files(*)')
            .eq('resident_id', residentId)
            .order('note_date', { ascending: false })
            .order('note_time', { ascending: false });

        if (error) throw error;
        return (data || []).map(note => ({
            id: note.id,
            residentId: note.resident_id,
            teamMemberId: note.team_member_id,
            teamMemberName: note.team_member_name,
            profession: note.profession,
            noteDate: note.note_date,
            noteTime: note.note_time,
            reasonForVisit: note.reason_for_visit,
            outcome: note.outcome,
            relativeInformed: note.relative_informed,
            relativeInformedDetails: note.relative_informed_details,
            signature: note.signature,
            organizationId: note.organization_id,
            createdBy: note.created_by,
            createdAt: note.created_at,
            title: note.title,
            fileId: note.file_id,
            file: note.file ? {
                id: note.file.id,
                name: note.file.name,
                original_name: note.file.original_name,
                file_size: note.file.file_size,
                storage_path: note.file.storage_path,
                file_type: note.file.file_type,
                created_at: note.file.created_at,
                public_url: note.file.public_url
            } : undefined
        }));
    },

    async createNote(note: any) {
        const dbPayload = {
            resident_id: note.residentId,
            team_member_id: note.teamMemberId,
            team_member_name: note.teamMemberName,
            profession: note.profession,
            note_date: note.noteDate,
            note_time: note.noteTime,
            reason_for_visit: note.reasonForVisit,
            outcome: note.outcome,
            relative_informed: note.relativeInformed,
            relative_informed_details: note.relativeInformedDetails,
            signature: note.signature,
            organization_id: note.organizationId,
            created_by: note.createdBy,
            title: note.title,
            file_id: note.fileId
        };

        const { data, error } = await supabase
            .from('multidisciplinary_notes')
            .insert(dbPayload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getAllNotes(organizationId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('multidisciplinary_notes')
            .select('*, residents(first_name, last_name, room_number), file:files(*)')
            .eq('organization_id', organizationId)
            .order('note_date', { ascending: false })
            .order('note_time', { ascending: false });

        if (error) throw error;
        return (data || []).map(note => ({
            id: note.id,
            residentId: note.resident_id,
            residentName: note.residents ? `${note.residents.first_name} ${note.residents.last_name}` : "Unknown Resident",
            teamMemberId: note.team_member_id,
            teamMemberName: note.team_member_name,
            profession: note.profession,
            noteDate: note.note_date,
            noteTime: note.note_time,
            reasonForVisit: note.reason_for_visit,
            outcome: note.outcome,
            relativeInformed: note.relative_informed,
            relativeInformedDetails: note.relative_informed_details,
            signature: note.signature,
            organizationId: note.organization_id,
            createdBy: note.created_by,
            createdAt: note.created_at,
            title: note.title,
            fileId: note.file_id,
            file: note.file ? {
                id: note.file.id,
                name: note.file.name,
                original_name: note.file.original_name,
                file_size: note.file.file_size,
                storage_path: note.file.storage_path,
                file_type: note.file.file_type,
                created_at: note.file.created_at,
                public_url: note.file.public_url
            } : undefined
        }));
    },

    async updateNoteTitle(noteId: string, title: string) {
        const { data, error } = await supabase
            .from('multidisciplinary_notes')
            .update({ title })
            .eq('id', noteId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
