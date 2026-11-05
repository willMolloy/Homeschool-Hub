/** The one password rule (S1-10, S14-02): 8 to 1000 characters. Returns a plain message, or null when the password is fine. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 1000;
export function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (pw.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  return null;
}
