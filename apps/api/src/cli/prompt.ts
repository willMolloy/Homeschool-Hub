/** Shared by the login CLIs: read a password without echo from a terminal, or the first stdin line when piped. Never printed. */
import readline from "node:readline";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void };
    process.stdout.write(prompt);
    out._writeToOutput = () => {}; // swallow echo
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

function readLine(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin });
    let done = false;
    rl.once("line", (l) => { done = true; rl.close(); resolve(l); });
    rl.once("close", () => { if (!done) resolve(""); });
  });
}

/** The new password, or null (after saying why on stderr) when the two typed ones differ. */
export async function readNewPassword(): Promise<string | null> {
  if (!process.stdin.isTTY) return readLine();
  const password = await readHidden("Password: ");
  const again = await readHidden("Again: ");
  if (password !== again) { console.error("Passwords do not match."); return null; }
  return password;
}
