/**
 * S13-05: Save image. The card's SVG, with the app's two fonts embedded, is drawn onto a canvas on this device and saved as a
 * 1080 x 1350 PNG (opaque, square corners). Nothing is uploaded and there is no link. On a phone the device's share sheet gets the
 * file (so it can go to Photos or a message); elsewhere it is downloaded.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import frauncesUrl from "@fontsource-variable/fraunces/files/fraunces-latin-soft-normal.woff2?url";
import nunitoUrl from "@fontsource-variable/nunito-sans/files/nunito-sans-latin-wght-normal.woff2?url";
import type { CardLayout } from "./cardLayout";
import { TermCardSvg } from "./TermCardSvg";

let fontCss: Promise<string> | null = null;

async function dataUrl(url: string): Promise<string> {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:font/woff2;base64,${btoa(bin)}`;
}

/** The @font-face rules for the SVG: the same font files the app serves, read from this origin once. */
export function embeddedFonts(): Promise<string> {
  fontCss ??= Promise.all([dataUrl(frauncesUrl), dataUrl(nunitoUrl)]).then(([f, n]) =>
    `@font-face{font-family:"HH Fraunces";font-weight:100 900;src:url(${f}) format("woff2")}@font-face{font-family:"HH Nunito";font-weight:200 1000;src:url(${n}) format("woff2")}`);
  fontCss.catch(() => { fontCss = null; });
  return fontCss;
}

/** The card as a standalone SVG document string (fonts embedded when given). */
export function cardSvgMarkup(layout: CardLayout, label: string, css = ""): string {
  const svg = renderToStaticMarkup(createElement(TermCardSvg, { layout, label }));
  return css ? svg.replace(/^(<svg[^>]*>)/, `$1<defs><style>${css}</style></defs>`) : svg;
}

/** Draws a card onto a canvas and returns the PNG. */
export async function cardToPng(layout: CardLayout, label: string): Promise<Blob> {
  const css = await embeddedFonts();
  const url = URL.createObjectURL(new Blob([cardSvgMarkup(layout, label, css)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.width = layout.width;
    img.height = layout.height;
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = layout.width;
    canvas.height = layout.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, layout.width, layout.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** "Frank-Fall-2026-term-in-review.png" */
export const fileNameFor = (title: string, isYear: boolean): string =>
  `${title.replace(/[·]/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "")}-${isYear ? "year" : "term"}-in-review.png`;

/** True on a phone or tablet whose share sheet takes files. */
export function canShareFiles(files: File[]): boolean {
  try {
    return typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files }) && window.matchMedia("(pointer: coarse)").matches;
  } catch { return false; }
}

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Share the files on a phone, else download each. Resolves "shared", "saved" or "cancelled" (the parent closed the share sheet). */
export async function saveImages(files: File[]): Promise<"shared" | "saved" | "cancelled"> {
  if (canShareFiles(files)) {
    try { await navigator.share({ files }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; /* fall through to a download */ }
  }
  for (const f of files) { download(f); await new Promise((r) => setTimeout(r, 250)); }
  return "saved";
}
