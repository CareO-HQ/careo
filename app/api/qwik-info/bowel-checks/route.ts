import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { differenceInDays, subDays, parseISO } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_CONVEX_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_CONVEX_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all residents for the team
    const { data: residents, error: residentsError } = await supabase
      .from('residents')
      .select('id, first_name, middle_name, last_name, room_number')
      .eq('team_id', teamId)
      .order('first_name', { ascending: true });

    if (residentsError) {
      console.error('Error fetching residents:', residentsError);
      return NextResponse.json(
        { error: 'Failed to fetch residents' },
        { status: 500 }
      );
    }

    if (!residents || residents.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get date ranges
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const thirtyDaysAgo = subDays(now, 30);

    // Fetch all bowel entries for all residents in one query
    const residentIds = residents.map(r => r.id);
    const { data: bowelEntries, error: bowelError } = await supabase
      .from('continence_entries')
      .select('resident_id, date, time, entry_type, bristol_type, created_at')
      .in('resident_id', residentIds)
      .eq('entry_type', 'bowel')
      .order('created_at', { ascending: false });

    if (bowelError) {
      console.error('Error fetching bowel entries:', bowelError);
      return NextResponse.json(
        { error: 'Failed to fetch bowel entries' },
        { status: 500 }
      );
    }

    // Process data for each resident
    const bowelCheckData = residents.map(resident => {
      const fullName = [resident.first_name, resident.middle_name, resident.last_name]
        .filter(Boolean)
        .join(' ');

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
          const lastBowelDate = parseISO(lastBowelEntry.date);
          daysSinceLastBowel = differenceInDays(now, lastBowelDate);
        } catch (e) {
          console.error('Error parsing date:', e);
        }
      }

      // Count bowel movements in last 7 and 30 days
      const bowelCountLast7Days = residentBowelEntries.filter(entry => {
        try {
          const entryDate = parseISO(entry.date);
          return entryDate >= sevenDaysAgo;
        } catch (e) {
          return false;
        }
      }).length;

      const bowelCountLast30Days = residentBowelEntries.filter(entry => {
        try {
          const entryDate = parseISO(entry.date);
          return entryDate >= thirtyDaysAgo;
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
        roomNumber: resident.room_number || '',
        lastBowelDate: lastBowelEntry?.date || null,
        lastBowelTime: lastBowelEntry?.time || null,
        daysSinceLastBowel: lastBowelEntry ? daysSinceLastBowel : 999,
        bowelCountLast7Days,
        bowelCountLast30Days,
        status,
        lastBowelType: lastBowelEntry?.bristol_type || null,
      };
    });

    return NextResponse.json({ data: bowelCheckData });
  } catch (error) {
    console.error('Error in bowel-checks API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
