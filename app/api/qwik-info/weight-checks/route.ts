import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from 'next/server';

// Helper to create Supabase client
function createSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.delete(name);
        },
      },
    }
  );

  return { supabase, response };
}

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

    const { supabase } = createSupabaseClient(request);

    // --- Authentication ---
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Fetch latest MUST assessments for all residents
    const { data: mustAssessments, error: mustAssessmentsError } = await supabase
      .from('must_assessments')
      .select('id, resident_id, height_cm, bmi_value, total_must_score, assessment_date')
      .in('resident_id', residentIds)
      .eq('status', 'active')
      .order('assessment_date', { ascending: false });

    if (mustAssessmentsError) {
      console.error('Error fetching MUST assessments:', mustAssessmentsError);
      // Don't fail the request, just continue without MUST data
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

      // Get latest MUST assessment for this resident
      const residentMustAssessments = (mustAssessments || [])
        .filter(ma => ma.resident_id === resident.id)
        .sort((a, b) => new Date(b.assessment_date).getTime() - new Date(a.assessment_date).getTime());

      const latestMustAssessment = residentMustAssessments[0] || null;

      // Get height, BMI, and MUST score from assessment
      const heightCm = latestMustAssessment ? parseFloat(latestMustAssessment.height_cm.toString()) : null;
      let bmi = latestMustAssessment ? parseFloat(latestMustAssessment.bmi_value.toString()) : null;
      const mustScore = latestMustAssessment ? latestMustAssessment.total_must_score : null;

      // If no MUST assessment but we have weight and height, calculate BMI
      if (!bmi && lastWeight && heightCm) {
        const heightM = heightCm / 100;
        bmi = lastWeight / (heightM * heightM);
      }

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
        heightCm: heightCm,
        bmi: bmi,
        mustScore: mustScore,
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
