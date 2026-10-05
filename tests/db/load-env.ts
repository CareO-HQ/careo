import { assertLocalSupabase, readTestEnv } from "./env";

// Override anything inherited from .env.local so tests can never reach the hosted project.
Object.assign(process.env, readTestEnv());
assertLocalSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL);
