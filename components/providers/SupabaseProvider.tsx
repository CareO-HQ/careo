"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

type SupabaseContext = {
    supabase: typeof supabase;
    user: User | null;
    session: Session | null;
    isLoading: boolean;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);

            if (event === "SIGNED_IN") {
                router.refresh();
            }
            if (event === "SIGNED_OUT") {
                if (typeof document !== "undefined") {
                  document.cookie = "mdt_session_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
                  document.cookie = "rqia_session_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
                }
                router.push("/login");
                router.refresh();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    useEffect(() => {
        if (!user) return;

        // Listen for updates on the user's own profile row in the public.users table
        const channel = supabase
            .channel(`user-profile-watch-${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "users",
                    filter: `id=eq.${user.id}`,
                },
                async (payload) => {
                    const newRole = payload.new?.role;
                    const newActiveOrgId = payload.new?.active_organization_id;
                    const newIsLoginAllowed = payload.new?.is_login_allowed;
                    const isAgency = newRole === "agency_nurse" || newRole === "agency_care_assistant";
                    
                    const isOnboardingPage = typeof window !== "undefined" && window.location.pathname.startsWith("/onboarding");

                    if ((newRole === "mdt" || newRole === "rqia") && newIsLoginAllowed === false) {
                        console.log("[SupabaseProvider] MDT/RQIA user login disabled. Logging out...");
                        if (typeof document !== "undefined") {
                          document.cookie = "mdt_session_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
                          document.cookie = "rqia_session_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
                        }
                        await supabase.auth.signOut();
                        router.push("/login");
                        router.refresh();
                        return;
                    }

                    if (isAgency && !newActiveOrgId && !isOnboardingPage) {
                        console.log("[SupabaseProvider] Real-time offboarding detected. Logging out...");
                        await supabase.auth.signOut();
                        router.push("/login");
                        router.refresh();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, router]);

    return (
        <Context.Provider value={{ supabase, user, session, isLoading }}>
            {children}
        </Context.Provider>
    );
}

export const useSupabase = () => {
    const context = useContext(Context);
    if (context === undefined) {
        throw new Error("useSupabase must be used inside SupabaseProvider");
    }
    return context;
};
