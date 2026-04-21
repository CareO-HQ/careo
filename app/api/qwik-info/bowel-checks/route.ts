import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from 'next/server';
import { differenceInDays, subDays, parseISO, startOfDay } from 'date-fns';
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
    const { data: residents, error: residentsError } = await supabase
      .from('residents')
      .select('id, first_name, middle_name, last_name, room_number')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('first_name', { ascending: true });

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
    const today = startOfDay(now);
    const sevenDaysAgo = subDays(today, 7);
    const thirtyDaysAgo = subDays(today, 30);

    // Fetch all bowel entries for all residents in one query
    const residentIds = residents.map(r => r.id);
    const { data: bowelEntries, error: bowelError } = await supabase
      .from('continence_entries')
      .select('resident_id, date, time, entry_type, stool_type, created_at')
      .in('resident_id', residentIds)
      .eq('entry_type', 'bowel')
      .order('created_at', { ascending: false });

    if (bowelError) {
      console.error('Error fetching bowel entries:', bowelError);
      return NextResponse.json(
        { error: 'Failed to fetch bowel entries', details: bowelError.message },
        { status: 500 }
      );
    }

    // Process data for each resident
    const bowelCheckData = residents.map(resident => {
      // Build full name, handling null/undefined values
      const nameParts = [
        resident.first_name?.trim(),
        resident.middle_name?.trim(),
        resident.last_name?.trim()
      ].filter(part => part && part.length > 0);

      const fullName = nameParts.length > 0 ? nameParts.join(' ') : 'Unknown Resident';

      // Filter entries for this resident
      const residentBowelEntries = bowelEntries?.filter(
        entry => entry.resident_id === resident.id
      ) || [];

      // Find last bowel movement
      const lastBowelEntry = residentBowelEntries[0]; // Already sorted by created_at desc

      // Calculate days since last bowel movement
      let daysSinceLastBowel = 999; // Default high number for no data
      if (lastBowelEntry && lastBowelEntry.date) {
        try {
          // Parse date in UK timezone
          const lastBowelDate = parseISO(lastBowelEntry.date);
          if (!isNaN(lastBowelDate.getTime())) {
            daysSinceLastBowel = Math.max(0, differenceInDays(today, startOfDay(lastBowelDate)));
          } else {
            console.warn(`Invalid date for resident ${resident.id}: ${lastBowelEntry.date}`);
          }
        } catch (e) {
          console.error(`Error parsing date for resident ${resident.id}:`, e);
        }
      }

      // Count bowel movements in last 7 and 30 days
      const bowelCountLast7Days = residentBowelEntries.filter(entry => {
        if (!entry.date) return false;
        try {
          const entryDate = parseISO(entry.date);
          return !isNaN(entryDate.getTime()) && startOfDay(entryDate) >= sevenDaysAgo;
        } catch (e) {
          return false;
        }
      }).length;

      const bowelCountLast30Days = residentBowelEntries.filter(entry => {
        if (!entry.date) return false;
        try {
          const entryDate = parseISO(entry.date);
          return !isNaN(entryDate.getTime()) && startOfDay(entryDate) >= thirtyDaysAgo;
        } catch (e) {
          return false;
        }
      }).length;

      // Determine status
      let status: 'normal' | 'monitor' | 'alert' | 'critical' | 'no-data';
      if (!lastBowelEntry) {
        status = 'no-data';
      } else if (daysSinceLastBowel >= 5) {
        status = 'critical';
      } else if (daysSinceLastBowel >= 3) {
        status = 'alert';
      } else if (daysSinceLastBowel >= 2) {
        status = 'monitor';
      } else {
        status = 'normal';
      }

      return {
        residentId: resident.id,
        name: fullName,
        roomNumber: resident.room_number?.trim() || '',
        lastBowelDate: lastBowelEntry?.date || null,
        lastBowelTime: lastBowelEntry?.time || null,
        daysSinceLastBowel: lastBowelEntry ? daysSinceLastBowel : 999,
        bowelCountLast7Days,
        bowelCountLast30Days,
        status,
        lastBowelType: lastBowelEntry?.stool_type || null,
      };
    });

    return NextResponse.json({ data: bowelCheckData }, { status: 200 });
  } catch (error: any) {
    console.error('Error in bowel-checks API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
