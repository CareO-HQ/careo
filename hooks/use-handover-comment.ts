import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/use-debounce";

type UseHandoverCommentProps = {
  teamId: string;
  residentId: Id<"residents">;
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
  const initialLoadComplete = useRef(false);

  // Fetch existing comment from database
  const existingComment = useQuery(api.handoverComments.getComment, {
    teamId,
    residentId,
    date,
    shift,
  });

  // Mutation to save comment
  const saveComment = useMutation(api.handoverComments.saveComment);

  // Debounced comment value (auto-save after 2 seconds of no typing)
  const debouncedComment = useDebounce(comment, 2000);

  // Load existing comment on mount
  useEffect(() => {
    if (existingComment && !initialLoadComplete.current) {
      setComment(existingComment.comment);
      setLastSavedAt(existingComment.updatedAt);
      initialLoadComplete.current = true;
    }
  }, [existingComment]);

  // Auto-save when debounced value changes
  useEffect(() => {
    if (!initialLoadComplete.current) return; // Don't save on initial load
    if (debouncedComment === existingComment?.comment) return; // Don't save if unchanged

    const saveToDatabase = async () => {
      if (debouncedComment.trim() === "" && !existingComment) {
        // Don't create empty comments
        return;
      }

      setIsSaving(true);
      try {
        await saveComment({
          teamId,
          residentId,
          date,
          shift,
          comment: debouncedComment,
          createdBy: currentUserId,
          createdByName: currentUserName,
        });
        setLastSavedAt(Date.now());
      } catch (error) {
        console.error("Failed to save comment:", error);
      } finally {
        setIsSaving(false);
      }
    };

    saveToDatabase();
  }, [debouncedComment, teamId, residentId, date, shift, currentUserId, currentUserName, saveComment, existingComment]);

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

  // Manual save function (for immediate save without debounce)
  const saveNow = useCallback(async () => {
    if (comment === existingComment?.comment) return;

    setIsSaving(true);
    try {
      await saveComment({
        teamId,
        residentId,
        date,
        shift,
        comment,
        createdBy: currentUserId,
        createdByName: currentUserName,
      });
      setLastSavedAt(Date.now());
    } catch (error) {
      console.error("Failed to save comment:", error);
    } finally {
      setIsSaving(false);
    }
  }, [comment, teamId, residentId, date, shift, currentUserId, currentUserName, saveComment, existingComment]);

  return {
    comment,
    setComment,
    isSaving,
    lastSavedText: getLastSavedText(),
    saveNow,
  };
}
