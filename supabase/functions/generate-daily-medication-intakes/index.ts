import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const UK_TIMEZONE = 'Europe/London'

Deno.serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    // Calculate today's date in UK timezone
    const ukFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: UK_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })
    const todayStr = ukFormatter.format(now) // "YYYY-MM-DD"

    console.log(`[Generate Daily Intakes] Running at ${now.toISOString()}, UK date: ${todayStr}`)

    try {
        // 1. Fetch all active, scheduled medications with times
        const { data: medications, error: medsError } = await supabase
            .from('medications')
            .select('*, resident:resident_id(id, organization_id, care_home_id)')
            .eq('status', 'active')
            .neq('schedule_type', 'PRN (As Needed)')

        if (medsError) throw medsError

        if (!medications || medications.length === 0) {
            console.log('[Generate Daily Intakes] No active scheduled medications found.')
            return new Response(JSON.stringify({
                success: true,
                generated: 0,
                message: 'No active scheduled medications'
            }), { headers: { 'Content-Type': 'application/json' } })
        }

        console.log(`[Generate Daily Intakes] Found ${medications.length} active scheduled medications.`)

        // 2. For each medication, check if intakes exist for today and create missing ones
        // Build the day range in UTC for the UK date
        const startOfDayUTC = new Date(`${todayStr}T00:00:00Z`)
        // Adjust for UK offset (approximate - edge function runs at 00:01 UK, so GMT offset is relevant)
        // We use a wide range to cover both GMT and BST
        const rangeStartISO = new Date(startOfDayUTC.getTime() - 1 * 60 * 60 * 1000).toISOString() // 1h before
        const rangeEndISO = new Date(startOfDayUTC.getTime() + 25 * 60 * 60 * 1000).toISOString() // 25h after

        // 3. Fetch all existing intakes for today (batch query)
        const { data: existingIntakes, error: intakesError } = await supabase
            .from('medication_intakes')
            .select('medication_id, scheduled_time')
            .gte('scheduled_time', rangeStartISO)
            .lte('scheduled_time', rangeEndISO)

        if (intakesError) throw intakesError

        // Build lookup set: medication_id + scheduled_time
        const existingKeys = new Set(
            (existingIntakes || []).map((i: any) => `${i.medication_id}_${i.scheduled_time}`)
        )

        // 4. Generate missing intakes
        const intakesToInsert: any[] = []

        for (const med of medications) {
            if (!med.times || med.times.length === 0) continue

            // Check start date
            const medStartDate = med.start_date?.split('T')[0] || med.start_date
            if (medStartDate && medStartDate > todayStr) continue

            for (const time of med.times) {
                // Create the scheduled time in UTC from the UK local time
                const dateTimeStr = `${todayStr}T${time}:00`
                // Simple approach: create Date assuming UTC, then adjust
                // For a more accurate UK-to-UTC conversion:
                const ukDate = new Date(dateTimeStr + 'Z')
                // Check if BST (rough: late March to late October)
                const month = ukDate.getMonth() + 1
                const isBST = month >= 4 && month <= 9 // Simplified BST check
                const scheduledTimeUTC = isBST
                    ? new Date(ukDate.getTime() - 1 * 60 * 60 * 1000)
                    : ukDate

                const key = `${med.id}_${scheduledTimeUTC.toISOString()}`

                if (!existingKeys.has(key)) {
                    intakesToInsert.push({
                        medication_id: med.id,
                        resident_id: med.resident_id,
                        scheduled_time: scheduledTimeUTC.toISOString(),
                        quantity: med.time_quantities?.[time] || 1,
                        status: 'scheduled',
                        organization_id: med.organization_id || med.resident?.organization_id,
                        care_home_id: med.care_home_id || med.resident?.care_home_id
                    })
                }
            }
        }

        console.log(`[Generate Daily Intakes] Inserting ${intakesToInsert.length} new intakes.`)

        if (intakesToInsert.length > 0) {
            // Insert in batches of 500 to avoid payload limits
            const batchSize = 500
            let totalInserted = 0

            for (let i = 0; i < intakesToInsert.length; i += batchSize) {
                const batch = intakesToInsert.slice(i, i + batchSize)
                const { error: insertError } = await supabase
                    .from('medication_intakes')
                    .insert(batch)

                if (insertError) {
                    console.error(`[Generate Daily Intakes] Error inserting batch ${i / batchSize + 1}:`, insertError)
                } else {
                    totalInserted += batch.length
                }
            }

            console.log(`[Generate Daily Intakes] Successfully inserted ${totalInserted} intakes.`)

            return new Response(JSON.stringify({
                success: true,
                generated: totalInserted,
                total_medications: medications.length,
                timestamp: now.toISOString()
            }), { headers: { 'Content-Type': 'application/json' } })
        }

        return new Response(JSON.stringify({
            success: true,
            generated: 0,
            message: 'All intakes already exist for today',
            total_medications: medications.length,
            timestamp: now.toISOString()
        }), { headers: { 'Content-Type': 'application/json' } })

    } catch (error) {
        console.error(`[Generate Daily Intakes] Global error:`, error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})
