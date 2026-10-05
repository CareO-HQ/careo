import { assertLocalSupabase, readTestEnv } from "./env";

export default async function setup(): Promise<void> {
  const env = readTestEnv();
  assertLocalSupabase(env.NEXT_PUBLIC_SUPABASE_URL);
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (e) {
    throw new Error(`Local Supabase is not reachable. Run \`npx supabase start\` first. (${String(e)})`);
  }
}
