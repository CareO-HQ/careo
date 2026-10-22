/**
 * Where a user goes once login (including any MFA step) is complete.
 * Shared by the login form and the MFA pages so the routing rules live in one place.
 */

export interface LoginAppMetadata {
  role?: string;
  is_saas_admin?: boolean;
  is_onboarding_complete?: boolean;
  active_organization_id?: string | null;
  /** Supabase app_metadata carries other keys (provider, ...) that routing ignores. */
  [key: string]: unknown;
}

/** Query parameters that must survive the trip through the MFA pages. */
export interface LoginRedirectParams {
  redirect?: string | null;
  token?: string | null;
  email?: string | null;
}

export function getPostLoginPath(appMetadata: LoginAppMetadata, params: LoginRedirectParams): string {
  const { redirect, token, email } = params;

  // Agency staff activating for the first time have no active org yet.
  if (redirect === "onboarding-agency" && token) {
    const query = new URLSearchParams({ token });
    if (email) query.set("email", email);
    return `/onboarding/agency?${query.toString()}`;
  }

  if (appMetadata.is_onboarding_complete) {
    return appMetadata.is_saas_admin ? "/admin" : "/dashboard";
  }

  if (redirect && token) {
    return `/${redirect}?token=${encodeURIComponent(token)}`;
  }
  return "/onboarding";
}

/** Appends the login redirect params to an MFA page path. */
export function withLoginParams(path: string, params: LoginRedirectParams): string {
  const query = new URLSearchParams();
  if (params.redirect) query.set("redirect", params.redirect);
  if (params.token) query.set("token", params.token);
  if (params.email) query.set("email", params.email);
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
