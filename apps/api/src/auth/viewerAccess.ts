/**
 * S15-01/S15-02: what a viewer (a person with the 'viewer' role in the current account) may call. DENY BY DEFAULT: a route is closed to
 * viewers unless it is listed here, so a route added later is never readable by a viewer by accident. Nothing else is allowed:
 * not a POST, PATCH, PUT or DELETE (even a harmless-looking one), not a read of settings, parents, invites, view links or other viewers.
 *
 * The lists hold route PATTERNS exactly as registered (`/api/log-entries/:id`, never a concrete id). `test/s15-02-viewer-routes.test.ts`
 * walks every registered route as a viewer and fails if a listed route does not exist or is not a GET.
 */

/** Reads a viewer may make: the data Schedule and Records draw, and nothing else. */
export const VIEWER_READ_ROUTES: readonly string[] = [
  "/api/me",               // the account's name and calendar basics, a viewer's version (no setup state)
  "/api/family",           // calendar settings and zoom views, a viewer's version (no setup state or reminders)
  "/api/children",
  "/api/subjects",
  "/api/assignments",
  "/api/events",
  "/api/blocked-ranges",   // days off and breaks
  "/api/week-overrides",
  "/api/check-ins",        // a week's ticks, for a finished week's bars
  "/api/plan",
  "/api/log-entries",
  "/api/log-entries/run-days",
  "/api/records/totals",
];

/**
 * The only two non-GET calls open to a viewer. Both act on the viewer's OWN membership and change no family data: switch which of
 * their accounts this session looks at (membership re-checked), and leave the account they are viewing.
 */
export const VIEWER_ACCOUNT_ROUTES: readonly string[] = ["POST /api/auth/switch", "POST /api/auth/leave"];

const READS = new Set(VIEWER_READ_ROUTES);
const ACCOUNT = new Set(VIEWER_ACCOUNT_ROUTES);

/** `url` is the route pattern (`req.routeOptions.url`), `method` the HTTP method. */
export function viewerMayCall(method: string, url: string): boolean {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD") return READS.has(url);
  return ACCOUNT.has(`${m} ${url}`);
}
