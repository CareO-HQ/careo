import { supabase } from "@/lib/supabase";

export async function submitAssessmentWithVersioning<T extends { id?: string; version_number?: number }>(
    table: string,
    payload: any,
    initialData: T | undefined,
    isEditMode: boolean
) {
    if (isEditMode && initialData?.id) {
        // 1. Archive the old version
        const { error: archiveError } = await supabase
            .from(table)
            .update({
                status: 'archived',
                archived_at: new Date().toISOString()
            })
            .eq('id', initialData.id);

        if (archiveError) {
            console.error("Error archiving previous version:", archiveError);
            throw new Error(`Failed to archive previous version: ${archiveError.message}`);
        }

        // 2. Create the new version
        // Calculate new version number
        const oldVersion = initialData.version_number || 1;
        const newVersion = oldVersion + 1;

        // Prepare new payload
        const newPayload = {
            status: 'active',
            ...payload,
            previous_version_id: initialData.id,
            version_number: newVersion
        };

        const { data, error: insertError } = await supabase
            .from(table)
            .insert(newPayload)
            .select()
            .single();

        if (insertError) {
            // Attempt to rollback archive? 
            // Minimal rollback: set status back to active.
            await supabase.from(table).update({ status: 'active', archived_at: null }).eq('id', initialData.id);

            console.error("Error creating new version:", insertError);
            throw new Error(`Failed to create new version: ${insertError.message}`);
        }

        return data;
    } else {
        // New Submission
        const newPayload = {
            status: 'active',
            ...payload,
            version_number: 1
        };

        const { data, error } = await supabase
            .from(table)
            .insert(newPayload)
            .select()
            .single();

        if (error) {
            console.error("Error submitting new form:", error);
            throw error;
        }

        return data;
    }
}
