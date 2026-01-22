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
                router.push("/login");
                router.refresh();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

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
