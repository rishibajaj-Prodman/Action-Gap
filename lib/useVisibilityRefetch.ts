import { useEffect } from "react";

/**
 * Calls the provided callback whenever the tab becomes visible
 * (e.g., user switches back to this tab after being away).
 * Useful for refreshing data after potential network disconnects.
 */
export function useVisibilityRefetch(callback: () => void) {
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        callback();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [callback]);
}
