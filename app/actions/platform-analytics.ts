"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AuthorizationError, getServiceClient, requireSessionActor } from "@/lib/server-auth";

/**
 * Raw timeline data for the SaaS admin growth charts. Only dates and roles leave
 * the server - no names, emails or resident details.
 */
export interface PlatformUserPoint {
  createdAt: string;
  role: string;
  lastSignInAt: string | null;
}

export interface ResidentStayPoint {
  /** Admission date, falling back to record creation. */
  start: string;
  /** Discharge date, or null while the resident is still in care. */
  end: string | null;
}

export interface PlatformGrowthData {
  users: PlatformUserPoint[];
  organizations: string[];
  careHomes: string[];
  residents: ResidentStayPoint[];
  generatedAt: string;
}

const PAGE_SIZE = 1000;

/** PostgREST caps each response, so page through the whole table. */
async function selectAll<Row>(
  client: SupabaseClient,
  table: string,
  columns: string
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .order("id")
      .range(from, from + PAGE_SIZE - 1)
      .returns<Row[]>();
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function loadLastSignIns(client: SupabaseClient): Promise<Map<string, string | null>> {
  const lastSignIns = new Map<string, string | null>();
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;
    data.users.forEach((user) => lastSignIns.set(user.id, user.last_sign_in_at ?? null));
    if (data.users.length < PAGE_SIZE) return lastSignIns;
  }
}

interface UserRow {
  id: string;
  created_at: string;
  role: string | null;
  is_saas_admin: boolean | null;
}

interface ResidentRow {
  admission_date: string | null;
  discharge_date: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
}

export async function getPlatformGrowthData(): Promise<PlatformGrowthData> {
  const actor = await requireSessionActor();
  if (!actor.is_saas_admin) throw new AuthorizationError();

  const client = getServiceClient();
  const [userRows, organizationRows, careHomeRows, residentRows, lastSignIns] = await Promise.all([
    selectAll<UserRow>(client, "users", "id, created_at, role, is_saas_admin"),
    selectAll<{ created_at: string }>(client, "organizations", "created_at"),
    selectAll<{ created_at: string }>(client, "care_homes", "created_at"),
    selectAll<ResidentRow>(client, "residents", "admission_date, discharge_date, status, created_at, updated_at"),
    loadLastSignIns(client),
  ]);

  return {
    // Platform admins are staff of the SaaS, not customers, so they are left out of growth.
    users: userRows
      .filter((user) => !user.is_saas_admin)
      .map((user) => ({
        createdAt: user.created_at,
        role: user.role ?? "unassigned",
        lastSignInAt: lastSignIns.get(user.id) ?? null,
      })),
    organizations: organizationRows.map((row) => row.created_at),
    careHomes: careHomeRows.map((row) => row.created_at),
    residents: residentRows.map((row) => ({
      start: row.admission_date ?? row.created_at,
      end:
        row.discharge_date ??
        (row.status === "discharged" ? row.updated_at ?? row.created_at : null),
    })),
    generatedAt: new Date().toISOString(),
  };
}
