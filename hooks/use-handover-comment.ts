import { useState, useEffect, useCallback, useRef } from "react";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { useDebounce } from "@/hooks/use-debounce";

type UseHandoverCommentProps = {
  teamId: string;
  residentId: string;
  date: string;
  shift: "day" | "night";
  currentUserId: string;
  currentUserName: string;
};

export function useHandoverComment({
  teamId,
  residentId,
  date,
  shift,
  currentUserId,
  currentUserName,
}: UseHandoverCommentProps) {
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [commentId, setCommentId] = useState<string | null>(null);
  const { supabase } = useSupabase();
  const initialLoadComplete = useRef(false);

  // Fetch existing comment from database
  const fetchComment = useCallback(async () => {
    if (!residentId || !date || !shift || !supabase) return;

    try {
      const { data, error } = await supabase
        .from("handover_comments")
        .select("*")
        .eq("resident_id", residentId)
        .eq("date", date)
        .eq("shift", shift)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 is "no rows returned"
        throw error;
      }

      if (data) {
        setComment(data.comment);
        setCommentId(data.id);
        setLastSavedAt(new Date(data.updated_at).getTime());
      }
      initialLoadComplete.current = true;
    } catch (error) {
      console.error("Error fetching handover comment:", error);
    }
  }, [residentId, date, shift, supabase]);

  useEffect(() => {
    fetchComment();
  }, [fetchComment]);

  // Mutation function to save comment
  const saveComment = useCallback(async (newComment: string) => {
    if (!supabase || !residentId || !date || !shift) return;

    setIsSaving(true);
    try {
      const payload = {
        resident_id: residentId,
        date: date,
        shift: shift,
        comment: newComment,
        created_by: currentUserId,
        // created_by_name is not in schema, but we can store it in a JSONB if needed 
        // or just rely on the created_by reference.
      };

      let result;
      if (commentId) {
        result = await supabase
          .from("handover_comments")
          .update({
            comment: newComment,
            updated_at: new Date().toISOString()
          })
          .eq("id", commentId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("handover_comments")
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      if (result.data) {
        setCommentId(result.data.id);
        setLastSavedAt(new Date(result.data.updated_at).getTime());
      }
    } catch (error) {
      console.error("Failed to save comment:", error);
    } finally {
      setIsSaving(false);
    }
  }, [supabase, residentId, date, shift, currentUserId, commentId]);

  // Debounced comment value (auto-save after 2 seconds of no typing)
  const debouncedComment = useDebounce(comment, 2000);

  // Auto-save when debounced value changes
  useEffect(() => {
    if (!initialLoadComplete.current) return;
    if (debouncedComment.trim() === "" && !commentId) return;

    saveComment(debouncedComment);
  }, [debouncedComment, saveComment, commentId]);

  // Format last saved time
  const getLastSavedText = useCallback(() => {
    if (!lastSavedAt) return null;

    const now = Date.now();
    const secondsAgo = Math.floor((now - lastSavedAt) / 1000);

    if (secondsAgo < 60) return "Saved just now";
    if (secondsAgo < 3600) return `Saved ${Math.floor(secondsAgo / 60)}m ago`;
    return `Saved at ${new Date(lastSavedAt).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [lastSavedAt]);

  // Manual save function
  const saveNow = useCallback(async () => {
    await saveComment(comment);
  }, [comment, saveComment]);

  return {
    comment,
    setComment,
    isSaving,
    lastSavedText: getLastSavedText(),
    saveNow,
  };
}
