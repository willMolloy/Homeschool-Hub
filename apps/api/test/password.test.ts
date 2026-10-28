import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/auth/password";

describe("password hashing", () => {
  it("hash then verify the same password → true", async () => {
    const h = await hashPassword("correct horse battery staple");
    expect(h).toMatch(/^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(await verifyPassword("correct horse battery staple", h)).toBe(true);
  });

  it("wrong password → false", async () => {
    const h = await hashPassword("right-password");
    expect(await verifyPassword("wrong-password", h)).toBe(false);
    expect(await verifyPassword("", h)).toBe(false);
  });

  it("two hashes of the same password differ (salt)", async () => {
    const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
    expect(a).not.toBe(b);
    expect(await verifyPassword("same", a)).toBe(true);
    expect(await verifyPassword("same", b)).toBe(true);
  });

  it("malformed stored string → false (never throws)", async () => {
    for (const bad of ["", "nope", "scrypt$1$2$3", "bcrypt$16384$8$1$c2FsdA==$aGFzaA==", "scrypt$x$8$1$c2FsdA==$aGFzaA==",
      "scrypt$16384$8$1$$aGFzaA==", "scrypt$16384$8$1$c2FsdA==$", "scrypt$99999999$8$1$c2FsdA==$aGFzaA=="]) {
      expect(await verifyPassword("pw", bad)).toBe(false);
    }
  });

  it("verification takes > 10 ms (scrypt actually runs)", async () => {
    const h = await hashPassword("timing");
    const t0 = performance.now();
    await verifyPassword("timing", h);
    expect(performance.now() - t0).toBeGreaterThan(10);
  });
});
