import postgres from "postgres";
import type { Home } from "./fixtures";

export const DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

interface ColumnInfo {
  table: string;
  column: string;
  udt: string;
  nullable: boolean;
  hasDefault: boolean;
  fkTable: string | null;
  fkSchema: string | null;
  checkDef: string | null;
}

export interface SeedResult {
  /** table -> id of the seeded row */
  seeded: Map<string, string>;
  /** table -> reason it could not be seeded */
  skipped: Map<string, string>;
}

const SCOPE_TABLES: Record<string, keyof Home> = {
  organizations: "orgId",
  care_homes: "careHomeId",
  teams: "teamId",
  residents: "residentId",
};

/** Tables that define tenancy itself or are handled by dedicated tests. */
const EXCLUDE = new Set(["organizations", "care_homes", "teams", "residents", "users"]);

export async function loadColumns(sql: postgres.Sql): Promise<ColumnInfo[]> {
  return sql<ColumnInfo[]>`
    select c.table_name as "table", c.column_name as "column", c.udt_name as udt,
           c.is_nullable = 'YES' as nullable, c.column_default is not null or c.is_identity = 'YES' as "hasDefault",
           fk.ftable as "fkTable", fk.fschema as "fkSchema", ck.def as "checkDef"
    from information_schema.columns c
    left join lateral (
      select cf.relname as ftable, nf.nspname as fschema
      from pg_constraint con
      join pg_class cr on cr.oid = con.conrelid
      join pg_namespace nr on nr.oid = cr.relnamespace
      join pg_class cf on cf.oid = con.confrelid
      join pg_namespace nf on nf.oid = cf.relnamespace
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
      where con.contype = 'f' and array_length(con.conkey, 1) = 1
        and nr.nspname = 'public' and cr.relname = c.table_name and a.attname = c.column_name
      limit 1
    ) fk on true
    left join lateral (
      select pg_get_constraintdef(con.oid) as def
      from pg_constraint con
      join pg_class cr on cr.oid = con.conrelid
      join pg_namespace nr on nr.oid = cr.relnamespace
      where con.contype = 'c' and nr.nspname = 'public' and cr.relname = c.table_name
        and pg_get_constraintdef(con.oid) ~ ('\\m' || c.column_name || '\\M')
      limit 1
    ) ck on true
    where c.table_schema = 'public'
      and c.table_name in (select tablename from pg_tables where schemaname = 'public')
    order by c.table_name, c.ordinal_position`;
}

async function enumFirstValues(sql: postgres.Sql): Promise<Map<string, string>> {
  const rows = await sql<{ typname: string; label: string }[]>`
    select t.typname, (array_agg(e.enumlabel order by e.enumsortorder))[1] as label
    from pg_type t join pg_enum e on e.enumtypid = t.oid group by t.typname`;
  return new Map(rows.map((r) => [r.typname, r.label]));
}

function literalFromCheck(def: string | null, column: string): string | null {
  if (!def || !def.includes(column)) return null;
  const m = def.match(/'([^']+)'::/);
  return m ? m[1] : null;
}

function valueFor(
  col: ColumnInfo,
  home: Home,
  userId: string,
  enums: Map<string, string>,
  seeded: Map<string, string>
): unknown | undefined {
  if (col.fkSchema === "auth" && col.fkTable === "users") return userId;
  if (col.fkTable && col.fkSchema === "public") {
    if (col.fkTable === "users") return userId;
    const scope = SCOPE_TABLES[col.fkTable];
    if (scope) return home[scope];
    const dep = seeded.get(col.fkTable);
    return dep ?? undefined; // undefined => dependency not seeded yet
  }
  switch (col.column) {
    case "organization_id":
      return home.orgId;
    case "care_home_id":
      return home.careHomeId;
    case "team_id":
      return home.teamId;
    case "resident_id":
      return home.residentId;
  }
  if (/(_by|author_id|user_id|staff_id)$/.test(col.column) && col.udt === "uuid") return userId;
  const fromCheck = literalFromCheck(col.checkDef, col.column);
  if (fromCheck) return fromCheck;
  if (enums.has(col.udt)) return enums.get(col.udt);
  switch (col.udt) {
    case "uuid":
      return crypto.randomUUID();
    case "text":
    case "varchar":
    case "bpchar":
      return col.column.includes("email") ? `seed-${crypto.randomUUID().slice(0, 8)}@test.local` : "seed";
    case "date":
      return "2026-01-01";
    case "time":
    case "timetz":
      return "08:00";
    case "timestamptz":
    case "timestamp":
      return new Date().toISOString();
    case "bool":
      return false;
    case "int2":
    case "int4":
    case "int8":
    case "numeric":
    case "float4":
    case "float8":
      return 1;
    case "json":
    case "jsonb":
      return {};
    case "_text":
    case "_varchar":
      return ["seed"];
    case "_uuid":
      return [];
    default:
      return "seed";
  }
}

const SCOPE_COLUMNS = new Set(["organization_id", "care_home_id", "team_id", "resident_id"]);

/** Inserts one row per tenant-scoped public table for `home`, as superuser (bypasses RLS). */
export async function seedTenantRows(sql: postgres.Sql, home: Home, userId: string): Promise<SeedResult> {
  const cols = await loadColumns(sql);
  const enums = await enumFirstValues(sql);
  const byTable = new Map<string, ColumnInfo[]>();
  for (const c of cols) byTable.set(c.table, [...(byTable.get(c.table) ?? []), c]);

  const candidates = [...byTable.entries()].filter(
    ([t, cs]) =>
      !EXCLUDE.has(t) &&
      cs.some((c) => c.column === "id") &&
      cs.some((c) => SCOPE_COLUMNS.has(c.column) || (c.fkTable !== null && c.fkTable in SCOPE_TABLES))
  );

  const seeded = new Map<string, string>();
  const skipped = new Map<string, string>();
  let pending = candidates;

  for (let pass = 0; pass < 5 && pending.length > 0; pass++) {
    const next: typeof pending = [];
    for (const [table, tableCols] of pending) {
      const row: Record<string, unknown> = {};
      let blocked = false;
      for (const c of tableCols) {
        const needed = (!c.nullable && !c.hasDefault) || SCOPE_COLUMNS.has(c.column) || (c.fkTable !== null && c.fkTable in SCOPE_TABLES);
        if (c.column === "id" || !needed) continue;
        const v = valueFor(c, home, userId, enums, seeded);
        if (v === undefined) {
          if (!c.nullable) blocked = true;
          continue;
        }
        row[c.column] = v;
      }
      if (blocked) {
        next.push([table, tableCols]);
        continue;
      }
      try {
        const [r] = await sql<{ id: string }[]>`insert into ${sql(table)} ${sql(row as Record<string, postgres.ParameterOrJSON<never>>)} returning id::text as id`;
        seeded.set(table, r.id);
        skipped.delete(table);
      } catch (e) {
        skipped.set(table, (e as Error).message.split("\n")[0]);
      }
    }
    pending = next;
  }
  for (const [t] of pending) if (!skipped.has(t)) skipped.set(t, "unresolved foreign-key dependency");
  return { seeded, skipped };
}
