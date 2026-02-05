"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";

export type Profile = {
    id: string;
    email: string;
    name: string | null;
    image_url: string | null;
    phone: string | null;
    active_organization_id: string | null;
    active_care_home_id: string | null;
    active_team_id: string | null;
    is_saas_admin: boolean;
    is_onboarding_complete: boolean;
    // Computed/Joined fields
    organization_name?: string;
    care_home_name?: string;
    active_team_name?: string;
    role?: string;
};

export function useProfile() {
    const { user, isLoading: isAuthLoading, supabase } = useSupabase();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [refreshTick, setRefreshTick] = useState(0);

    useEffect(() => {
        if (isAuthLoading) return;

        if (!user) {
            setProfile(null);
            setIsLoading(false);
            return;
        }

        async function fetchProfileData(retries = 3) {
            try {
                // 1. Fetch user data from public.users table
                const { data: dbUser, error: dbError } = await supabase
                    .from("users")
                    .select("*")
                    .eq("id", user!.id)
                    .single();

                if (dbError) {
                    // Check if it's a "no rows" error and we have retries left
                    if (dbError.code === "PGRST116" && retries > 0) {
                        console.log(`[DEBUG use-profile] User not found in public.users yet. Retrying in 1.5s... (${retries} left)`);
                        setTimeout(() => fetchProfileData(retries - 1), 1500);
                        return;
                    }
                    throw dbError;
                }

                const baseProfile: Profile = {
                    id: dbUser.id,
                    email: dbUser.email,
                    name: dbUser.name,
                    image_url: dbUser.image_url || user?.user_metadata?.avatar_url || null,
                    phone: dbUser.phone || null,
                    active_organization_id: dbUser.active_organization_id || null, // Get from users table directly
                    active_care_home_id: dbUser.active_care_home_id || null,
                    active_team_id: dbUser.active_team_id || null,
                    is_saas_admin: !!dbUser.is_saas_admin,
                    is_onboarding_complete: !!dbUser.is_onboarding_complete,
                    role: user?.app_metadata?.role || (dbUser.is_saas_admin ? "saas_admin" : "member"),
                };

                const enrichedProfile = { ...baseProfile };

                // 2. Fetch context names and resolve organization_id
                if (dbUser.active_care_home_id) {
                    const { data: home } = await supabase
                        .from("care_homes")
                        .select("name, organization_id")
                        .eq("id", dbUser.active_care_home_id)
                        .single();
                    if (home) {
                        enrichedProfile.care_home_name = home.name;
                        enrichedProfile.active_organization_id = home.organization_id;
                    }
                }

                if (dbUser.active_team_id) {
                    const { data: team } = await supabase
                        .from("teams")
                        .select("name, organization_id")
                        .eq("id", dbUser.active_team_id)
                        .single();
                    if (team) {
                        enrichedProfile.active_team_name = team.name;
                        enrichedProfile.active_organization_id = team.organization_id;
                    }
                }

                if (enrichedProfile.active_organization_id) {
                    const { data: org } = await supabase
                        .from("organizations")
                        .select("name")
                        .eq("id", enrichedProfile.active_organization_id)
                        .single();
                    if (org) enrichedProfile.organization_name = org.name;
                }

                setProfile(enrichedProfile);
                setError(null);
            } catch (err: any) {
                console.error("Error building profile from public.users:", err);
                setError(err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchProfileData();
    }, [user, isAuthLoading, supabase, refreshTick]);

    return {
        profile,
        isLoading: isAuthLoading || isLoading,
        error,
        refresh: () => {
            setIsLoading(true);
            setRefreshTick(prev => prev + 1);
        },
    };
}
