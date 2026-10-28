import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ApiError, apiGet } from "./client";

export interface ApiState<T> {
  data: T | undefined;
  error: ApiError | undefined;
  loading: boolean;
  /** Fetch again (Retry). */
  reload: () => void;
  /** Patch the cached data after a successful write, without refetching. */
  setData: Dispatch<SetStateAction<T | undefined>>;
}

/** GET `path` on mount and whenever `path` changes. Stale responses (path changed meanwhile) are dropped. */
export function useApi<T>(path: string): ApiState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const ticket = ++latest.current;
    setLoading(true);
    setError(undefined);
    apiGet<T>(path).then(
      (d) => {
        if (ticket !== latest.current) return;
        setData(d);
        setLoading(false);
      },
      (e: unknown) => {
        if (ticket !== latest.current) return;
        setError(e instanceof ApiError ? e : new ApiError(0, "unknown", String(e)));
        setLoading(false);
      },
    );
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading, reload, setData };
}
