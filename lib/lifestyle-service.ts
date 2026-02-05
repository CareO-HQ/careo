import { supabase } from "@/lib/supabase";

export interface PersonalInterests {
    _id: string;
    residentId: string;
    mainInterests: string[];
    hobbies: string[];
    socialPreferences: string[];
    favoriteActivities: string[];
    organizationId: string;
    createdBy: string;
    createdAt: number;
}

export interface SocialActivity {
    _id: string;
    residentId: string;
    activityDate: string;
    activityTime: string;
    activityType: string;
    activityName: string;
    participants?: string;
    location?: string;
    duration?: string;
    engagementLevel?: string;
    moodBefore?: string;
    moodAfter?: string;
    socialInteraction?: string;
    enjoyment?: string;
    recordedBy: string;
    organizationId: string;
    createdBy: string;
    _creationTime: number;
}

export interface SocialConnection {
    _id: string;
    residentId: string;
    name: string;
    relationship: string;
    type: string;
    contactFrequency: string;
    phone?: string;
    email?: string;
    notes?: string;
    organizationId: string;
    createdBy: string;
    _creationTime: number;
}

export const lifestyleService = {
    // --- Personal Interests ---

    async getPersonalInterests(residentId: string): Promise<PersonalInterests | null> {
        const { data, error } = await supabase
            .from('personal_interests')
            .select('*')
            .eq('resident_id', residentId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            _id: data.id,
            residentId: data.resident_id,
            mainInterests: data.main_interests || [],
            hobbies: data.hobbies || [],
            socialPreferences: data.social_preferences || [],
            favoriteActivities: data.favorite_activities || [],
            organizationId: data.organization_id,
            createdBy: data.created_by,
            createdAt: new Date(data.created_at).getTime()
        };
    },

    async upsertPersonalInterests(payload: any) {
        const dbPayload = {
            resident_id: payload.residentId,
            main_interests: payload.mainInterests,
            hobbies: payload.hobbies,
            social_preferences: payload.socialPreferences,
            favorite_activities: payload.favoriteActivities,
            organization_id: payload.organizationId,
            created_by: payload.createdBy,
            updated_by: payload.createdBy // Using createdBy as updatedBy for now
        };

        const { data, error } = await supabase
            .from('personal_interests')
            .upsert(dbPayload, { onConflict: 'resident_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Social Activities ---

    async getPaginatedSocialActivities(residentId: string, page: number = 1, pageSize: number = 10): Promise<{ activities: SocialActivity[], totalCount: number, totalPages: number }> {
        // First get total count
        const { count, error: countError } = await supabase
            .from('social_activities')
            .select('*', { count: 'exact', head: true })
            .eq('resident_id', residentId);

        if (countError) throw countError;

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
            .from('social_activities')
            .select('*')
            .eq('resident_id', residentId)
            .order('activity_date', { ascending: false })
            .order('activity_time', { ascending: false })
            .range(from, to);

        if (error) throw error;

        const activities = (data || []).map(item => ({
            _id: item.id,
            residentId: item.resident_id,
            activityDate: item.activity_date,
            activityTime: item.activity_time,
            activityType: item.activity_type,
            activityName: item.activity_name,
            participants: item.participants,
            location: item.location,
            duration: item.duration,
            engagementLevel: item.engagement_level,
            moodBefore: item.mood_before,
            moodAfter: item.mood_after,
            socialInteraction: item.social_interaction,
            enjoyment: item.enjoyment,
            recordedBy: item.recorded_by,
            organizationId: item.organization_id,
            createdBy: item.created_by,
            _creationTime: new Date(item.created_at).getTime()
        }));

        return {
            activities,
            totalCount: count || 0,
            totalPages: Math.ceil((count || 0) / pageSize)
        };
    },

    async getSocialActivities(residentId: string, limit: number = 50): Promise<SocialActivity[]> {
        const { data, error } = await supabase
            .from('social_activities')
            .select('*')
            .eq('resident_id', residentId)
            .order('activity_date', { ascending: false })
            .order('activity_time', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return (data || []).map(item => ({
            _id: item.id,
            residentId: item.resident_id,
            activityDate: item.activity_date,
            activityTime: item.activity_time,
            activityType: item.activity_type,
            activityName: item.activity_name,
            participants: item.participants,
            location: item.location,
            duration: item.duration,
            engagementLevel: item.engagement_level,
            moodBefore: item.mood_before,
            moodAfter: item.mood_after,
            socialInteraction: item.social_interaction,
            enjoyment: item.enjoyment,
            recordedBy: item.recorded_by,
            organizationId: item.organization_id,
            createdBy: item.created_by,
            _creationTime: new Date(item.created_at).getTime()
        }));
    },

    async createSocialActivity(payload: any) {
        const dbPayload = {
            resident_id: payload.residentId,
            activity_date: payload.activityDate,
            activity_time: payload.activityTime,
            activity_type: payload.activityType,
            activity_name: payload.activityName,
            participants: payload.participants,
            location: payload.location,
            duration: payload.duration,
            engagement_level: payload.engagementLevel,
            mood_before: payload.moodBefore,
            mood_after: payload.moodAfter,
            social_interaction: payload.socialInteraction,
            enjoyment: payload.enjoyment,
            recorded_by: payload.recordedBy,
            organization_id: payload.organizationId,
            created_by: payload.createdBy
        };

        const { data, error } = await supabase
            .from('social_activities')
            .insert(dbPayload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Social Connections ---

    async getSocialConnections(residentId: string): Promise<SocialConnection[]> {
        const { data, error } = await supabase
            .from('social_connections')
            .select('*')
            .eq('resident_id', residentId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(item => ({
            _id: item.id,
            residentId: item.resident_id,
            name: item.name,
            relationship: item.relationship,
            type: item.type,
            contactFrequency: item.contact_frequency,
            phone: item.phone,
            email: item.email,
            notes: item.notes,
            organizationId: item.organization_id,
            createdBy: item.created_by,
            _creationTime: new Date(item.created_at).getTime()
        }));
    },

    async createSocialConnection(payload: any) {
        const dbPayload = {
            resident_id: payload.residentId,
            name: payload.name,
            relationship: payload.relationship,
            type: payload.type,
            contact_frequency: payload.contactFrequency,
            phone: payload.phone,
            email: payload.email,
            notes: payload.notes,
            organization_id: payload.organizationId,
            created_by: payload.createdBy
        };

        const { data, error } = await supabase
            .from('social_connections')
            .insert(dbPayload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteSocialConnection(connectionId: string) {
        const { error } = await supabase
            .from('social_connections')
            .delete()
            .eq('id', connectionId);

        if (error) throw error;
    }
};
