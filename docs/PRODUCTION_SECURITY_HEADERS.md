# Production Security Headers

## Implemented

- Dynamic CSP is generated per request in `middleware.ts`.
- Baseline security headers are set in `next.config.ts`.
- The root app shell calls `headers()` in `app/layout.tsx` so Next.js renders with request-time nonces.

## Production CSP Notes

- `script-src` uses a per-request nonce and `strict-dynamic`.
- `script-src` does not include `'unsafe-inline'` or `'unsafe-eval'` in production.
- `style-src` still includes `'unsafe-inline'` by design.

## Why `style-src 'unsafe-inline'` Remains

The current UI still emits runtime inline styles, so removing `'unsafe-inline'` would break rendering and print flows.

Examples:

- `components/ui/chart.tsx` injects a `<style>` tag with `dangerouslySetInnerHTML`.
- `app/(dashboard)/dashboard/residents/[id]/(pages)/incidents/components/bhsct-report-form.tsx` injects print CSS inline.
- `app/(dashboard)/dashboard/residents/[id]/(pages)/hospital-transfer/records/page.tsx` injects inline CSS to hide controls in readonly views.

This is an accepted temporary exception until those paths are refactored to use nonce-aware styles or static stylesheets.

## Findings To Treat As Out Of Scope

- `script-src unsafe-eval` on `localhost` is a development-only allowance and is not present in production responses.
- `Directory Browsing` on `/_next/static/chunks/.../` is a scanner false positive against standard Next.js static assets.
- `Timestamp Disclosure - Unix` on chunk files is informational metadata on generated assets.
- `Server` and HSTS findings on third-party hosts such as Mozilla CDN endpoints are not controlled by this repository.

## Production Verification

Use a production build for validation:

```powershell
npm run build
npm run start
Invoke-WebRequest "http://localhost:3000/" -UseBasicParsing
```

Expected response characteristics on HTML routes such as `/`, `/login`, and `/signup`:

- `Content-Security-Policy` includes `script-src 'nonce-...' 'strict-dynamic'`
- `Content-Security-Policy` does not include `script-src 'unsafe-inline'`
- `Content-Security-Policy` does not include `script-src 'unsafe-eval'`
- `Strict-Transport-Security` is present in production
- `Referrer-Policy` is `strict-origin-when-cross-origin`
- `Permissions-Policy` is a deny-by-default baseline
