/**
 * Engine version in the footer, plus a banner when the API runs a different engine (S1-37).
 * A mismatch usually means a stale cached web bundle; reloading fetches the new one.
 */
import { useEffect, useState } from "react";
import { ENGINE_VERSION } from "@hh/engine";
import { apiGet } from "../api/client";
import type { Health } from "../api/types";

/** The API's engine version, asked once. Undefined until it answers (or if /api/health fails). */
export function useApiEngineVersion(): string | undefined {
  const [version, setVersion] = useState<string | undefined>(undefined);
  useEffect(() => {
    let live = true;
    apiGet<Health>("/api/health")
      .then((h) => { if (live && typeof h.engineVersion === "string") setVersion(h.engineVersion); })
      .catch(() => {}); // the health check is best-effort; no banner when it can't be reached
    return () => { live = false; };
  }, []);
  return version;
}

export function EngineFooter() {
  return <span>Engine {ENGINE_VERSION}</span>;
}

export function EngineMismatchBanner({ apiVersion, reload = () => window.location.reload() }: {
  apiVersion: string | undefined;
  reload?: () => void;
}) {
  if (!apiVersion || apiVersion === ENGINE_VERSION) return null;
  return (
    <div className="shell-banner" role="status">
      <span>App update available — reload.</span>
      <button type="button" onClick={reload}>Reload</button>
      <span className="shell-banner-detail">This app has engine {ENGINE_VERSION}; the server has {apiVersion}.</span>
    </div>
  );
}
