import fs from "node:fs";
import path from "node:path";
import { buildWorld } from "../db/fixtures";

export const WORLD_FILE = path.resolve(__dirname, ".auth/world.json");

/** Creates fixture orgs/homes/users in local Supabase and records them for the specs. */
export default async function globalSetup(): Promise<void> {
  const w = await buildWorld();
  fs.mkdirSync(path.dirname(WORLD_FILE), { recursive: true });
  fs.writeFileSync(WORLD_FILE, JSON.stringify({ runId: w.runId, homes: w.homes, users: w.users }, null, 2));
}
