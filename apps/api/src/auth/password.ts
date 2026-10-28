import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(pw: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(pw, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Returns `scrypt$16384$8$1$<saltB64>$<hashB64>`. */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/** Constant-time check of `pw` against a stored hash. Never throws; malformed input → false. */
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const [n, r, p] = parts.slice(1, 4).map((x) => Number(x));
    if (![n, r, p].every((x) => Number.isInteger(x) && x! > 0)) return false;
    // Refuse absurd parameters from a tampered row rather than burning CPU/memory.
    if (n! > 2 ** 20 || r! > 32 || p! > 16) return false;
    const salt = Buffer.from(parts[4]!, "base64");
    const expected = Buffer.from(parts[5]!, "base64");
    if (salt.length === 0 || expected.length === 0) return false;
    const actual = await scrypt(pw, salt, expected.length, { N: n!, r: r!, p: p!, maxmem: 256 * n! * r! + 1024 * 1024 });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
