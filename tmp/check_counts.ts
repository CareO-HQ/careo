
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log("Checking teams...");
  const { data: teams } = await supabase.from("teams").select("id, name");
  console.log("Teams:", teams);

  if (teams) {
    for (const team of teams) {
      const { count: resCount } = await supabase.from("residents").select("id", { count: "exact", head: true }).eq("team_id", team.id);
      const { count: staffCount } = await supabase.from("team_staff").select("*", { count: "exact", head: true }).eq("team_id", team.id);
      const { count: activeUsersCount } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("active_team_id", team.id);
      
      console.log(`Team: ${team.name} (${team.id})`);
      console.log(` - Residents: ${resCount}`);
      console.log(` - Staff (team_staff): ${staffCount}`);
      console.log(` - Staff (active_team_id): ${activeUsersCount}`);
    }
  }
  
  const { count: totalUsers } = await supabase.from("users").select("id", { count: "exact", head: true });
  console.log(`Total Users in system: ${totalUsers}`);
}

checkData();
