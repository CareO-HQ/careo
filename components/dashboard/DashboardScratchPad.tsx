"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, StickyNote } from "lucide-react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useProfile } from "@/hooks/use-profile";
import { Textarea } from "@/components/ui/textarea";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function DashboardScratchPad() {
  const { supabase } = useSupabase();
  const { profile } = useProfile();

  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef("");

  const fetchScratchPad = useCallback(async () => {
    if (!profile?.id || !profile.active_organization_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("dashboard_scratch_pads")
        .select("content")
        .eq("user_id", profile.id)
        .eq("organization_id", profile.active_organization_id)
        .maybeSingle();

      if (error) throw error;

      const loadedContent = data?.content ?? "";
      setContent(loadedContent);
      latestContentRef.current = loadedContent;
      setSaveStatus("idle");
    } catch (error) {
      console.error("Error fetching scratch pad:", error);
      setSaveStatus("error");
    } finally {
      setIsLoading(false);
    }
  }, [supabase, profile?.id, profile?.active_organization_id]);

  useEffect(() => {
    fetchScratchPad();
  }, [fetchScratchPad]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const saveScratchPad = useCallback(
    async (nextContent: string) => {
      if (!profile?.id || !profile.active_organization_id) return;

      setSaveStatus("saving");
      try {
        const { error } = await supabase.from("dashboard_scratch_pads").upsert(
          {
            user_id: profile.id,
            organization_id: profile.active_organization_id,
            content: nextContent,
          },
          { onConflict: "user_id,organization_id" }
        );

        if (error) throw error;
        setSaveStatus("saved");
      } catch (error) {
        console.error("Error saving scratch pad:", error);
        setSaveStatus("error");
      }
    },
    [supabase, profile?.id, profile?.active_organization_id]
  );

  const handleContentChange = (value: string) => {
    setContent(value);
    latestContentRef.current = value;
    setSaveStatus("idle");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void saveScratchPad(value);
    }, 600);
  };

  const statusLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : "";

  return (
    <div className="bg-[#fef9c3] border border-amber-200 rounded-xl shadow-xs flex flex-col flex-1 min-h-[320px] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-200/80 shrink-0">
        <StickyNote className="w-4 h-4 text-amber-700" />
        <div className="text-sm font-bold text-amber-900 tracking-tight">Scratch Pad</div>
      </div>

      <div className="flex flex-col flex-1 px-4 py-3 min-h-0">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-amber-700" />
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Jot down quick notes..."
            className="flex-1 min-h-[240px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent text-sm text-amber-950 placeholder:text-amber-700/50 px-1 py-1"
          />
        )}
      </div>

      <div className="px-5 py-2 border-t border-amber-200/80 shrink-0">
        <div className="text-[10px] text-amber-700/80 text-right min-h-[14px]">
          {statusLabel}
        </div>
      </div>
    </div>
  );
}
