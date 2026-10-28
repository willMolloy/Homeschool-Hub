// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pub = resolve(__dirname, "../public");
const pngSize = (file: string) => {
  const b = readFileSync(resolve(pub, "." + file));
  expect(b.subarray(1, 4).toString()).toBe("PNG");
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
};

describe("PWA manifest", () => {
  const manifest = JSON.parse(readFileSync(resolve(pub, "manifest.webmanifest"), "utf8")) as {
    icons: { src: string; sizes: string; type: string; purpose?: string }[];
  };

  it("every PNG icon exists with the size it claims", () => {
    const pngs = manifest.icons.filter((i) => i.type === "image/png");
    expect(pngs.length).toBeGreaterThanOrEqual(3);
    for (const i of pngs) expect(pngSize(i.src)).toBe(i.sizes);
  });

  it("has 192 and 512 'any' icons and a 512 maskable one", () => {
    const has = (sizes: string, purpose: string) => manifest.icons.some((i) => i.type === "image/png" && i.sizes === sizes && i.purpose === purpose);
    expect(has("192x192", "any")).toBe(true);
    expect(has("512x512", "any")).toBe(true);
    expect(has("512x512", "maskable")).toBe(true);
  });

  it("index.html links a 180×180 apple-touch-icon", () => {
    const html = readFileSync(resolve(__dirname, "../index.html"), "utf8");
    const href = /<link rel="apple-touch-icon" href="([^"]+)"/.exec(html)?.[1];
    expect(href).toBe("/icons/apple-touch-icon.png");
    expect(pngSize(href!)).toBe("180x180");
  });
});
