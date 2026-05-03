import { useCallback, useEffect, useState } from "react";

interface State<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Generic GET-with-refetch hook tailored to dashboard sections.
 * Surfaces loading / error / data states and exposes a stable
 * `refetch` so the inline retry button can re-run only this fetch.
 *
 * `key` invalidates the in-flight request when it changes.
 */
export function useDashboardFetch<T>(
  url: string | null,
  parse: (raw: unknown) => T,
  initial: T,
  key: ReadonlyArray<unknown> = [],
): State<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState<boolean>(!!url);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    if (!url) {
      setData(initial);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url, { credentials: "include" })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(raw => {
        if (cancelled) return;
        try {
          setData(parse(raw));
          setError(null);
        } catch {
          setError("تعذّر قراءة البيانات. حاول مجدداً.");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError("تعذّر الاتصال بالخادم. حاول مجدداً.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick, ...key]);

  return { data, loading, error, refetch };
}
