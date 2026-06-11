import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * Detects the `?n=<notification_id>` query parameter set by the Service Worker
 * on notification click, records an "open" event in `push_events`, then strips
 * the param from the URL (without adding a history entry).
 *
 * Also logs any client-side routing error so we can spot pushes that point to
 * a non-existent listing (e.g. `/annonce/{id}` where id no longer exists).
 */
const PushOpenTracker = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(location.search);
    const nid = params.get("n");
    if (!nid) return;

    // Fire-and-forget open event.
    void fetch(`${SUPABASE_URL}/rest/v1/push_events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        notification_id: nid,
        event_type: "open",
        url: location.pathname,
        user_agent: navigator.userAgent.slice(0, 300),
      }),
    }).catch((err) => console.debug("[push-open] failed to record", err));

    // Strip ?n= but keep other params.
    params.delete("n");
    const clean = location.pathname + (params.toString() ? `?${params.toString()}` : "") + location.hash;
    navigate(clean, { replace: true });
  }, [location.search, location.pathname, location.hash, navigate]);

  return null;
};

export default PushOpenTracker;
