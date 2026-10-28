# S1-17 — Add the app shell layout

**Depends on:** S1-16  
**Size:** S

## Goal
Signed-in pages share a header with the family name, a nav (Plan, Kids, Subjects) and a footer, and the layout works at phone width.

## Context
Pilot users include many phone users. The shell must work at 360 px wide from day one. Don't design the timeline here. The Plan page stays a placeholder until pilot results.

## Steps
1. Create `src/layout/AppShell.tsx` with `<header>` (app name + family name slot), `<nav>` with NavLinks, `<main><Outlet/></main>`, `<footer>` slot.
2. Make it a parent route for Plan/Kids/Subjects in `router.tsx`. Login stays outside the shell.
3. Plain CSS file `src/layout/app-shell.css`. Mobile first: nav as a bottom bar under 640 px, top links above. Respect `env(safe-area-inset-bottom)`.
4. Use semantic HTML and visible focus styles. Nav links have `aria-current` (NavLink does this).

## Done when
- [x] Looks right at 360 px and 1280 px wide (check in browser dev tools).
- [x] Keyboard tabbing reaches every nav link.

## Tests
- Render test: shell shows the three nav links; the active one has aria-current=page

## Out of scope
- Visual design system.
- Dark mode.
