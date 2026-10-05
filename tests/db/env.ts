import fs from "node:fs";
import path from "node:path";

/** Parses .env.test into an object (no dependency on dotenv). */
export function readTestEnv(): Record<string, string> {
  const file = path.resolve(__dirname, "../../.env.test");
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** Refuses to run DB tests against anything but a local Supabase. */
export function assertLocalSupabase(url: string | undefined): void {
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set for DB tests");
  const host = new URL(url).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Refusing to run DB tests against non-local Supabase: ${host}`);
  }
}
