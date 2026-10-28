import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { fakeApi } from "./helpers/fake-api";

beforeEach(() => {
  fakeApi.reset();
  vi.stubGlobal("fetch", fakeApi.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// React Router's data router builds `new Request(url, { signal })` with jsdom's AbortSignal,
// which Node's (undici) Request rejects. Drop the signal in tests only.
const NodeRequest = globalThis.Request;
globalThis.Request = class extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (init?.signal) {
      const { signal: _signal, ...rest } = init;
      super(input, rest);
    } else {
      super(input, init);
    }
  }
} as typeof Request;
