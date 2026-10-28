# S1-03 — Add a lint command

**Depends on:** S1-02  
**Size:** XS

## Goal
`npm run lint` runs ESLint with TypeScript rules across all workspaces and runs in CI.

## Context
Vibe-coded code benefits from a strict linter that catches unused vars, floating promises, and React hook mistakes early. Keep the config small. TypeScript `strict` is already on in `tsconfig.base.json`.

## Steps
1. From the repo root (no `-w` flag; `-w .` is not valid): `npm i -D eslint@9 @eslint/js@9 typescript-eslint eslint-plugin-react-hooks@5 globals`. Pin ESLint 9: ESLint 10 is newer than the react-hooks plugin's tested range.
2. Add `"type": "module"` to the root package.json, then create a root `eslint.config.js` (flat config): `@eslint/js` recommended + `typescript-eslint` recommended; `react-hooks` recommended for `apps/web/**`; ignore `**/dist`, `packages/engine/test/fixtures/**` (frozen prototype copy).
3. Add a root script: `"lint": "eslint ."`.
4. Fix or explicitly disable (with a comment saying why) anything it reports.
5. Add `npm run lint` as a step in `.github/workflows/ci.yml` before tests.

## Done when
- [x] `npm run lint` exits 0.
- [x] CI runs lint.

## Tests
- None. Lint is the test.

## Out of scope
- Prettier or formatting rules (optional later).
