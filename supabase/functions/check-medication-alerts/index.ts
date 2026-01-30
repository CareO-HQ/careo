import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const UK_TIMEZONE = 'Europe/London'

Deno.serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000)

    console.log(`[Medication Alerts] Running at ${now.toISOString()}`)

    try {
        // 1. Check for Pre-medication Alerts (Due in <= 30 mins)
        // We only alert for medications that are NOT yet administered and NOT yet alerted
        const { data: dueSoon, error: dueSoonError } = await supabase
            .from('medication_intakes')
            .select('*, medication:medication_id(name), resident:resident_id(first_name, last_name, organization_id, team_id)')
            .eq('state', 'scheduled')
            .is('pre_alert_sent_at', null)
            .lte('scheduled_time', thirtyMinsFromNow.toISOString())
            .gt('scheduled_time', now.toISOString())

        if (dueSoonError) throw dueSoonError

        for (const intake of dueSoon || []) {
            console.log(`[Medication Alerts] Creating pre-med alert for ${intake.medication.name} - Resident: ${intake.resident.first_name} ${intake.resident.last_name}`)

            const scheduledTime = new Date(intake.scheduled_time)
            const remainingMins = Math.round((scheduledTime.getTime() - now.getTime()) / 60000)

            const { error: alertError } = await supabase.from('alerts').insert({
                resident_id: intake.resident_id,
                alert_type: 'medication',
                severity: 'info',
                title: 'Medication Due Soon',
                message: `${intake.medication.name} for ${intake.resident.first_name} ${intake.resident.last_name} is due in ${remainingMins} minutes!`,
                organization_id: intake.organization_id || intake.resident.organization_id,
                team_id: intake.team_id || intake.resident.team_id,
                metadata: { intake_id: intake.id, scheduled_time: intake.scheduled_time }
            })

            if (!alertError) {
                await supabase.from('medication_intakes')
                    .update({ pre_alert_sent_at: now.toISOString() })
                    .eq('id', intake.id)
            } else {
                console.error(`[Medication Alerts] Error creating alert:`, alertError)
            }
        }

        // 2. Check for Overdue Alerts
        // We only alert for medications that are PAST scheduled time and NOT yet alerted as overdue
        const { data: overdue, error: overdueError } = await supabase
            .from('medication_intakes')
            .select('*, medication:medication_id(name), resident:resident_id(first_name, last_name, organization_id, team_id)')
            .eq('state', 'scheduled')
            .is('overdue_alert_sent_at', null)
            .lt('scheduled_time', now.toISOString())

        if (overdueError) throw overdueError

        for (const intake of overdue || []) {
            console.log(`[Medication Alerts] Creating overdue alert for ${intake.medication.name} - Resident: ${intake.resident.first_name} ${intake.resident.last_name}`)

            const { error: alertError } = await supabase.from('alerts').insert({
                resident_id: intake.resident_id,
                alert_type: 'medication',
                severity: 'critical',
                title: 'Medication Overdue',
                message: `${intake.medication.name} for ${intake.resident.first_name} ${intake.resident.last_name} is overdue!`,
                organization_id: intake.organization_id || intake.resident.organization_id,
                team_id: intake.team_id || intake.resident.team_id,
                metadata: { intake_id: intake.id, scheduled_time: intake.scheduled_time }
            })

            if (!alertError) {
                await supabase.from('medication_intakes')
                    .update({ overdue_alert_sent_at: now.toISOString() })
                    .eq('id', intake.id)
            } else {
                console.error(`[Medication Alerts] Error creating overdue alert:`, alertError)
            }
        }

        return new Response(JSON.stringify({
            success: true,
            pre_alerts: dueSoon?.length || 0,
            overdue_alerts: overdue?.length || 0
        }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error(`[Medication Alerts] Global error:`, error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})
