import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const UK_TIMEZONE = 'Europe/London'

Deno.serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000)
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000) // 15-minute allotted time window

    console.log(`[Medication Alerts] Running at ${now.toISOString()}`)

    try {
        // 1. Check for Pre-medication Alerts (Due in <= 30 mins)
        // Send alerts every 2 minutes for medications due within 30 minutes
        const { data: dueSoon, error: dueSoonError } = await supabase
            .from('medication_intakes')
            .select('*, medication:medication_id(name), resident:resident_id(first_name, last_name, organization_id, team_id)')
            .eq('state', 'scheduled')
            .lte('scheduled_time', thirtyMinsFromNow.toISOString())
            .gt('scheduled_time', now.toISOString())

        if (dueSoonError) throw dueSoonError

        let preAlertsUpdated = 0
        for (const intake of dueSoon || []) {
            const scheduledTime = new Date(intake.scheduled_time)
            const remainingMins = Math.round((scheduledTime.getTime() - now.getTime()) / 60000)

            console.log(`[Medication Alerts] Updating pre-med alert for ${intake.medication.name} - Resident: ${intake.resident.first_name} ${intake.resident.last_name} - Time left: ${remainingMins} minutes`)

            // Check if alert already exists for this intake
            // Query all medication alerts for this resident and filter by metadata
            const { data: allAlerts, error: findError } = await supabase
                .from('alerts')
                .select('id, metadata')
                .eq('type', 'medication')
                .eq('resident_id', intake.resident_id)
                .eq('is_resolved', false)

            let existingAlert = null
            if (!findError && allAlerts) {
                // Find alert with matching intake_id in metadata
                existingAlert = allAlerts.find(alert => 
                    alert.metadata && alert.metadata.intake_id === intake.id
                )
            } else if (findError) {
                console.error(`[Medication Alerts] Error finding existing alert:`, findError)
                // Continue anyway - will try to create new alert
            }

            const alertData = {
                resident_id: intake.resident_id,
                type: 'medication', // Fixed: use 'type' not 'alert_type'
                severity: 'info',
                title: 'Medication Due Soon',
                message: `${intake.medication.name} for ${intake.resident.first_name} ${intake.resident.last_name} - Time left to administer: ${remainingMins} minutes`,
                organization_id: intake.organization_id || intake.resident.organization_id,
                target_roles: ['owner', 'nurse'], // Restrict to owner and nurse roles
                metadata: { intake_id: intake.id, scheduled_time: intake.scheduled_time }
            }

            if (existingAlert) {
                // Update existing alert
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
                // Create new alert
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

        // 2. Check for Overdue Alerts
        // Send alerts every 2 minutes for medications past scheduled time by 15+ minutes (after allotted time expires)
        const { data: overdue, error: overdueError } = await supabase
            .from('medication_intakes')
            .select('*, medication:medication_id(name), resident:resident_id(first_name, last_name, organization_id, team_id)')
            .eq('state', 'scheduled')
            .lt('scheduled_time', fifteenMinutesAgo.toISOString())

        if (overdueError) throw overdueError

        let overdueAlertsUpdated = 0
        for (const intake of overdue || []) {
            const scheduledTime = new Date(intake.scheduled_time)
            const overdueMins = Math.round((now.getTime() - scheduledTime.getTime()) / 60000)

            console.log(`[Medication Alerts] Updating overdue alert for ${intake.medication.name} - Resident: ${intake.resident.first_name} ${intake.resident.last_name} - Overdue by: ${overdueMins} minutes`)

            // Check if alert already exists for this intake
            // Query all medication alerts for this resident and filter by metadata
            const { data: allAlerts, error: findError } = await supabase
                .from('alerts')
                .select('id, metadata')
                .eq('type', 'medication')
                .eq('resident_id', intake.resident_id)
                .eq('is_resolved', false)

            let existingAlert = null
            if (!findError && allAlerts) {
                // Find alert with matching intake_id in metadata
                existingAlert = allAlerts.find(alert => 
                    alert.metadata && alert.metadata.intake_id === intake.id
                )
            } else if (findError) {
                console.error(`[Medication Alerts] Error finding existing alert:`, findError)
                // Continue anyway - will try to create new alert
            }

            const alertData = {
                resident_id: intake.resident_id,
                type: 'medication', // Fixed: use 'type' not 'alert_type'
                severity: 'critical',
                title: 'Medication Overdue',
                message: `${intake.medication.name} for ${intake.resident.first_name} ${intake.resident.last_name} - Overdue by: ${overdueMins} minutes`,
                organization_id: intake.organization_id || intake.resident.organization_id,
                target_roles: ['owner', 'nurse'], // Restrict to owner and nurse roles
                metadata: { intake_id: intake.id, scheduled_time: intake.scheduled_time }
            }

            if (existingAlert) {
                // Update existing alert
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
                // Create new alert
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
    } catch (error) {
        console.error(`[Medication Alerts] Global error:`, error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})
