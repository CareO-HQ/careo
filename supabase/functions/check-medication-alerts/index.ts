/**
 * Legacy Supabase Edge Function. Medication alert scheduling runs on Vercel Cron
 * (`/api/cron/medication-missed-alerts`). This file is kept for manual invocation
 * or local experiments only.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    console.log(`[Medication Alerts] Running at ${now.toISOString()}`)

    try {
        const selectWithJoins =
            '*, medication:medication_id(name), resident:resident_id(first_name, last_name, organization_id, team_id)'

        const { data: dueSoon, error: dueSoonError } = await supabase
            .from('medication_intakes')
            .select(selectWithJoins)
            .eq('status', 'scheduled')
            .lte('scheduled_time', thirtyMinsFromNow.toISOString())
            .gt('scheduled_time', now.toISOString())

        if (dueSoonError) throw dueSoonError

        let preAlertsUpdated = 0
        for (const intake of dueSoon || []) {
            const scheduledTime = new Date(intake.scheduled_time)
            const remainingMins = Math.round((scheduledTime.getTime() - now.getTime()) / 60000)

            const { data: allAlerts, error: findError } = await supabase
                .from('alerts')
                .select('id, metadata')
                .eq('type', 'medication')
                .eq('resident_id', intake.resident_id)
                .eq('is_resolved', false)

            let existingAlert = null
            if (!findError && allAlerts) {
                existingAlert = allAlerts.find(alert =>
                    alert.metadata && alert.metadata.intake_id === intake.id
                )
            } else if (findError) {
                console.error(`[Medication Alerts] Error finding existing alert:`, findError)
            }

            const alertData = {
                resident_id: intake.resident_id,
                type: 'medication',
                severity: 'info',
                title: 'Medication Due Soon',
                message: `${intake.medication.name} for ${intake.resident.first_name} ${intake.resident.last_name} - Time left to administer: ${remainingMins} minutes`,
                organization_id: intake.organization_id || intake.resident.organization_id,
                care_home_id: intake.care_home_id ?? null,
                target_roles: ['nurse'],
                metadata: { intake_id: intake.id, scheduled_time: intake.scheduled_time }
            }

            if (existingAlert) {
                const { error: updateError } = await supabase
                    .from('alerts')
                    .update({
                        ...alertData,
                        updated_at: now.toISOString()
                    })
                    .eq('id', existingAlert.id)

                if (updateError) {
                    console.error(`[Medication Alerts] Error updating alert:`, updateError)
                } else {
                    preAlertsUpdated++
                }
            } else {
                const { error: insertError } = await supabase
                    .from('alerts')
                    .insert(alertData)

                if (insertError) {
                    console.error(`[Medication Alerts] Error creating alert:`, insertError)
                } else {
                    preAlertsUpdated++
                }
            }
        }

        const { data: overdue, error: overdueError } = await supabase
            .from('medication_intakes')
            .select(selectWithJoins)
            .eq('status', 'scheduled')
            .lt('scheduled_time', oneHourAgo.toISOString())

        if (overdueError) throw overdueError

        let overdueAlertsUpdated = 0
        for (const intake of overdue || []) {
            const scheduledTime = new Date(intake.scheduled_time)
            const overdueMins = Math.round((now.getTime() - scheduledTime.getTime()) / 60000)

            const { data: allAlerts, error: findError } = await supabase
                .from('alerts')
                .select('id, metadata')
                .eq('type', 'medication')
                .eq('resident_id', intake.resident_id)
                .eq('is_resolved', false)

            let existingAlert = null
            if (!findError && allAlerts) {
                existingAlert = allAlerts.find(alert =>
                    alert.metadata && alert.metadata.intake_id === intake.id
                )
            } else if (findError) {
                console.error(`[Medication Alerts] Error finding existing alert:`, findError)
            }

            const alertData = {
                resident_id: intake.resident_id,
                type: 'medication',
                severity: 'critical',
                title: 'Medication Overdue',
                message: `${intake.medication.name} for ${intake.resident.first_name} ${intake.resident.last_name} - Overdue by: ${overdueMins} minutes`,
                organization_id: intake.organization_id || intake.resident.organization_id,
                care_home_id: intake.care_home_id ?? null,
                target_roles: ['nurse'],
                metadata: { intake_id: intake.id, scheduled_time: intake.scheduled_time }
            }

            if (existingAlert) {
                const { error: updateError } = await supabase
                    .from('alerts')
                    .update({
                        ...alertData,
                        updated_at: now.toISOString()
                    })
                    .eq('id', existingAlert.id)

                if (updateError) {
                    console.error(`[Medication Alerts] Error updating overdue alert:`, updateError)
                } else {
                    overdueAlertsUpdated++
                }
            } else {
                const { error: insertError } = await supabase
                    .from('alerts')
                    .insert(alertData)

                if (insertError) {
                    console.error(`[Medication Alerts] Error creating overdue alert:`, insertError)
                } else {
                    overdueAlertsUpdated++
                }
            }
        }

        return new Response(JSON.stringify({
            success: true,
            pre_alerts: preAlertsUpdated,
            overdue_alerts: overdueAlertsUpdated,
            timestamp: now.toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[Medication Alerts] Global error:`, error)
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})
