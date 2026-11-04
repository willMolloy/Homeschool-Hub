/** S13-05: Save image: the share sheet on a phone (a touch screen that takes files), a download on a desktop; nothing is uploaded. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { canShareFiles, saveImages } from "../src/features/review/exportCard";

const file = (n: string) => new File(["x"], n, { type: "image/png" });
function device(opts: { share?: boolean; touch: boolean; canShare?: boolean }) {
  Object.defineProperty(navigator, "share", { configurable: true, value: opts.share === false ? undefined : vi.fn().mockResolvedValue(undefined) });
  Object.defineProperty(navigator, "canShare", { configurable: true, value: opts.share === false ? undefined : () => opts.canShare ?? true });
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("coarse") ? opts.touch : false, media: q, addEventListener() {}, removeEventListener() {} }));
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("saving the card image (S13-05)", () => {
  it("on a phone the share sheet gets every file, so it can go to Photos or a message", async () => {
    device({ touch: true });
    const files = [file("a.png"), file("b.png")];
    expect(canShareFiles(files)).toBe(true);
    expect(await saveImages(files)).toBe("shared");
    expect((navigator.share as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toEqual({ files });
  });
  it("closing the share sheet is not an error and does not download", async () => {
    device({ touch: true });
    (navigator.share as ReturnType<typeof vi.fn>).mockRejectedValue(Object.assign(new Error("x"), { name: "AbortError" }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    expect(await saveImages([file("a.png")])).toBe("cancelled");
    expect(click).not.toHaveBeenCalled();
  });
  it("on a desktop it downloads each file", async () => {
    device({ touch: false });
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { downloads.push(this.download); });
    expect(await saveImages([file("a.png"), file("b.png")])).toBe("saved");
    expect(downloads).toEqual(["a.png", "b.png"]);
    expect(navigator.share).not.toHaveBeenCalled();
  });
  it("a browser that can't share files downloads, even on a phone", async () => {
    device({ touch: true, canShare: false });
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    expect(await saveImages([file("a.png")])).toBe("saved");
    expect(click).toHaveBeenCalledTimes(1);
  });
});
