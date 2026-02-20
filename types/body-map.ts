export type BodyView = "anterior" | "posterior";
export type BodySide = "left" | "right" | "midline";

export interface BodyRegion {
    region_id: string;
    region_name: string;
    view: BodyView;
    side: BodySide;
    x: number; // relative % (0-100)
    y: number; // relative % (0-100)
    width: number; // relative %
    height: number; // relative %
}

export type ConditionType =
    | "wound"
    | "rash"
    | "pain"
    | "bruise"
    | "surgical_site"
    | "pressure_ulcer"
    | "other";

export interface BodyMapEntry {
    id: string;
    region_id: string;
    region_name: string;
    condition_type: ConditionType;
    severity: number; // 1-10
    measurements?: string;
    notes?: string;
    photo_url?: string;
    date_time: string;
    status: "active" | "resolved";
}

export interface BodyMapSession {
    id: string;
    date: string; // ISO date (YYYY-MM-DD)
    label: string; // e.g., "Initial Record", "Follow-up"
    entries: BodyMapEntry[];
    created_at: string;
    updated_at: string;
}

export interface BodyMapData {
    sessions: BodyMapSession[];
}
