# RLS QA Checklist

Use this checklist after running:

```bash
npx supabase db push
npx supabase db lint
```

## Setup

- Test users:
  - `Owner A` = owner in `Org A`
  - `Manager A1` = manager in `Org A / Care Home A1`
  - `Nurse A1` = nurse in `Org A / Care Home A1`
  - `User B` = authenticated user in `Org B`
- Test data:
  - at least one audit template in `Org A`
  - at least one audit completion in `Org A`
  - at least one audit action plan in `Org A`
  - at least one manager review / manager action plan in `Org A`
  - at least one resident file or wound photo in `Org A`
  - at least one medication stock receipt/adjustment in `Org A`

## Migration / Lint

| Test | Action | Expected | Pass/Fail |
|---|---|---|---|
| Migration applied | Run `npx supabase migration list` | `20260413123000` and `20260413124500` appear locally and remotely | |
| Lint clean | Run `npx supabase db lint` | No `rls_policy_always_true` for `audit_*`; no `security_definer_view` for `medication_stock_history` | |

## Audit Templates

| Test | User | Action | Expected | Pass/Fail |
|---|---|---|---|---|
| Read same-org templates | `Manager A1` | Open CareO audit templates | Org A templates visible | |
| Read same-org templates | `Nurse A1` | Open CareO audit templates | In-scope templates visible | |
| Cross-org isolation | `User B` | Open same page / direct URL | Org A templates not visible | |
| Create template | `Manager A1` | Create template | Save succeeds in Org A scope | |
| Cross-org direct access | `User B` | Use copied template URL if possible | Denied / empty / redirected | |

## Audit Completions

| Test | User | Action | Expected | Pass/Fail |
|---|---|---|---|---|
| Resident completion read | `Manager A1` | Open resident audit completion in A1 | Loads successfully | |
| Resident completion read | `Nurse A1` | Open same in-scope completion | Loads successfully | |
| Care file completion read | `Manager A1` | Open care file completion in A1 | Loads successfully | |
| Governance/clinical/environment read | `Owner A` | Open each completion type | Loads successfully | |
| Cross-org completion isolation | `User B` | Open copied completion URL / list page | No access / no rows | |

## Audit Action Plans

| Test | User | Action | Expected | Pass/Fail |
|---|---|---|---|---|
| Org-wide plan visibility | `Owner A` | Open action plans page | Sees Org A in-scope plans | |
| Care-home plan visibility | `Manager A1` | Open action plans page | Sees only A1 in-scope plans | |
| Participant visibility | `Nurse A1` | Open page after being assigned plan | Assigned in-scope plan visible | |
| Participant update | `Nurse A1` | Change status / add comment | Update succeeds | |
| Manager sees updates | `Manager A1` | Refresh plan list/detail | New status/comment visible | |
| Unauthorized participant | `User B` | Try copied action plan URL | No access | |
| Delete privileged | `Manager A1` | Delete in-scope plan | Delete succeeds if UI allows | |
| Delete unauthorized | `User B` | Try deleting / mutating | Denied | |

## Manager Reviews

| Test | User | Action | Expected | Pass/Fail |
|---|---|---|---|---|
| Manager review read | `Manager A1` | Open manager review in scope | Loads successfully | |
| Manager review manage | `Owner A` | Create/update/delete review if UI allows | Succeeds in scope | |
| Non-manager restriction | `Nurse A1` | Try opening manager review | Denied / hidden | |
| Cross-org restriction | `User B` | Try opening same review | Denied | |

## Manager Action Plans

| Test | User | Action | Expected | Pass/Fail |
|---|---|---|---|---|
| Create manager action plan | `Manager A1` | Create manager action plan | Save succeeds | |
| Assigned user visibility | Assigned Org A user | Open their plans | Assigned plan visible | |
| Assigned user update | Assigned Org A user | Update status/comment | Update succeeds | |
| Non-participant restriction | Other Org A user | Try accessing unrelated plan | Only allowed if role/scope permits | |
| Cross-org restriction | `User B` | Try accessing same plan | Denied | |

## Storage Access

| Test | User | Action | Expected | Pass/Fail |
|---|---|---|---|---|
| Resident file access | `Manager A1` | Open resident document | File opens through `/api/storage/object` | |
| Same-scope file access | `Nurse A1` | Open same allowed file | File opens if role/scope permits | |
| Cross-org resident file block | `User B` | Try copied document URL | 401/403/fails | |
| Wound photo access | `Manager A1` | Open wound photo | Opens successfully | |
| Cross-org wound photo block | `User B` | Try copied wound photo URL | 401/403/fails | |

## Medication Stock History View

| Test | User | Action | Expected | Pass/Fail |
|---|---|---|---|---|
| In-scope stock history | Org A allowed user | View/query medication stock history | Only Org A rows visible | |
| Cross-org stock history block | `User B` | View/query same history | Org A rows not visible | |
| RLS inheritance | Compare with underlying tables | Same user queries view vs tables | Same scope behavior | |

## Final Sign-off

- [ ] Migrations applied successfully
- [ ] Linter warnings cleared for the targeted issues
- [ ] No cross-org audit data leakage
- [ ] No cross-org storage access
- [ ] Participant-based action plan access works
- [ ] Manager-only audit data remains restricted
- [ ] `medication_stock_history` respects user scope
