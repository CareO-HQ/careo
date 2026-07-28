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
    address: string | null;
    date_of_join: string | null;
    right_to_work_status: string | null;
    next_of_kin_name: string | null;
    next_of_kin_relationship: string | null;
    next_of_kin_phone: string | null;
    next_of_kin_email: string | null;
    next_of_kin_address: string | null;
    nmc_pin_number: string | null;
    nmc_renewal_fee_date: string | null;
    niscc_registration_number: string | null;
    niscc_registration_date: string | null;
    niscc_annual_fee_date: string | null;
    // Computed/Joined fields
    organization_name?: string;
    organization_logo_url?: string | null;
    care_home_name?: string;
    active_team_name?: string;
    role?: string;
    is_manager_approved_nurse?: boolean;
    is_login_allowed?: boolean;
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

        let isMounted = true;
        let timeoutId: NodeJS.Timeout | null = null;

        async function fetchProfileData(retries = 3) {
            try {
                // Fetch user data with all required relations in a single query
                const { data: dbUser, error: dbError } = await supabase
                    .from("users")
                    .select(`
                        *,
                        active_team:teams!active_team_id(
                            name,
                            organization_id,
                            care_home_id,
                            organization:organizations!organization_id(
                                name,
                                logo_url
                            ),
                            care_home:care_homes!care_home_id(
                                name,
                                organization_id,
                                organization:organizations!organization_id(
                                    name,
                                    logo_url
                                )
                            )
                        ),
                        active_care_home:care_homes!active_care_home_id(
                            name,
                            organization_id,
                            organization:organizations!organization_id(
                                name,
                                logo_url
                            )
                        ),
                        active_organization:organizations!active_organization_id(
                            name,
                            logo_url
                        )
                    `)
                    .eq("id", user!.id)
                    .single();

                if (dbError) {
                    // Check if it's a "no rows" error and we have retries left
                    if (dbError.code === "PGRST116" && retries > 0) {
                        console.log(`[DEBUG use-profile] User not found in public.users yet. Retrying in 1.5s... (${retries} left)`);
                        if (isMounted) {
                            timeoutId = setTimeout(() => fetchProfileData(retries - 1), 1500);
                        }
                        return;
                    }
                    throw dbError;
                }

                if (!isMounted) return;

                // Check if the user is an agency worker and has been offboarded
                const userRole = dbUser.role || user?.app_metadata?.role;
                const isAgencyWorker = userRole === "agency_nurse" || userRole === "agency_care_assistant";
                if (isAgencyWorker && !dbUser.active_organization_id) {
                    const isOnboardingPage = typeof window !== "undefined" && window.location.pathname.startsWith("/onboarding");
                    if (!isOnboardingPage) {
                        console.log("[useProfile] Offboarded agency worker detected. Logging out...");
                        await supabase.auth.signOut();
                        if (typeof window !== "undefined") {
                            window.location.href = "/login";
                        }
                        return;
                    }
                }

                // Check if user is MDT or RQIA and login is disabled
                if ((userRole === "mdt" || userRole === "rqia") && dbUser.is_login_allowed === false) {
                    console.log("[useProfile] Login disabled for external user (MDT/RQIA). Logging out...");
                    await supabase.auth.signOut();
                    if (typeof window !== "undefined") {
                        window.location.href = "/login";
                    }
                    return;
                }

                // Resolve nested relationships with fallback cascading logic
                const activeTeam = dbUser.active_team as any;
                const activeCareHome = dbUser.active_care_home as any;

                // 1. Resolve active team name
                const activeTeamName = activeTeam?.name || undefined;

                // 2. Resolve active care home ID and name
                const activeCareHomeId = dbUser.active_care_home_id || activeTeam?.care_home_id || null;
                const careHomeName = activeCareHome?.name || activeTeam?.care_home?.name || undefined;

                // 3. Resolve active organization ID with cascading fallback
                let activeOrgId = dbUser.active_organization_id || null;
                if (activeTeam) {
                    activeOrgId = activeTeam.organization_id;
                } else if (!activeOrgId) {
                    activeOrgId = activeCareHome?.organization_id || activeTeam?.care_home?.organization_id || null;
                }

                // 4. Resolve organization name and logo with cascading fallback
                let orgName: string | undefined;
                let orgLogoUrl: string | null = null;

                if (activeOrgId) {
                    if (activeOrgId === dbUser.active_organization_id && dbUser.active_organization) {
                        orgName = (dbUser.active_organization as any).name;
                        orgLogoUrl = (dbUser.active_organization as any).logo_url;
                    } else if (activeTeam && activeOrgId === activeTeam.organization_id && activeTeam.organization) {
                        orgName = activeTeam.organization.name;
                        orgLogoUrl = activeTeam.organization.logo_url;
                    } else if (activeCareHome && activeOrgId === activeCareHome.organization_id && activeCareHome.organization) {
                        orgName = activeCareHome.organization.name;
                        orgLogoUrl = activeCareHome.organization.logo_url;
                    } else if (activeTeam?.care_home && activeOrgId === activeTeam.care_home.organization_id && activeTeam.care_home.organization) {
                        orgName = activeTeam.care_home.organization.name;
                        orgLogoUrl = activeTeam.care_home.organization.logo_url;
                    }
                }

                const baseProfile: Profile = {
                    id: dbUser.id,
                    email: dbUser.email,
                    name: dbUser.name,
                    image_url: dbUser.image_url || user?.user_metadata?.avatar_url || null,
                    phone: dbUser.phone || null,
                    active_organization_id: activeOrgId,
                    active_care_home_id: activeCareHomeId,
                    active_team_id: dbUser.active_team_id || null,
                    is_saas_admin: !!dbUser.is_saas_admin,
                    is_onboarding_complete: !!dbUser.is_onboarding_complete,
                    role: dbUser.role || user?.app_metadata?.role || (dbUser.is_saas_admin ? "saas_admin" : "member"),
                    is_manager_approved_nurse: !!dbUser.is_manager_approved_nurse,
                    is_login_allowed: dbUser.is_login_allowed !== false,
                    address: dbUser.address || null,
                    date_of_join: dbUser.date_of_join || null,
                    right_to_work_status: dbUser.right_to_work_status || null,
                    next_of_kin_name: dbUser.next_of_kin_name || null,
                    next_of_kin_relationship: dbUser.next_of_kin_relationship || null,
                    next_of_kin_phone: dbUser.next_of_kin_phone || null,
                    next_of_kin_email: dbUser.next_of_kin_email || null,
                    next_of_kin_address: dbUser.next_of_kin_address || null,
                    nmc_pin_number: dbUser.nmc_pin_number || null,
                    nmc_renewal_fee_date: dbUser.nmc_renewal_fee_date || null,
                    niscc_registration_number: dbUser.niscc_registration_number || null,
                    niscc_registration_date: dbUser.niscc_registration_date || null,
                    niscc_annual_fee_date: dbUser.niscc_annual_fee_date || null,
                    
                    // Enriched fields
                    active_team_name: activeTeamName,
                    care_home_name: careHomeName,
                    organization_name: orgName,
                    organization_logo_url: orgLogoUrl,
                };

                setProfile(baseProfile);
                setError(null);
            } catch (err: any) {
                if (isMounted) {
                    console.error("Error building profile from public.users:", err);
                    setError(err);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        fetchProfileData();

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
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
