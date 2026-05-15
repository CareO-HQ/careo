export type KardexStaffUserRow = {
  id: string;
  name: string | null;
  email?: string | null;
};

export function staffDisplayLabel(row: KardexStaffUserRow | undefined | null): string | null {
  if (!row) return null;
  const n = row.name?.trim();
  if (n) return n;
  const e = row.email?.trim();
  return e || null;
}

/** Resolve created_by / checked_by UUIDs into printable names using an org users list (no extra joins). */
export function enrichMedicationsWithKardexStaffNames<
  T extends { created_by?: string | null; checked_by?: string | null },
>(medications: T[], users: KardexStaffUserRow[]): Array<
  T & { added_by_name: string | null; checked_by_name: string | null }
> {
  const byId = new Map<string, KardexStaffUserRow>();
  for (const u of users) byId.set(u.id, u);

  const labelForUserId = (userId: string | null | undefined): string | null => {
    if (!userId) return null;
    return staffDisplayLabel(byId.get(userId));
  };

  return medications.map((med) => ({
    ...med,
    added_by_name: labelForUserId(med.created_by ?? null),
    checked_by_name: labelForUserId(med.checked_by ?? null),
  }));
}
