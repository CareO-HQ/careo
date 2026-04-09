import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch all residents for the team
    const { data: residents, error: residentsError } = await supabase
      .from('residents')
      .select('id, first_name, last_name, middle_name, room_number, weight_check_frequency, team_id, organization_id, care_home_id')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('last_name', { ascending: true });

    if (residentsError) {
      console.error('Error fetching residents:', residentsError);
      return NextResponse.json(
        { error: 'Failed to fetch residents' },
        { status: 500 }
      );
    }

    if (!residents || residents.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Fetch weight records for all residents (latest 2 per resident)
    const residentIds = residents.map(r => r.id);

    const { data: weightRecords, error: weightRecordsError } = await supabase
      .from('weight_records')
      .select('id, resident_id, weight_kg, measurement_date')
      .in('resident_id', residentIds)
      .order('measurement_date', { ascending: false });

    if (weightRecordsError) {
      console.error('Error fetching weight records:', weightRecordsError);
      return NextResponse.json(
        { error: 'Failed to fetch weight records' },
        { status: 500 }
      );
    }

    // Process each resident
    const weightCheckData = residents.map(resident => {
      const fullName = [resident.first_name, resident.middle_name, resident.last_name]
        .filter(Boolean)
        .join(' ');

      // Get latest 2 weight records for this resident
      const residentWeightRecords = (weightRecords || [])
        .filter(wr => wr.resident_id === resident.id)
        .sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime())
        .slice(0, 2);

      const latestRecord = residentWeightRecords[0] || null;
      const previousRecord = residentWeightRecords[1] || null;

      const lastWeight = latestRecord ? parseFloat(latestRecord.weight_kg.toString()) : null;
      const previousWeight = previousRecord ? parseFloat(previousRecord.weight_kg.toString()) : null;
      const change = lastWeight !== null && previousWeight !== null ? lastWeight - previousWeight : null;
      const lastCheckedDate = latestRecord?.measurement_date || null;

      // Calculate next due date based on frequency
      const frequency = resident.weight_check_frequency || 'monthly';
      let nextDueDate: string | null = null;
      let status: 'on-track' | 'due-soon' | 'overdue' | 'no-data' = 'no-data';

      if (lastCheckedDate && frequency !== 'as-needed') {
        const lastChecked = new Date(lastCheckedDate);
        const daysToAdd = frequency === 'weekly' ? 7 : 30;
        const nextDue = new Date(lastChecked);
        nextDue.setDate(nextDue.getDate() + daysToAdd);
        nextDueDate = nextDue.toISOString().split('T')[0];

        // Calculate status
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        nextDue.setHours(0, 0, 0, 0);

        const daysUntilDue = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) {
          status = 'overdue';
        } else if (daysUntilDue <= 2) {
          status = 'due-soon';
        } else {
          status = 'on-track';
        }
      } else if (lastCheckedDate && frequency === 'as-needed') {
        status = 'on-track';
      }

      return {
        residentId: resident.id,
        name: fullName,
        roomNumber: resident.room_number || '-',
        frequency: frequency,
        lastWeight: lastWeight,
        previousWeight: previousWeight,
        change: change,
        lastCheckedDate: lastCheckedDate,
        nextDueDate: nextDueDate,
        status: status,
      };
    });

    return NextResponse.json({ data: weightCheckData }, { status: 200 });
  } catch (error: any) {
    console.error('Error in weight-checks API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
