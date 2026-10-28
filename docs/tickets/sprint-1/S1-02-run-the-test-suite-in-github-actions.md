# S1-02 — Run the test suite in GitHub Actions

**Depends on:** S1-01  
**Size:** XS

## Goal
Every push and pull request runs typecheck plus all tests in CI.

## Context
There's no CI yet. The engine is the heart of the product, so a red build must block merges. The engine also has a time-zone test script (`npm run test:tz`) that has to run in CI, because date bugs are the most likely regressions.

## Steps
1. Create `.github/workflows/ci.yml`.
2. Trigger on `push` to `main` and on `pull_request`.
3. Single job on `ubuntu-latest`: checkout → `actions/setup-node@v4` with `node-version-file: .nvmrc` and `cache: npm` → `npm ci` → `npm run typecheck` → `npm test` → `npm run test:tz`.
4. Commit `package-lock.json` if it isn't committed yet (`npm ci` needs it).
5. Push a branch, open a PR, and confirm the check shows up green.
6. In GitHub repo settings, turn on branch protection for `main`: require the CI check.

## Done when
- [ ] A PR shows a passing `CI` check.
- [ ] Deliberately breaking one engine test makes the check fail (try it, then revert).

## Tests
- Covered by the workflow itself. Do the red/green check above once by hand.

## Out of scope
- Deploys.
- Lint (S1-03 adds it to CI).
