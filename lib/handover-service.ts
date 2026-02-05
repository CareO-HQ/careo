import { supabase } from "@/lib/supabase";
import { getCurrentShift } from "@/lib/config/shift-config";

export interface HandoverReport {
    id: string;
    date: string;
    shift: "day" | "night";
    teamId: string;
    teamName: string;
    organizationId: string;
    handoverData: any;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface HandoverComment {
    id: string;
    residentId: string;
    date: string;
    shift: "day" | "night";
    comment: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export const handoverService = {
    async getHandoverStats(residentId: string, afterTimestamp?: string) {
        const today = new Date().toISOString().split('T')[0];

        // Get food/fluid logs
        let foodFluidQuery = supabase
            .from("food_fluid_logs")
            .select("*")
            .eq("resident_id", residentId)
            .eq("date", today)
            .eq("is_archived", false);

        if (afterTimestamp) {
            foodFluidQuery = foodFluidQuery.gt("timestamp", afterTimestamp);
        }

        const { data: foodFluidLogs, error: foodFluidError } = await foodFluidQuery;
        if (foodFluidError) throw foodFluidError;

        const fluidTypes = ["Water", "Tea", "Coffee", "Juice", "Milk"];
        const fluidLogs = foodFluidLogs?.filter(log =>
            fluidTypes.includes(log.type_of_food_drink) || (log.fluid_consumed_ml && log.fluid_consumed_ml > 0)
        ) || [];

        const totalFluid = fluidLogs.reduce((sum, log) => sum + (log.fluid_consumed_ml || 0), 0);

        const foodIntakeLogs = foodFluidLogs?.filter(log =>
            log.type_of_food_drink &&
            !fluidTypes.includes(log.type_of_food_drink) &&
            !log.fluid_consumed_ml &&
            log.amount_eaten &&
            log.amount_eaten !== "None" &&
            log.amount_eaten.trim() !== ""
        ) || [];

        const foodIntakeCount = foodIntakeLogs.length;

        // Get incidents
        let incidentsQuery = supabase
            .from("incidents")
            .select("*")
            .eq("resident_id", residentId)
            .eq("date", today);

        if (afterTimestamp) {
            incidentsQuery = incidentsQuery.gt("created_at", afterTimestamp);
        }

        const { data: incidents, error: incidentsError } = await incidentsQuery;
        if (incidentsError) throw incidentsError;

        // Get hospital transfers
        let transfersQuery = supabase
            .from("hospital_transfer_logs")
            .select("*")
            .eq("resident_id", residentId)
            .eq("date", today);

        if (afterTimestamp) {
            transfersQuery = transfersQuery.gt("created_at", afterTimestamp);
        }

        const { data: transfers, error: transfersError } = await transfersQuery;
        if (transfersError) throw transfersError;

        return {
            foodIntakeCount,
            foodIntakeLogs: foodIntakeLogs.map(log => ({
                id: log.id,
                typeOfFoodDrink: log.type_of_food_drink,
                amountEaten: log.amount_eaten,
                section: log.section,
                timestamp: log.timestamp,
            })),
            totalFluid,
            fluidLogs: fluidLogs.map(log => ({
                id: log.id,
                typeOfFoodDrink: log.type_of_food_drink,
                fluidConsumedMl: log.fluid_consumed_ml,
                section: log.section,
                timestamp: log.timestamp,
            })),
            incidentCount: incidents?.length || 0,
            incidents: incidents?.map(inc => ({
                id: inc.id,
                type: inc.incident_types || [],
                level: inc.incident_level,
                time: inc.time,
            })) || [],
            hospitalTransferCount: transfers?.length || 0,
            hospitalTransfers: transfers?.map(transfer => ({
                id: transfer.id,
                hospitalName: transfer.hospital_name,
                reason: transfer.reason,
            })) || [],
        };
    },

    async saveHandoverReport(report: any) {
        const { date, shift, teamId, teamName, organizationId, residentHandovers, createdBy } = report;

        // Check if exists
        const { data: existing } = await supabase
            .from("handover_reports")
            .select("id")
            .eq("team_id", teamId)
            .eq("date", date)
            .eq("shift", shift)
            .maybeSingle();

        if (existing) {
            const { data, error } = await supabase
                .from("handover_reports")
                .update({
                    handover_data: residentHandovers,
                    updated_at: new Date().toISOString()
                })
                .eq("id", existing.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from("handover_reports")
                .insert({
                    date,
                    shift,
                    team_id: teamId,
                    team_name: teamName,
                    organization_id: organizationId,
                    handover_data: residentHandovers,
                    created_by: createdBy
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        }
    },

    async saveComment(args: {
        teamId: string;
        residentId: string;
        date: string;
        shift: "day" | "night";
        comment: string;
        createdBy: string;
    }) {
        const { teamId, residentId, date, shift, comment, createdBy } = args;

        // handover_comments table doesn't have team_id in migration, but let's check.
        // Actually, the migration I saw was:
        // CREATE TABLE public.handover_comments (
        //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        //   resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
        //   date DATE NOT NULL,
        //   shift shift_type NOT NULL,
        //   comment TEXT NOT NULL,
        //   created_by UUID NOT NULL,
        //   created_at TIMESTAMPTZ DEFAULT NOW(),
        //   updated_at TIMESTAMPTZ DEFAULT NOW()
        // );
        // Convex used teamId too. Let's see if we should add it or if resident_id + date + shift is enough.
        // Usually a resident is in a team anyway.

        const { data: existing } = await supabase
            .from("handover_comments")
            .select("id")
            .eq("resident_id", residentId)
            .eq("date", date)
            .eq("shift", shift)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from("handover_comments")
                .update({
                    comment,
                    updated_at: new Date().toISOString()
                })
                .eq("id", existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from("handover_comments")
                .insert({
                    resident_id: residentId,
                    date,
                    shift,
                    comment,
                    created_by: createdBy
                });
            if (error) throw error;
        }
    },

    async getComment(residentId: string, date: string, shift: "day" | "night") {
        const { data, error } = await supabase
            .from("handover_comments")
            .select("*")
            .eq("resident_id", residentId)
            .eq("date", date)
            .eq("shift", shift)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    async getCommentsByTeamDateShift(teamId: string, date: string, shift: "day" | "night") {
        // Since handover_comments doesn't have team_id, we might need to join with residents
        const { data, error } = await supabase
            .from("handover_comments")
            .select(`
        *,
        residents!inner(team_id)
      `)
            .eq("residents.team_id", teamId)
            .eq("date", date)
            .eq("shift", shift);

        if (error) throw error;
        return data;
    },

    async deleteCommentsAfterArchive(teamId: string, date: string, shift: "day" | "night") {
        // First get the comments to delete (because we need to join with residents)
        const comments = await this.getCommentsByTeamDateShift(teamId, date, shift);
        if (!comments || comments.length === 0) return { deleted: 0 };

        const ids = comments.map(c => c.id);
        const { error } = await supabase
            .from("handover_comments")
            .delete()
            .in("id", ids);

        if (error) throw error;
        return { deleted: ids.length };
    },

    async getLastHandoverTimestamp(teamId: string) {
        const { data, error } = await supabase
            .from("handover_reports")
            .select("created_at")
            .eq("team_id", teamId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data?.created_at || null;
    },

    async getHandoverReportsByTeam(teamId: string) {
        const { data, error } = await supabase
            .from("handover_reports")
            .select("*")
            .eq("team_id", teamId)
            .order("date", { ascending: false });

        if (error) throw error;
        return data;
    },

    async getHandoverReportById(id: string) {
        const { data, error } = await supabase
            .from("handover_reports")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            date: data.date,
            shift: data.shift,
            teamId: data.team_id,
            teamName: data.team_name,
            organizationId: data.organization_id,
            residentHandovers: data.handover_data,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedBy: data.updated_by,
            updatedAt: data.updated_at,
            // We might need to fetch creator name separately if not in table, 
            // but the table usually has created_by as UUID.
            // For now, let's keep it simple or join with users.
        };
    }
};
