import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export function isNotificationPowerUserRole(role: string | null | undefined): boolean {
    return role === "manager" || role === "owner" || role === "saas_admin";
}

export interface InsertHospitalPassportNotificationParams {
    organizationId: string;
    careHomeId: string | null;
    teamId: string | null;
    residentId: string;
    passportId: string;
    residentDisplayName: string;
    senderId: string;
    senderName: string;
    isVersionUpdate: boolean;
}

/** Inserts a broadcast notification (same visibility pattern as incidents). */
export async function insertHospitalPassportNotification(
    client: SupabaseClient,
    params: InsertHospitalPassportNotificationParams
): Promise<void> {
    const title = params.isVersionUpdate
        ? "Hospital passport updated"
        : "Hospital passport created";
    const message = params.isVersionUpdate
        ? `A new hospital passport version was saved for ${params.residentDisplayName}.`
        : `A hospital passport was created for ${params.residentDisplayName}.`;

    const { error } = await client.from("notifications").insert({
        organization_id: params.organizationId,
        care_home_id: params.careHomeId,
        team_id: params.teamId,
        user_id: null,
        type: "hospital_passport",
        title,
        message,
        link: `/dashboard/residents/${params.residentId}/hospital-transfer`,
        sender_id: params.senderId,
        sender_name: params.senderName,
        metadata: {
            residentId: params.residentId,
            passportId: params.passportId,
            teamId: params.teamId,
            careHomeId: params.careHomeId,
            isVersionUpdate: params.isVersionUpdate,
        },
    });

    if (error) throw error;
}

export interface InsertHospitalTransferLogNotificationParams {
    organizationId: string;
    careHomeId: string | null;
    teamId: string | null;
    residentId: string;
    transferLogId: string;
    residentDisplayName: string;
    senderId: string;
    senderName: string;
    hospitalName?: string | null;
    transferDate?: string | null;
}

/** Inserts a broadcast notification for newly created transfer logs. */
export async function insertHospitalTransferLogNotification(
    client: SupabaseClient,
    params: InsertHospitalTransferLogNotificationParams
): Promise<void> {
    const title = "Hospital transfer log created";
    const hospitalText = params.hospitalName ? ` to ${params.hospitalName}` : "";
    const dateText = params.transferDate ? ` on ${params.transferDate}` : "";
    const message = `A hospital transfer log was created for ${params.residentDisplayName}${hospitalText}${dateText}.`;

    const { error } = await client.from("notifications").insert({
        organization_id: params.organizationId,
        care_home_id: params.careHomeId,
        team_id: params.teamId,
        user_id: null,
        type: "hospital_transfer_log",
        title,
        message,
        link: `/dashboard/residents/${params.residentId}/hospital-transfer`,
        sender_id: params.senderId,
        sender_name: params.senderName,
        metadata: {
            residentId: params.residentId,
            transferLogId: params.transferLogId,
            teamId: params.teamId,
            careHomeId: params.careHomeId,
            hospitalName: params.hospitalName ?? null,
            transferDate: params.transferDate ?? null,
        },
    });

    if (error) throw error;
}

export interface Notification {
    id: string;
    organization_id: string;
    care_home_id: string | null;
    team_id: string | null;
    user_id: string | null;
    title: string;
    message: string;
    type: string | null;
    link: string | null;
    sender_id: string | null;
    sender_name: string | null;
    metadata: any;
    created_at: string;
    isRead: boolean;
}

