# Vercel WAF IP-Based Rate Limiting

## Purpose

This document is the source of truth for CareO's production `Vercel WAF` rollout.

The machine-readable companion file is `docs/vercel-waf-ip-rate-limit-rules.json`.

It assumes:

- rate limiting is `IP-based` only
- rules are configured in the `Vercel Firewall` dashboard or via the Firewall REST API
- no application-level per-user or per-org limiter is being added in this phase

## Current Constraints

- This repository is not currently linked to Vercel from the workspace.
- There is no local `.vercel` directory, no `vercel` CLI installed here, and no `VERCEL_TOKEN` available in the environment.
- Because of that, the firewall rules below are implemented as a publish-ready runbook rather than applied automatically from this workspace.

## Route Inventory

### Public page paths

These are suitable for low-volume IP-based protection:

- `/login`
- `/signup`
- `/accept-invitation`
- `/reset-password`
- `/new-password`

### Highest-risk API paths

These should receive dedicated rules before any broader API rule is enforced:

- `/api/pdf/proxy-image`
- `/api/help-support`
- `/api/storage/object`
- `/api/pdf/*`

Why these matter:

- `app/api/pdf/proxy-image/route.ts` is unauthenticated and fetches upstream image content.
- `app/api/help-support/route.ts` sends outbound email through Resend.
- `app/api/storage/object/route.ts` creates signed Supabase Storage URLs.
- `app/api/pdf/*/route.ts` contains 28 PDF routes and many run expensive Node.js generation logic.

### Medium-risk authenticated API groups

These are worth protecting from request floods and scraping, but should start with more generous thresholds because a shared care-home IP may represent many staff members:

- `/api/appointments/*`
- `/api/appointment-notes/*`
- `/api/progress-notes/*`
- `/api/manager-audit/*`
- `/api/qwik-info/*`

### Out of scope for strict WAF-only enforcement

- `app/actions/invitations.ts` is still important operationally, but server actions are not as easy to target precisely with path-only WAF rules unless the invoked path is clearly identified in traffic monitoring.

## Recommended Rule Set

All rules below assume `Counting key = IP`.

Start each rule in `Log` mode first, observe real traffic, then switch to `Default (429)` once the threshold is proven safe.

| Rule name | Path match | Window | Limit | Initial action | Follow-up action | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `api-baseline-ip` | `/api/*` | `60s` | `240` | `Log` | `429` | Broad flood protection without choking normal dashboard traffic. |
| `api-pdf-family-ip` | `/api/pdf/*` | `10m` | `40` | `Log` | `429` | Covers expensive PDF endpoints as a family. |
| `api-pdf-proxy-image-ip` | `/api/pdf/proxy-image` | `60s` | `30` | `Log` | `429` | Public fetch proxy should be the strictest API rule. |
| `api-help-support-ip` | `/api/help-support` | `10m` | `12` | `Log` | `429` | Outbound email path; low expected real traffic. |
| `api-storage-object-ip` | `/api/storage/object` | `60s` | `180` | `Log` | `429` | Signed URL generation can be busy during document browsing. |
| `api-appointments-family-ip` | `/api/appointments/*` | `60s` | `180` | `Log` | `429` | Shared-IP friendly starting point for staff workflows. |
| `api-appointment-notes-family-ip` | `/api/appointment-notes/*` | `60s` | `180` | `Log` | `429` | Similar CRUD profile to appointments. |
| `api-progress-notes-family-ip` | `/api/progress-notes/*` | `60s` | `180` | `Log` | `429` | Includes list, stats, and broad reads. |
| `api-manager-audit-family-ip` | `/api/manager-audit/*` | `60s` | `120` | `Log` | `429` | Lower volume than notes and appointments. |
| `api-qwik-info-family-ip` | `/api/qwik-info/*` | `60s` | `120` | `Log` | `429` | Read-oriented, but still worth flood protection. |
| `page-login-ip` | `/login` | `10m` | `60` | `Log` | `429` | Protects the page surface, not Supabase auth backend. |
| `page-signup-ip` | `/signup` | `10m` | `30` | `Log` | `429` | Low expected real usage. |
| `page-accept-invitation-ip` | `/accept-invitation` | `10m` | `40` | `Log` | `429` | Invitation link opens are low-frequency. |
| `page-reset-password-ip` | `/reset-password` | `10m` | `30` | `Log` | `429` | Low expected real usage. |
| `page-new-password-ip` | `/new-password` | `10m` | `30` | `Log` | `429` | Low expected real usage. |

