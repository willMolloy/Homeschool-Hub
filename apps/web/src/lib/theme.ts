// S8-02: Light, Dark or System, remembered on this device. System (the default) sets no attribute, so the tokens
// follow the device's `prefers-color-scheme`; Light and Dark set `data-theme` on <html>. The same read runs
// in index.html before first paint so there is no flash (keep THEME_KEY in step with it).
export type ThemeChoice = "light" | "dark" | "system";
export const THEME_CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"];
export const THEME_KEY = "hh.theme";
export const DEFAULT_THEME: ThemeChoice = "system";

const isChoice = (v: unknown): v is ThemeChoice => v === "light" || v === "dark" || v === "system";

/** The saved choice; System when nothing is saved or storage is blocked. */
export function readTheme(storage?: Pick<Storage, "getItem">): ThemeChoice {
  try {
    const v = (storage ?? window.localStorage).getItem(THEME_KEY);
    return isChoice(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Put a choice on the page: `data-theme` for Light and Dark, none for System. */
export function applyTheme(choice: ThemeChoice, root: HTMLElement = document.documentElement): void {
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
}

/** Apply and remember a choice. A blocked store only means it is forgotten on reload. */
export function setTheme(choice: ThemeChoice): void {
  applyTheme(choice);
  try {
    if (choice === "system") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* ignore: the choice still applies for this visit */
  }
}

/** The theme the page is drawn in now (System resolved through the device setting). */
export function effectiveTheme(choice: ThemeChoice, prefersDark: boolean): "light" | "dark" {
  return choice === "system" ? (prefersDark ? "dark" : "light") : choice;
}
