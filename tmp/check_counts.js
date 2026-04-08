
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log("Checking teams...");
  const { data: teams, error: teamsError } = await supabase.from("teams").select("id, name");
  if (teamsError) {
    console.error("Error fetching teams:", teamsError);
    return;
  }
  console.log("Teams:", teams);

  if (teams) {
    for (const team of teams) {
      const { count: resCount, error: resError } = await supabase.from("residents").select("id", { count: "exact", head: true }).eq("team_id", team.id);
      const { count: staffCount, error: staffError } = await supabase.from("team_staff").select("*", { count: "exact", head: true }).eq("team_id", team.id);
      const { count: activeUsersCount, error: activeError } = await supabase.from("users").select("id", { count: "exact", head: true }).eq("active_team_id", team.id);
      
      console.log(`Team: ${team.name} (${team.id})`);
      console.log(` - Residents: ${resCount}`);
      console.log(` - Staff (team_staff): ${staffCount}`);
      console.log(` - Staff (active_team_id): ${activeUsersCount}`);
      
      if (resError) console.error(" - Residents error:", resError);
      if (staffError) console.error(" - Staff error:", staffError);
      if (activeError) console.error(" - Active users error:", activeError);
    }
  }
  
  const { count: totalUsers } = await supabase.from("users").select("id", { count: "exact", head: true });
  console.log(`Total Users in system: ${totalUsers}`);
}

checkData();