export const getNotifications = async (
    userId: string,
    limit = 50,
    onlyUnread = false,
    careHomeId?: string | null,
    activeTeamId?: string | null,
    userRole?: string | null
) => {
    // 1. Fetch dismissals first to filter them out
    const { data: dismissals } = await supabase
        .from("notification_dismissals")
        .select("notification_id")
        .eq("user_id", userId);

    const dismissedIds = new Set((dismissals || []).map(d => d.notification_id));

    // 2. Fetch notifications: personal (user_id) + broadcast (user_id null), with team scoping for non–power users
    const isPower = isNotificationPowerUserRole(userRole);

    let personalQuery = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(Math.max(limit, 80));

    if (careHomeId) {
        personalQuery = personalQuery.eq("care_home_id", careHomeId);
    }

    let broadcastQuery = supabase
        .from("notifications")
        .select("*")
        .is("user_id", null)
        .order("created_at", { ascending: false })
        .limit(Math.max(limit, 80));

    if (careHomeId) {
        broadcastQuery = broadcastQuery.eq("care_home_id", careHomeId);
    }

    if (!isPower && activeTeamId) {
        broadcastQuery = broadcastQuery.or(`team_id.is.null,team_id.eq.${activeTeamId}`);
    }

    const [{ data: personalRows, error: personalError }, { data: broadcastRows, error: broadcastError }] =
        await Promise.all([personalQuery, broadcastQuery]);

    if (personalError) {
        console.error("Error fetching personal notifications:", personalError);
        throw personalError;
    }
    if (broadcastError) {
        console.error("Error fetching broadcast notifications:", broadcastError);
        throw broadcastError;
    }

    const personal = personalRows ?? [];
    const broadcast = broadcastRows ?? [];
    type NotificationRow = (typeof personal)[number];
    const mergedById = new Map<string, NotificationRow>();
    for (const row of personal) {
        mergedById.set(row.id, row);
    }
    for (const row of broadcast) {
        mergedById.set(row.id, row);
    }

    const notifications = Array.from(mergedById.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, limit);

    // Filter out dismissed notifications
    const activeNotifications = (notifications || []).filter(n => !dismissedIds.has(n.id));

    // 3. Fetch read status for active notifications
    const notificationIds = activeNotifications.map((n) => n.id);
    let readStatusMap: Record<string, boolean> = {};

    if (notificationIds.length > 0) {
        const { data: readStatuses } = await supabase
            .from("notification_read_status")
            .select("notification_id")
            .eq("user_id", userId)
            .in("notification_id", notificationIds);

        if (readStatuses) {
            readStatusMap = readStatuses.reduce((acc: Record<string, boolean>, status: any) => {
                acc[status.notification_id] = true;
                return acc;
            }, {});
        }
    }

    // Transform and filter
    const transformed = activeNotifications.map((n) => ({
        ...n,
        isRead: !!readStatusMap[n.id],
    }));

    if (onlyUnread) {
        return transformed.filter((n) => !n.isRead);
    }

    return transformed;
};

export const markNotificationAsRead = async (notificationId: string, userId: string) => {
    const { error } = await supabase
        .from("notification_read_status")
        .upsert({
            notification_id: notificationId,
            user_id: userId,
            read_at: new Date().toISOString(),
        }, {
            onConflict: 'notification_id,user_id'
        });

    if (error) {
        console.error("Error marking notification as read:", error);
        throw error;
    }

    return { success: true };
};

export const markAllNotificationsAsRead = async (userId: string, careHomeId?: string | null) => {
    // 1. Get all notification IDs for this user (including global once) that aren't read yet
    // We should technically exclude dismissed ones too, but marking a dismissed one as read doesn't hurt.
    let query = supabase
        .from("notifications")
        .select("id")
        .or(`user_id.eq.${userId},user_id.is.null`);

    if (careHomeId) {
        query = query.eq("care_home_id", careHomeId);
    }

    const { data: notifications } = await query;

    if (!notifications || notifications.length === 0) return { success: true };

    const notificationIds = notifications.map((n) => n.id);

    // 2. Insert records into notification_read_status
    const readRecords = notificationIds.map((id) => ({
        notification_id: id,
        user_id: userId,
        read_at: new Date().toISOString(),
    }));

    const { error } = await supabase
        .from("notification_read_status")
        .upsert(readRecords, {
            onConflict: 'notification_id,user_id'
        });

    if (error) {
        console.error("Error marking all as read:", error);
        throw error;
    }

    return { success: true };
};

