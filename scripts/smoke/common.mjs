// Shared settings for the smoke scripts. Override with CHROME_PATH, BASE_URL, PREVIEW_URL, SCREENS_DIR.
import { fileURLToPath } from "node:url";

export const CHROME_PATH = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
export const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
export const PREVIEW_URL = process.env.PREVIEW_URL ?? "http://localhost:4173";
/** Screens go to docs/progress/screens in this repo. */
export const SCREENS_DIR = process.env.SCREENS_DIR ?? fileURLToPath(new URL("../../docs/progress/screens", import.meta.url));
export const launchOptions = { executablePath: CHROME_PATH, headless: "new", args: ["--no-sandbox"] };
