import { render } from "@testing-library/react";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "../src/auth/AuthProvider";
import { TrackPage } from "../src/routes/TrackPage";
import { routes } from "../src/router";

/** Render the real route table at `path`. Returns the router too, to inspect navigation. */
export function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { router, ...render(<RouterProvider router={router} />) };
}

/** S9-01: the old Track work page, which no longer has a route; it is rendered on its own until S9-02 moves it into Schedule · Week. */
export function renderTrack() {
  return render(<MemoryRouter><AuthProvider><TrackPage /></AuthProvider></MemoryRouter>);
}
