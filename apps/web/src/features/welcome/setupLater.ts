/**
 * S11-01: "Finish later" on a setup step takes the parent Home for the rest of this sign-in. The flow comes back at the next
 * sign-in until it is done (the family's `setupDone` stays false). Held in memory, and in this tab's sessionStorage so a reload
 * keeps it; sign-in and sign-out clear it.
 */
const KEY = "hh.setup.later";
let later = false;

export function setupLaterThisSession(): boolean {
  if (later) return true;
  try { return window.sessionStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function setSetupLater(): void {
  later = true;
  try { window.sessionStorage.setItem(KEY, "1"); } catch { /* kept in memory only */ }
}

export function clearSetupLater(): void {
  later = false;
  try { window.sessionStorage.removeItem(KEY); } catch { /* nothing stored */ }
}
