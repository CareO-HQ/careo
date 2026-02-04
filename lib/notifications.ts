import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export interface Notification {
    id: string;
    organization_id: string;
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

export const getNotifications = async (userId: string, limit = 50, onlyUnread = false) => {
    // Fetch notifications
    let query = supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(limit);

    const { data: notifications, error } = await query;

    if (error) {
        console.error("Error fetching notifications:", error);
        throw error;
    }

    // Fetch read status
    const notificationIds = (notifications || []).map((n) => n.id);
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
    const transformed = (notifications || []).map((n) => ({
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

export const markAllNotificationsAsRead = async (userId: string) => {
    // 1. Get all notification IDs for this user (including global once) that aren't read yet
    const { data: notifications } = await supabase
        .from("notifications")
        .select("id")
        .or(`user_id.eq.${userId},user_id.is.null`);

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

export const markIncidentNotificationsAsRead = async (userId: string, organizationId: string) => {
    // 1. Get all unread incident notification IDs for this user/organization
    const { data: notifications } = await supabase
        .from("notifications")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("type", "incident")
        .or(`user_id.eq.${userId},user_id.is.null`);

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

export const deleteAllNotifications = async (userId: string) => {
    // We can only delete notifications specifically for this user
    // Or handle it by marking them as "deleted" (not in schema yet)
    // For now, let's delete records targeting this user directly
    const { error, count } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId);

    if (error) {
        console.error("Error deleting notifications:", error);
        throw error;
    }

    return { deleted: count || 0 };
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