export const markIncidentNotificationsAsRead = async (userId: string, organizationId: string, careHomeId?: string | null) => {
    let query = supabase
        .from("notifications")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("type", "incident")
        .or(`user_id.eq.${userId},user_id.is.null`);

    if (careHomeId) {
        query = query.eq("care_home_id", careHomeId);
    }

    const { data: notifications } = await query;

    if (!notifications || notifications.length === 0) return { success: true };

    const notificationIds = notifications.map((n) => n.id);

    // 2. Insert records into notification_read_status for these IDs
    const readRecords = notificationIds.map((id) => ({
        notification_id: id,
        user_id: userId,
        read_at: new Date().toISOString(),
    }));

    const { error } = await supabase
        .from("notification_read_status")
        .upsert(readRecords, {
            onConflict: 'notification_id,user_id'
        });

    if (error) {
        console.error("Error marking incident notifications as read:", error);
        throw error;
    }

    return { success: true };
};

export const markActionPlanNotificationsAsRead = async (userId: string, organizationId: string, careHomeId?: string | null) => {
    let query = supabase
        .from("notifications")
        .select("id")
        .eq("organization_id", organizationId)
        .in("type", ["action_plan", "action_plan_status"])
        .or(`user_id.eq.${userId},user_id.is.null`);

    if (careHomeId) {
        query = query.eq("care_home_id", careHomeId);
    }

    const { data: notifications } = await query;

    if (!notifications || notifications.length === 0) return { success: true };

    const notificationIds = notifications.map((n) => n.id);

    // 2. Insert records into notification_read_status for these IDs
    const readRecords = notificationIds.map((id) => ({
        notification_id: id,
        user_id: userId,
        read_at: new Date().toISOString(),
    }));

    const { error } = await supabase
        .from("notification_read_status")
        .upsert(readRecords, {
            onConflict: 'notification_id,user_id'
        });

    if (error) {
        console.error("Error marking action plan notifications as read:", error);
        throw error;
    }

    return { success: true };
};

export const deleteAllNotifications = async (userId: string, careHomeId?: string | null) => {
    // Instead of hard deleting, we verify specifically which notifications we see, 
    // and then insert into notification_dismissals for ALL of them.
    // This handles both personal and global notifications properly from the user's perspective.

    // 1. Fetch all visible notification IDs for this user
    let query = supabase
        .from("notifications")
        .select("id")
        .or(`user_id.eq.${userId},user_id.is.null`);

    if (careHomeId) {
        query = query.eq("care_home_id", careHomeId);
    }

    const { data: notifications } = await query;

    if (!notifications || notifications.length === 0) return { deleted: 0 };

    const notificationIds = notifications.map(n => n.id);

    // 2. Insert into notification_dismissals
    const dismissalRecords = notificationIds.map(id => ({
        notification_id: id,
        user_id: userId,
        dismissed_at: new Date().toISOString()
    }));

    // Upsert to handle cases where some might already be dismissed (idempotent)
    const { error, count } = await supabase
        .from("notification_dismissals")
        .upsert(dismissalRecords, { onConflict: 'notification_id,user_id' });

    if (error) {
        console.error("Error deleting (dismissing) notifications:", error);
        throw error;
    }

    // Optionally hard delete personal ones to save space, but keeping it simple is safer.
    // We already achieved "clearing the inbox".

    return { deleted: notificationIds.length };
};

export const getActionPlanById = async (actionPlanId: string) => {
    const { data, error } = await supabase
        .from("audit_action_plans")
        .select("*, resident:residents(first_name, last_name)")
        .eq("id", actionPlanId)
        .single();

    if (error) {
        console.error("Error fetching action plan:", error);
        throw error;
    }

    return data;
};

export const updateActionPlanStatus = async (data: {
    actionPlanId: string;
    status: string;
    comment?: string;
    updatedBy: string;
    updatedByName: string;
}) => {
    // Fetch current action plan to get history
    const { data: current, error: fetchError } = await supabase
        .from("audit_action_plans")
        .select("status_history")
        .eq("id", data.actionPlanId)
        .single();

    if (fetchError) throw fetchError;

    const history = (current?.status_history as any[]) || [];
    const newHistoryItem = {
        status: data.status,
        comment: data.comment,
        updatedBy: data.updatedBy,
        updatedByName: data.updatedByName,
        updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("audit_action_plans")
        .update({
            status: data.status,
            latest_comment: data.comment,
            status_history: [...history, newHistoryItem],
            updated_at: new Date().toISOString(),
        })
        .eq("id", data.actionPlanId);

    if (error) {
        console.error("Error updating action plan status:", error);
        throw error;
    }

    return { success: true };
};
