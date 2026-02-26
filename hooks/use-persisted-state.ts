import { useState, useEffect, Dispatch, SetStateAction } from "react";

/**
 * usePersistedState
 *
 * A custom hook that persists state to localStorage.
 * Works like useState but survives page refreshes.
 *
 * @param key - Unique localStorage key for this state
 * @param defaultValue - Default value if nothing is stored
 * @returns Tuple of [state, setState] like useState
 *
 * Usage:
 * ```tsx
 * const [forms, setForms] = usePersistedState<string[]>('my-forms', []);
 * ```
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // Initialize state from localStorage or use default
  const [state, setState] = useState<T>(() => {
    // Server-side rendering guard
    if (typeof window === "undefined") return defaultValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error loading ${key} from localStorage:`, error);
      return defaultValue;
    }
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, state]);

  return [state, setState];
}
