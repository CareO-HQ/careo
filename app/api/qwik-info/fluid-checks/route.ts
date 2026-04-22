import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from 'next/server';
import { differenceInDays, subDays, parseISO, startOfDay, format } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const UK_TIMEZONE = 'Europe/London';

// Helper to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

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

    // Validate teamId
    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(teamId)) {
      return NextResponse.json(
        { error: 'Invalid Team ID format' },
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
    // Try to include fluid_target, but gracefully fallback if column doesn't exist
    const residentsQuery = supabase
      .from('residents')
      .select('id, first_name, middle_name, last_name, room_number, fluid_target')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('first_name', { ascending: true });

    let { data: residents, error: residentsError } = await residentsQuery;

    // If fluid_target column doesn't exist, retry without it
    if (residentsError && (residentsError.code === '42703' || residentsError.message?.includes('fluid_target'))) {
      console.log('[Fluid Check API] fluid_target column not found, fetching without it');
      const fallbackQuery = await supabase
        .from('residents')
        .select('id, first_name, middle_name, last_name, room_number')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .order('first_name', { ascending: true });

      residents = fallbackQuery.data?.map(r => ({ ...r, fluid_target: null })) || null;
      residentsError = fallbackQuery.error;
    }

    if (residentsError) {
      console.error('Error fetching residents:', residentsError);
      return NextResponse.json(
        { error: 'Failed to fetch residents', details: residentsError.message },
        { status: 500 }
      );
    }

    if (!residents || residents.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Get date ranges in UK timezone
    const now = toZonedTime(new Date(), UK_TIMEZONE);
    const today = format(startOfDay(now), 'yyyy-MM-dd');
    const yesterday = format(subDays(startOfDay(now), 1), 'yyyy-MM-dd');
    const sevenDaysAgo = format(subDays(startOfDay(now), 7), 'yyyy-MM-dd');

    // Fetch all fluid entries for all residents in one query
    const residentIds = residents.map(r => r.id);
    const { data: fluidEntries, error: fluidError } = await supabase
      .from('food_fluid_logs')
      .select('resident_id, date, fluid_consumed_ml, timestamp')
      .in('resident_id', residentIds)
      .not('fluid_consumed_ml', 'is', null)
      .gte('date', sevenDaysAgo)
      .order('timestamp', { ascending: false });

    if (fluidError) {
      console.error('Error fetching fluid entries:', fluidError);
      return NextResponse.json(
        { error: 'Failed to fetch fluid entries', details: fluidError.message },
        { status: 500 }
      );
    }

    // Process data for each resident
    const fluidCheckData = residents.map(resident => {
      // Build full name, handling null/undefined values
      const nameParts = [
        resident.first_name?.trim(),
        resident.middle_name?.trim(),
        resident.last_name?.trim()
      ].filter(part => part && part.length > 0);

      const fullName = nameParts.length > 0 ? nameParts.join(' ') : 'Unknown Resident';

      // Filter entries for this resident
      const residentFluidEntries = fluidEntries?.filter(
        entry => entry.resident_id === resident.id
      ) || [];

      // Calculate today's intake
      const todayEntries = residentFluidEntries.filter(
        entry => entry.date === today
      );
      const todayIntake = todayEntries.reduce(
        (sum, entry) => sum + (entry.fluid_consumed_ml || 0),
        0
      );

      // Calculate yesterday's intake
      const yesterdayEntries = residentFluidEntries.filter(
        entry => entry.date === yesterday
      );
      const yesterdayIntake = yesterdayEntries.reduce(
        (sum, entry) => sum + (entry.fluid_consumed_ml || 0),
        0
      );

      // Calculate last 7 days data
      const last7DaysEntries = residentFluidEntries.filter(entry => {
        if (!entry.date) return false;
        return entry.date >= sevenDaysAgo;
      });

      const last7DaysTotal = last7DaysEntries.reduce(
        (sum, entry) => sum + (entry.fluid_consumed_ml || 0),
        0
      );

      const last7DaysAverage = last7DaysEntries.length > 0
        ? Math.round(last7DaysTotal / 7)
        : 0;

      // Calculate progress percentage
      const fluidTarget = resident.fluid_target || null;
      const progressPercentage = fluidTarget && fluidTarget > 0
        ? Math.round((todayIntake / fluidTarget) * 100)
        : 0;

      // Determine status based on progress
      let status: 'excellent' | 'good' | 'low' | 'critical' | 'no-target';
      if (!fluidTarget) {
        status = 'no-target';
      } else if (progressPercentage >= 90) {
        status = 'excellent';
      } else if (progressPercentage >= 70) {
        status = 'good';
      } else if (progressPercentage >= 50) {
        status = 'low';
      } else {
        status = 'critical';
      }

      // Determine trend (comparing today vs yesterday)
      let trend: 'up' | 'down' | 'stable';
      if (todayIntake > yesterdayIntake * 1.1) {
        trend = 'up';
      } else if (todayIntake < yesterdayIntake * 0.9) {
        trend = 'down';
      } else {
        trend = 'stable';
      }

      return {
        residentId: resident.id,
        name: fullName,
        roomNumber: resident.room_number?.trim() || '',
        fluidTarget,
        todayIntake,
        yesterdayIntake,
        last7DaysAverage,
        last7DaysTotal,
        progressPercentage,
        status,
        trend,
      };
    });

    return NextResponse.json({ data: fluidCheckData }, { status: 200 });
  } catch (error: any) {
    console.error('Error in fluid-checks API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
