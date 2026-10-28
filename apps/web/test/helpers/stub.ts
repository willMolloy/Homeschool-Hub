/**
 * A tiny call-recording stub for mocked API functions.
 *
 * Why not vi.fn()? In vitest 2 + jsdom, a vi.fn whose result is a rejected promise,
 * called from inside a React event handler, fails the test even when the
 * component catches the rejection. A plain function doesn't have that problem.
 */
type Impl = (...args: unknown[]) => Promise<unknown>;

export interface Stub {
  (...args: unknown[]): Promise<unknown>;
  calls: unknown[][];
  resolves(value: unknown): Stub;
  rejects(error: unknown): Stub;
  pending(): { resolve: (v: unknown) => void; reject: (e: unknown) => void };
  impl(fn: Impl): Stub;
  reset(): void;
}

export function stub(): Stub {
  let impl: Impl = async () => undefined;
  const fn = ((...args: unknown[]) => {
    fn.calls.push(args);
    return impl(...args);
  }) as Stub;
  fn.calls = [];
  fn.resolves = (v) => ((impl = async () => v), fn);
  fn.rejects = (e) => ((impl = () => Promise.reject(e)), fn);
  fn.impl = (f) => ((impl = f), fn);
  fn.pending = () => {
    let resolve!: (v: unknown) => void;
    let reject!: (e: unknown) => void;
    const p = new Promise((res, rej) => ((resolve = res), (reject = rej)));
    impl = () => p;
    return { resolve, reject };
  };
  fn.reset = () => {
    fn.calls = [];
    impl = async () => undefined;
  };
  return fn;
}