## Rule Ordering

Order the rules from most specific to least specific:

1. `/api/pdf/proxy-image`
2. `/api/help-support`
3. `/api/storage/object`
4. `/api/pdf/*`
5. `/api/appointments/*`
6. `/api/appointment-notes/*`
7. `/api/progress-notes/*`
8. `/api/manager-audit/*`
9. `/api/qwik-info/*`
10. `/api/*`
11. public auth pages

This keeps the strictest endpoint-specific rules from being masked by the broader `/api/*` rule.

## Rollout Plan

### Phase 1: Observe only

- Add all rules in `Log` mode.
- Keep them live for at least one normal business cycle.
- Review traffic by path and source IP in the Vercel Firewall dashboard.

### Phase 2: Enforce highest-risk endpoints

Switch these rules to `Default (429)` first:

- `api-pdf-proxy-image-ip`
- `api-help-support-ip`
- `api-storage-object-ip`
- `api-pdf-family-ip`

### Phase 3: Enforce baseline API protection

After confirming that shared care-home IPs are not being throttled unexpectedly:

- enable `api-baseline-ip`
- enable the medium-risk family rules

### Phase 4: Tighten if needed

If abuse persists after enforcement:

- lower the threshold on `api-pdf-proxy-image-ip`
- lower the threshold on `api-help-support-ip`
- consider persistent actions for the most abusive paths only

## Gaps And Tradeoffs

This approach is intentionally simple, but it has real limits:

- It cannot distinguish one abusive user from many legitimate staff on the same care-home IP.
- It cannot enforce per-user, per-organization, or per-service-token quotas.
- It cannot enforce concurrency limits for expensive PDF generation.
- It does not directly rate limit Supabase-hosted auth endpoints.
- It does not precisely target `app/actions/invitations.ts` unless traffic analysis identifies a stable path pattern that can be protected separately.

If false positives appear on shared office or care-home IPs, raise the threshold on the affected family rule before weakening the endpoint-specific protection on the highest-risk routes.

## How To Configure In Vercel

For each rule in the Vercel dashboard:

1. Open `Project -> Firewall -> Configure`.
2. Add a new rule.
3. Set the request path condition to the path or family listed above.
4. Choose `Rate Limit`.
5. Set the window and request limit from the table.
6. Select `IP` as the counting key.
7. Start with `Log`.
8. Publish.
9. Review live traffic.
10. Change the follow-up action to `Default (429)` when safe.

## Validation Checklist

Use the companion script at `scripts/test-vercel-waf-rate-limits.ps1` against the production URL after rules are published.

At minimum validate:

- repeated requests to `/api/pdf/proxy-image` hit `429`
- repeated requests to `/api/help-support` hit `429` without blocking normal single submissions
- repeated requests to `/api/storage/object` hit `429` only after the expected threshold
- representative requests to `/api/pdf/*` hit `429` only after the expected threshold
- normal page loads for `/login`, `/signup`, and `/accept-invitation` are unaffected
- normal authenticated usage from a shared care-home IP does not trip `/api/*` or family-level rules too early

## Recommended Review Cadence

- Review the firewall dashboard after the first day of enforcement.
- Review again after one week.
- Revisit thresholds whenever a new high-cost API surface is introduced.
