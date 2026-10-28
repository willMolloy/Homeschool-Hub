# S1-16 — Add client-side routing

**Depends on:** S1-01  
**Size:** XS

## Goal
The web app has routes `/login`, `/` (Plan), `/kids`, `/subjects`, and a 404 page using React Router.

## Context
`apps/web/src/App.tsx` is a placeholder. Screens arrive in later tickets. This ticket only creates empty route components so they can be built in parallel.

## Steps
1. `npm i -w @hh/web react-router-dom`.
2. Create `src/routes/` with `LoginPage.tsx`, `PlanPage.tsx`, `KidsPage.tsx`, `SubjectsPage.tsx`, `NotFoundPage.tsx`, each rendering an `<h1>` with its name.
3. Set up `createBrowserRouter` in `src/router.tsx`. `main.tsx` renders `<RouterProvider>`.
4. Vite dev server already falls back to index.html for unknown paths. Confirm deep links like `/kids` load on refresh.

## Done when
- [ ] Each URL shows its placeholder heading. An unknown URL shows the 404 page.

## Tests
- Add vitest + @testing-library/react + jsdom to the web workspace (`test` script). Test: rendering the router at `/kids` shows 'Kids'.

## Out of scope
- Auth redirects (S1-20).
- Real screen content.
