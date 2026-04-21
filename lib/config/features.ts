// Next only inlines `process.env.NEXT_PUBLIC_*` when accessed literally, not as `process.env[key]`.
function envBoolFromValue(raw: string | undefined, defaultValue: boolean): boolean {
    if (raw === undefined || raw === "") return defaultValue;
    return /^(1|true|yes|on)$/i.test(raw.trim());
}

export const FEATURES = {
    /** `NEXT_PUBLIC_SHOW_SIGNUP` in `.env.local` — truthy: 1, true, yes, on. Defaults to true if unset. Restart dev server after changes. */
    SHOW_SIGNUP: envBoolFromValue(process.env.NEXT_PUBLIC_SHOW_SIGNUP, true),
    SHOW_CARE_FILE_V1: false, // Legacy care file
    SHOW_CARE_FILE_V2: true, // New care file (renamed to Care File in UI)
};
