"use client";

import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { useActiveTeam } from "@/hooks/use-active-team";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * Supabase-based auth client that provides the same API surface as better-auth
 * This allows existing code to work without changes while using Supabase authentication.
 */
export const authClient = {
  /**
   * Get the current user session
   * Returns: { data: { user: { id, name, email, ... }, session } }
   */
  useSession: () => {
    const { user, session } = useSupabase();
    const { profile } = useProfile();

    return {
      data: {
        user: user
          ? {
              id: user.id,
              name: profile?.name || user.user_metadata?.name || user.email?.split("@")[0] || "",
              email: user.email || "",
              image: profile?.image_url || user.user_metadata?.avatar_url || null,
              ...user,
            }
          : null,
        session,
      },
    };
  },

  /**
   * Get the active organization
   * Returns: { data: { id: string, name: string, ... } }
   */
  useActiveOrganization: () => {
    const { activeOrganization, activeOrganizationId } = useActiveTeam();

    return {
      data: activeOrganizationId
        ? {
            id: activeOrganizationId,
            name: activeOrganization?.name || "",
            ...activeOrganization,
            // Note: members array would need to be fetched separately if needed
            // This is a minimal implementation matching the expected structure
          }
        : null,
    };
  },

  /**
   * Get the active member with role and organizationId
   * Returns: { data: { organizationId: string, role: string, userId: string, ... } }
   */
  useActiveMember: () => {
    const { profile } = useProfile();
    const { activeOrganizationId } = useActiveTeam();

    return {
      data:
        profile && activeOrganizationId
          ? {
              organizationId: activeOrganizationId,
              role: profile.role || "member",
              userId: profile.id,
              ...profile,
            }
          : null,
    };
  },

  /**
   * Reset password using Supabase
   * Note: This requires a password reset token from Supabase
   */
  resetPassword: async (
    params: { newPassword: string; token: string },
    callbacks?: { onSuccess?: () => void; onError?: (ctx: { error: { code: string } }) => void }
  ) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: params.newPassword,
      });

      if (error) {
        callbacks?.onError?.({
          error: {
            code: error.message.includes("token") ? "INVALID_TOKEN" : "UNKNOWN_ERROR",
          },
        });
        return { error };
      }

      callbacks?.onSuccess?.();
      return { error: null };
    } catch (err) {
      callbacks?.onError?.({
        error: {
          code: "UNKNOWN_ERROR",
        },
      });
      return { error: err };
    }
  },

  /**
   * Revoke a single session (user method)
   * Note: Supabase doesn't have direct session revocation by token
   * This would need to be implemented via a server-side API route
   */
  revokeSession: async (
    params: { token: string },
    callbacks?: { onSuccess?: () => void; onError?: () => void }
  ) => {
    // TODO: Implement session revocation using Supabase
    // This requires server-side implementation to revoke sessions
    console.warn("revokeSession not yet implemented with Supabase");
    callbacks?.onError?.();
    toast.error("Session revocation not yet implemented with Supabase");
  },

  /**
   * Revoke all sessions for the current user
   * Note: Supabase doesn't have direct session revocation
   * This would need to be implemented via a server-side API route
   */
  revokeSessions: async (
    params: object,
    callbacks?: { onSuccess?: () => void; onError?: () => void }
  ) => {
    // TODO: Implement all sessions revocation using Supabase
    // This requires server-side implementation to revoke all user sessions
    console.warn("revokeSessions not yet implemented with Supabase");
    callbacks?.onError?.();
    toast.error("Session revocation not yet implemented with Supabase");
  },

  /**
   * Organization management methods
   */
  organization: {
    removeTeam: async (params: { teamId: string }) => {
      // TODO: Implement team removal using Supabase
      // This would need to call a Supabase function or API route
      console.warn("organization.removeTeam not yet implemented with Supabase");
      throw new Error("Team removal not yet implemented with Supabase");
    },
  },

  /**
   * Admin methods
   */
  admin: {
    revokeUserSession: async (
      params: { sessionToken: string },
      callbacks?: { onSuccess?: () => void; onError?: () => void }
    ) => {
      // TODO: Implement session revocation using Supabase Admin API
      // This requires server-side implementation with service role key
      console.warn("admin.revokeUserSession not yet implemented with Supabase");
      callbacks?.onError?.();
      toast.error("Session revocation not yet implemented with Supabase");
    },

    revokeUserSessions: async (
      params: { userId: string },
      callbacks?: { onSuccess?: () => void; onError?: () => void }
    ) => {
      // TODO: Implement all sessions revocation using Supabase Admin API
      // This requires server-side implementation with service role key
      console.warn("admin.revokeUserSessions not yet implemented with Supabase");
      callbacks?.onError?.();
      toast.error("Session revocation not yet implemented with Supabase");
    },
  },
};
