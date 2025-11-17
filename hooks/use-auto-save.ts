/**
 * AUTO-SAVE HOOK
 *
 * Automatically saves form state to localStorage at regular intervals.
 * Prevents data loss if user closes browser or loses connection.
 *
 * Usage:
 * const { clearDraft, hasDraft } = useAutoSave(form, "incident-form", 30000);
 */

import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";

export interface AutoSaveOptions {
  /**
   * Interval in milliseconds between auto-saves
   * @default 30000 (30 seconds)
   */
  interval?: number;

  /**
   * Callback when draft is saved
   */
  onSave?: (data: any) => void;

  /**
   * Callback when draft is loaded
   */
  onLoad?: (data: any) => void;

  /**
   * Whether to show toast notifications
   * @default false
   */
  showNotifications?: boolean;
}

/**
 * useAutoSave Hook
 *
 * @param form - React Hook Form instance
 * @param key - Unique key for localStorage (e.g., "incident-draft-{residentId}")
 * @param options - Configuration options
 */
export function useAutoSave<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  key: string,
  options: AutoSaveOptions = {}
) {
  const {
    interval = 30000, // 30 seconds default
    onSave,
    onLoad,
    showNotifications = false,
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout>();
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  /**
   * Load draft from localStorage on mount
   */
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(key);

      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);

        // Check if draft is recent (< 7 days old)
        const savedAt = parsed._savedAt ? new Date(parsed._savedAt) : null;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        if (savedAt && savedAt > sevenDaysAgo) {
          // Remove metadata before loading into form
          const { _savedAt, ...formData } = parsed;

          // Load into form
          Object.keys(formData).forEach((fieldKey) => {
            form.setValue(fieldKey as any, formData[fieldKey]);
          });

          setHasDraft(true);
          setLastSaved(savedAt);

          if (onLoad) {
            onLoad(formData);
          }

          if (showNotifications) {
            console.log("Draft loaded from", savedAt.toLocaleString());
          }
        } else {
          // Draft too old, remove it
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
      // Clear corrupted data
      localStorage.removeItem(key);
    }
  }, [key, form, onLoad, showNotifications]);

  /**
   * Auto-save form data on change
   */
  useEffect(() => {
    const subscription = form.watch((value) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout to save
      timeoutRef.current = setTimeout(() => {
        try {
          const dataToSave = {
            ...value,
            _savedAt: new Date().toISOString(),
          };

          localStorage.setItem(key, JSON.stringify(dataToSave));
          setHasDraft(true);
          setLastSaved(new Date());

          if (onSave) {
            onSave(value);
          }

          if (showNotifications) {
            console.log("Draft auto-saved at", new Date().toLocaleTimeString());
          }
        } catch (error) {
          console.error("Failed to save draft:", error);

          // Handle quota exceeded error
          if (error instanceof DOMException && error.name === "QuotaExceededError") {
            console.warn("localStorage quota exceeded. Draft not saved.");
          }
        }
      }, interval);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [form, key, interval, onSave, showNotifications]);

  /**
   * Clear draft from localStorage
   */
  const clearDraft = () => {
    try {
      localStorage.removeItem(key);
      setHasDraft(false);
      setLastSaved(null);

      if (showNotifications) {
        console.log("Draft cleared");
      }
    } catch (error) {
      console.error("Failed to clear draft:", error);
    }
  };

  /**
   * Manually save draft immediately
   */
  const saveDraft = () => {
    try {
      const value = form.getValues();
      const dataToSave = {
        ...value,
        _savedAt: new Date().toISOString(),
      };

      localStorage.setItem(key, JSON.stringify(dataToSave));
      setHasDraft(true);
      setLastSaved(new Date());

      if (onSave) {
        onSave(value);
      }

      return true;
    } catch (error) {
      console.error("Failed to save draft:", error);
      return false;
    }
  };

  return {
    hasDraft,
    lastSaved,
    clearDraft,
    saveDraft,
  };
}

/**
 * Format last saved time for display
 */
export function formatLastSaved(date: Date | null): string {
  if (!date) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  return date.toLocaleString();
}
