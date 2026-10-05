import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server-side session helpers for Server Actions.
 *
 * Server Actions are public POST endpoints, so arguments such as `actorId`
 * must never be trusted on their own: the caller is identified from the
 * Supabase session cookie instead.
 */

export interface ActorProfile {
  id: string;
  name: string | null;
  role: string;
  is_saas_admin: boolean;
  is_manager_approved_nurse: boolean;
  active_organization_id: string | null;
  active_care_home_id: string | null;
  active_team_id: string | null;
}

export class AuthorizationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env configuration for server actions");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Returns the id of the user in the request's Supabase session, or null. */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Session refresh is handled by middleware; actions only read the session.
        set() {},
        remove() {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function loadProfile(userId: string): Promise<ActorProfile> {
  const { data, error } = await getServiceClient()
    .from("users")
    .select(
      "id, name, role, is_saas_admin, is_manager_approved_nurse, active_organization_id, active_care_home_id, active_team_id"
    )
    .eq("id", userId)
    .single();
  if (error || !data) throw new AuthorizationError();
  return {
    ...data,
    is_saas_admin: !!data.is_saas_admin,
    is_manager_approved_nurse: !!data.is_manager_approved_nurse,
  } as ActorProfile;
}

/** The signed-in user's profile; throws when there is no session. */
export async function requireSessionActor(): Promise<ActorProfile> {
  const userId = await getSessionUserId();
  if (!userId) throw new AuthorizationError();
  return loadProfile(userId);
}

/**
 * Verifies that a client-supplied `actorId` is the signed-in user and returns
 * their profile. Keeps existing action signatures while removing the trust in them.
 */
export async function requireActor(actorId: string): Promise<ActorProfile> {
  const userId = await getSessionUserId();
  if (!userId || userId !== actorId) throw new AuthorizationError();
  return loadProfile(userId);
}

export function isManagerLevel(actor: ActorProfile): boolean {
  return actor.is_saas_admin || ["saas_admin", "owner", "manager"].includes(actor.role);
}

/** Team must belong to the actor's organization; non-owners are limited to their care home. */
export async function assertTeamInScope(actor: ActorProfile, teamId: string): Promise<void> {
  if (actor.is_saas_admin) return;
  const { data: team } = await getServiceClient()
    .from("teams")
    .select("organization_id, care_home_id")
    .eq("id", teamId)
    .single();
  if (!team || team.organization_id !== actor.active_organization_id) {
    throw new AuthorizationError("Team is outside your organization.");
  }
  if (actor.role !== "owner" && team.care_home_id !== actor.active_care_home_id) {
    throw new AuthorizationError("Team is outside your care home.");
  }
}

/** Care home must belong to the actor's organization; non-owners only their active home. */
export async function assertCareHomeInScope(actor: ActorProfile, careHomeId: string): Promise<void> {
  if (actor.is_saas_admin) return;
  const { data: home } = await getServiceClient()
    .from("care_homes")
    .select("organization_id")
    .eq("id", careHomeId)
    .single();
  if (!home || home.organization_id !== actor.active_organization_id) {
    throw new AuthorizationError("Care home is outside your organization.");
  }
  if (actor.role !== "owner" && careHomeId !== actor.active_care_home_id) {
    throw new AuthorizationError("Care home is outside your scope.");
  }
}

/** Target user must be in the actor's organization. */
export async function assertUserInScope(actor: ActorProfile, userId: string): Promise<void> {
  if (actor.is_saas_admin) return;
  const { data: target } = await getServiceClient()
    .from("users")
    .select("active_organization_id, organization_id")
    .eq("id", userId)
    .single();
  const orgId = actor.active_organization_id;
  if (!target || !orgId || (target.active_organization_id !== orgId && target.organization_id !== orgId)) {
    throw new AuthorizationError("Staff member is outside your organization.");
  }
}
