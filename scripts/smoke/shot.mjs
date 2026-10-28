// usage: node shot.mjs <url> <out.png> <width> [height]
import puppeteer from "puppeteer-core";
import { launchOptions } from "./common.mjs";

const [url, out, w, h] = process.argv.slice(2);
const b = await puppeteer.launch(launchOptions);
const p = await b.newPage();
await p.setViewport({ width: +w, height: +(h ?? 800), deviceScaleFactor: 1 });
await p.goto(url, { waitUntil: "networkidle0" });
await p.screenshot({ path: out, fullPage: false });
await b.close();
