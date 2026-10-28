/**
 * Bump on ANY change that can alter a computed number. The web app compares this with
 * the API's value so a stale PWA service worker never computes with old rules.
 * MAJOR: semantics change; MINOR: new outputs; PATCH: bug fix that changes numbers.
 */
export const ENGINE_VERSION = "0.1.0";
