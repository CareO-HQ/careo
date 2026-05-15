import { supabase } from "@/lib/supabase";

type SupabaseErrorLike = {
    code?: string;
    message: string;
    details?: string | null;
    hint?: string | null;
};

type ErrorWithMetadata = Error & {
    code?: string;
    details?: string | null;
    hint?: string | null;
    cause?: unknown;
};

function toErrorWithMetadata(prefix: string, error: SupabaseErrorLike): ErrorWithMetadata {
    const wrappedError = new Error(`${prefix}: ${error.message}`) as ErrorWithMetadata;
    wrappedError.code = error.code;
    wrappedError.details = error.details ?? null;
    wrappedError.hint = error.hint ?? null;
    wrappedError.cause = error;
    return wrappedError;
}

function isMissingNextReviewDateSchemaCacheError(error: SupabaseErrorLike): boolean {
    const message = error.message?.toLowerCase() ?? "";
    return (
        error.code === "PGRST204" &&
        message.includes("next_review_date") &&
        message.includes("schema cache")
    );
}

export async function submitAssessmentWithVersioning<T extends { id?: string; version_number?: number }>(
    table: string,
    payload: Record<string, unknown>,
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
            throw toErrorWithMetadata("Failed to archive previous version", archiveError);
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

            if (isMissingNextReviewDateSchemaCacheError(insertError)) {
                console.warn("Retrying without next_review_date due to schema cache lag.");
            } else {
                console.error("Error creating new version:", insertError);
            }
            throw toErrorWithMetadata("Failed to create new version", insertError);
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
            throw toErrorWithMetadata("Failed to submit new form", error);
        }

        return data;
    }
}
